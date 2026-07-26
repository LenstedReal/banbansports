"""TV yayın programı scraper — sporekrani.com'dan günlük futbol maçlarını çekip
öne çıkan yayının HANGİ kanal kutusuna (bein1/trt1/...) ait olduğunu OTOMATİK bulur.

Neden gerekli? LiveScore/FotMob API'leri TV yayın kanalı bilgisini VERMEZ. Bu yüzden
sporekrani.com günlük programı hafif regex ile parse edilir (bs4 gibi ek bağımlılık YOK,
motoru zorlamaz). Sonuç 15 dk cache'lenir → tekrar tekrar scrape yapılmaz.

Kullanıcı öncelik kuralları:
  * Aynı anda birden fazla maç canlıysa: ÖNCELİK Galatasaray > beIN Sports 1 > diğerleri.
  * Galatasaray ile beIN Sports 1 çakışırsa → Galatasaray kazanır.
  * Maç saatinden 10 dk ÖNCE "canlı" pencereye girer (başlamak üzere).
  * Şu an canlı maç yoksa: gelecek 12 saat içindeki EN YAKIN maç "yakında" gösterilir.
  * Hiçbir maç yoksa → gizli (channel="").
"""
import re
import logging
import asyncio
from time import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from curl_cffi import requests as cffi_requests

logger = logging.getLogger("banbansports.tv_schedule")

_TZ = ZoneInfo("Europe/Istanbul")
_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

# Maç aktiflik pencereleri (dakika / saat)
PRE_START_MIN = 10        # kick-off'tan 10 dk önce "canlı" say
MATCH_DURATION_MIN = 150  # ~2.5 saat (devre arası + uzatma dahil) sonra "bitti"
UPCOMING_WINDOW_HOURS = 12

# Uygulamadaki 8 kanal kutusunun görünen adları
APP_CHANNEL_NAMES = {
    "tivibuspor": "TİVİBU SPOR", "trt1": "TRT 1", "trtspor": "TRT SPOR",
    "trthaber": "TRT HABER", "tv8": "TV 8", "bein1": "beIN SPORTS 1",
    "ssport": "S SPORT", "atv": "ATV",
}

# ==== Program cache (hafif; tek dict) ====
_SCHED_CACHE = {"date": "", "at": 0.0, "matches": []}
_SCHED_TTL = 900.0  # 15 dk


def _norm(s: str) -> str:
    s = (s or "").strip().lower()
    tr = str.maketrans("ıİşğüöç", "iisguoc")
    s = s.translate(tr)
    s = s.replace("ı", "i")
    s = re.sub(r"\s+", " ", s)
    return s


def map_channel_name(raw: str):
    """sporekrani kanal adı → uygulama kanal id'si (yoksa None).
    Alt-kanallar (beIN 4, TV 8 Buçuk, S Sport 2, TRT Spor Yıldız) BİLEREK dışlanır —
    uygulamada karşılığı yok, yanlış kutuyu yakmasın."""
    n = _norm(raw)
    if not n:
        return None
    # beIN Sports 1 (max/haber/4 vб. DEĞİL)
    if n.startswith("bein sport") and n.endswith(" 1") and "max" not in n:
        return "bein1"
    if n == "trt 1":
        return "trt1"
    if n == "trt spor":  # "trt spor yildiz" hariç
        return "trtspor"
    if n == "trt haber":
        return "trthaber"
    if n == "tv 8":  # "tv 8 bucuk" hariç
        return "tv8"
    if n in ("s sport", "s sport plus"):  # "s sport 2" hariç
        return "ssport"
    if n == "tivibu spor":
        return "tivibuspor"
    if n == "atv":
        return "atv"
    return None


def _fetch_html(date_str: str) -> str:
    def _do():
        url = f"https://www.sporekrani.com/home/day/{date_str}"
        r = cffi_requests.get(url, headers={"User-Agent": _UA},
                              impersonate="chrome120", timeout=20)
        return r.text if r.status_code == 200 else ""
    return _do()


_ANCHOR_RE = re.compile(r'<a[^>]+href="(/home/match/[^"]+hangi-kanalda)"[^>]*>(.*?)</a>', re.S)
_SPORT_RE = re.compile(r'src="[^"]*/sports/[^"]*"\s+alt="([^"]*)"')
_TIME_RE = re.compile(r'event-list__time[^>]*>\s*([0-9]{1,2}:[0-9]{2})')
_NAME_RE = re.compile(r'event-list__name[^>]*>([^<]+)<')
_LEAGUE_RE = re.compile(r'event-list__league[^>]*>([^<]+)<')
_CHAN_RE = re.compile(r'src="[^"]*/channels/[^"]*"\s+alt="([^"]*)"')


def _parse(html: str) -> list:
    """HTML → futbol maçları [{time, home, away, league, channels[], app_channel}]."""
    out = []
    for _href, inner in _ANCHOR_RE.findall(html):
        sport = _SPORT_RE.search(inner)
        if not sport or _norm(sport.group(1)) != "futbol":
            continue  # sadece futbol (öne çıkan yayın futbol odaklı)
        t = _TIME_RE.search(inner)
        name = _NAME_RE.search(inner)
        if not t or not name:
            continue
        teams = name.group(1).strip()
        if " - " not in teams:
            continue  # program/haber satırı (maç değil)
        home, away = [x.strip() for x in teams.split(" - ", 1)]
        league = (_LEAGUE_RE.search(inner).group(1).strip()
                  if _LEAGUE_RE.search(inner) else "")
        # kanal adayları → uygulama kanalına eşle (dedup, sıra korunur)
        raw_chans, seen = [], set()
        for c in _CHAN_RE.findall(inner):
            if c not in seen:
                seen.add(c)
                raw_chans.append(c)
        app_ch = None
        # beIN 1 varsa onu tercih et, yoksa ilk eşleşen
        mapped = [map_channel_name(c) for c in raw_chans]
        mapped = [m for m in mapped if m]
        if "bein1" in mapped:
            app_ch = "bein1"
        elif mapped:
            app_ch = mapped[0]
        if not app_ch:
            continue  # bu maç bizim 8 kanaldan birinde değil → atla
        out.append({"time": t.group(1), "home": home, "away": away,
                    "league": league, "channels": raw_chans, "app_channel": app_ch})
    return out


async def _get_schedule() -> list:
    now = time()
    today = datetime.now(_TZ).strftime("%Y-%m-%d")
    if _SCHED_CACHE["date"] == today and (now - _SCHED_CACHE["at"]) < _SCHED_TTL:
        return _SCHED_CACHE["matches"]
    try:
        html = await asyncio.to_thread(_fetch_html, today)
        matches = _parse(html) if html else []
        if matches or html:  # başarılı fetch (boş liste de geçerli)
            _SCHED_CACHE.update(date=today, at=now, matches=matches)
        return matches
    except Exception as e:
        logger.debug(f"tv schedule fetch fail: {e}")
        return _SCHED_CACHE["matches"] if _SCHED_CACHE["date"] == today else []


def _is_gala(m: dict) -> bool:
    blob = _norm(m["home"] + " " + m["away"])
    return "galatasaray" in blob


async def pick_featured(source_live: bool) -> dict:
    """Öne çıkan yayının HANGİ kanal kutusuna ait olduğunu döndürür.

    Yayın kaynağı FİZİKSEL olarak beIN Sports 1'dir → varsayılan kutu HER ZAMAN beIN 1.
    TEK istisna: Galatasaray maçı canlıysa (kullanıcı yayını GS maçına çevirir ve bu maç
    başka bir kanalda olabilir) → o kanala geçer. Öncelik: Galatasaray > beIN Sports 1.
    Diğer kanallar (TRT Spor, S Sport vb.) öne çıkan yayına ASLA otomatik atanmaz.
    """
    matches = await _get_schedule()
    now = datetime.now(_TZ)
    today = now.date()

    gala_live = None      # (match, start) — canlı Galatasaray maçı
    gala_upcoming = None  # (match, start) — 12s içinde başlayacak GS maçı
    bein_live = None      # (match, start) — canlı beIN Sports 1 maçı (bilgi amaçlı)

    for m in matches:
        try:
            hh, mm = m["time"].split(":")
            start = datetime(today.year, today.month, today.day,
                             int(hh), int(mm), tzinfo=_TZ)
        except Exception:
            continue
        active_from = start - timedelta(minutes=PRE_START_MIN)
        active_to = start + timedelta(minutes=MATCH_DURATION_MIN)
        is_active = active_from <= now <= active_to
        is_upcoming = now < active_from and (start - now) <= timedelta(hours=UPCOMING_WINDOW_HOURS)

        if _is_gala(m):
            if is_active and (gala_live is None or start < gala_live[1]):
                gala_live = (m, start)
            elif is_upcoming and (gala_upcoming is None or start < gala_upcoming[1]):
                gala_upcoming = (m, start)
        if m["app_channel"] == "bein1" and is_active and (bein_live is None or start < bein_live[1]):
            bein_live = (m, start)

    def _match_info(m, start):
        starts_in = max(0, int((start - now).total_seconds() // 60))
        return {"home": m["home"], "away": m["away"], "league": m["league"],
                "time": m["time"], "kickoff_iso": start.isoformat(),
                "starts_in_min": starts_in}

    def _pack(channel, status, info):
        return {"channel": channel,
                "name": APP_CHANNEL_NAMES.get(channel, channel.upper()),
                "status": status, "match": info}

    # Kaynak ayaktaysa → mutlaka bir yayın göster
    if source_live:
        if gala_live:  # Galatasaray canlı → onun kanalına geç (öncelik GS)
            m, start = gala_live
            return _pack(m["app_channel"], "live", _match_info(m, start))
        # Varsayılan: yayın beIN Sports 1'dir
        info = _match_info(*bein_live) if bein_live else None
        return _pack("bein1", "live", info)

    # Kaynak kapalı → oynatılamaz; yalnızca GS için "yakında" bilgisi göster
    if gala_upcoming:
        m, start = gala_upcoming
        return _pack(m["app_channel"], "upcoming", _match_info(m, start))
    if gala_live:
        m, start = gala_live
        return _pack(m["app_channel"], "upcoming", _match_info(m, start))
    return {"channel": "", "name": "", "status": "none", "match": None}

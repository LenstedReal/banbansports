"""Generic stream manager — ST15/SSPort patern'ini her kanal için kullanılabilir hale getirir.

KULLANIM:
    mgr = StreamManager(
        channel_id="bein1",
        live_host="live.stXX.lol",
        embed_host="stXX.lol",
        stream_id="bs1",
        env_prefix="BEIN1",  # → BEIN1_TOKEN, BEIN1_TMS
        dynamic_tms=True,
    )
    register(mgr)

ENV LOOKUP:
    {ENV_PREFIX}_TOKEN  (zorunlu)
    {ENV_PREFIX}_TMS    (opsiyonel — dynamic_tms=True ise zaten ignore)
    {ENV_PREFIX}_DYNAMIC_TMS  (true/false, varsayılan true)

OTOMATİK:
    * Token validate (master m3u8'i indir + 200+#EXTM3U check)
    * Token refresh (embed/stream sayfalarından token parse + master ile validate)
    * Refresh loop background'da her N saniyede çalışır
    * Internal cron endpoint hepsini topluca yeniler
"""
import asyncio
import logging
import os
import re
import httpx
from time import time
from typing import Dict, Optional

logger = logging.getLogger("banbansports.stream")

VALIDATE_TIMEOUT = 8.0
REFRESH_REQ_TIMEOUT = 3.0


class StreamManager:
    def __init__(
        self,
        channel_id: str,
        live_host: str,
        embed_host: str,
        stream_id: str,
        env_prefix: str,
        dynamic_tms: bool = True,
        user_agent: str = "SSUserAgent",
        # --- Variant config (default: st15-style /{stream_id}/index.m3u8) ---
        path_template: str = "{stream_id}/index.m3u8",
        extra_query: Optional[Dict[str, str]] = None,
        extra_allowed_hosts: Optional[list] = None,
    ):
        self.channel_id = channel_id
        self.live_host = live_host
        self.embed_host = embed_host
        self.stream_id = stream_id
        self.env_prefix = env_prefix
        self.user_agent = user_agent
        self.path_template = path_template
        # extra_query: literal values or "$ENV:<KEY>" placeholders → resolved at runtime
        self.extra_query: Dict[str, str] = dict(extra_query or {})
        # ENV'den initial values
        self.current_token = os.environ.get(f"{env_prefix}_TOKEN", "").strip()
        self.current_tms = os.environ.get(f"{env_prefix}_TMS", "").strip()
        # Dynamic TMS — ENV override, varsayılan True
        dyn = os.environ.get(f"{env_prefix}_DYNAMIC_TMS", "true").lower()
        self.dynamic_tms = dyn in ("1", "true", "yes", "on") if dyn else dynamic_tms
        self.last_refresh = time()
        self.lock = asyncio.Lock()
        # Allowlist (segment proxy SSRF için)
        self.allowed_hosts = {live_host, embed_host}
        if extra_allowed_hosts:
            self.allowed_hosts.update(extra_allowed_hosts)

    def _effective_tms(self) -> str:
        if self.current_tms and not self.dynamic_tms:
            return self.current_tms
        return str(int(time()))

    def _resolve_extras(self) -> str:
        if not self.extra_query:
            return ""
        parts = []
        for k, v in self.extra_query.items():
            val = v
            if isinstance(v, str) and v.startswith("$ENV:"):
                val = os.environ.get(v[5:], "").strip()
                if not val:
                    continue
            parts.append(f"{k}={val}")
        return ("&" + "&".join(parts)) if parts else ""

    def _resolved_path(self) -> str:
        return self.path_template.format(stream_id=self.stream_id)

    def get_stream_url(self) -> str:
        path = self._resolved_path()
        return (f"https://{self.live_host}/{path}"
                f"?token={self.current_token}&tms={self._effective_tms()}"
                f"{self._resolve_extras()}")

    def get_segment_base(self) -> str:
        path = self._resolved_path()
        # master_720.m3u8 gibi dosya isimleri için path'in dirname'ini al
        if "/" in path:
            base = path.rsplit("/", 1)[0]
            return f"https://{self.live_host}/{base}/"
        return f"https://{self.live_host}/"

    def host_allowed(self, url: str) -> bool:
        try:
            from urllib.parse import urlparse
            host = (urlparse(url).netloc or "").split(":")[0].lower()
            if not host:
                return False
            if host in self.allowed_hosts:
                return True
            for allowed in self.allowed_hosts:
                if host.endswith("." + allowed):
                    return True
            return False
        except Exception:
            return False

    def is_configured(self) -> bool:
        return bool(self.current_token)

    async def is_token_valid(self) -> bool:
        if not self.current_token:
            return False
        try:
            async with httpx.AsyncClient(timeout=VALIDATE_TIMEOUT) as http:
                r = await http.get(self.get_stream_url(),
                                   headers={"User-Agent": self.user_agent,
                                            "Host": self.live_host,
                                            "Accept": "*/*"},
                                   follow_redirects=True)
                return r.status_code == 200 and r.text.startswith("#EXTM3U")
        except Exception:
            return False

    async def try_auto_refresh(self) -> bool:
        """Embed sayfalarından token parse → master ile validate → güncelle."""
        async with self.lock:
            candidates = [
                f"https://{self.embed_host}/stream/{self.stream_id}",
                f"https://{self.embed_host}/embed/{self.stream_id}",
                f"https://{self.embed_host}/{self.stream_id}",
                f"https://{self.embed_host}/?p=stream&id={self.stream_id}",
                f"https://{self.embed_host}/",
            ]
            token_pat = re.compile(r'token=([A-Za-z0-9_-]{10,})')
            combo_pats = [
                re.compile(r'token=([A-Za-z0-9_-]+)[^"\s\'<>]*?tms=(\d+)'),
                re.compile(r'tms=(\d+)[^"\s\'<>]*?token=([A-Za-z0-9_-]+)'),
            ]
            try:
                async with httpx.AsyncClient(timeout=REFRESH_REQ_TIMEOUT, follow_redirects=True) as http:
                    for url in candidates:
                        try:
                            r = await http.get(url, headers={
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                                "Accept": "text/html,application/xhtml+xml,*/*",
                                "Referer": f"https://{self.embed_host}/",
                            })
                            if r.status_code != 200 or not r.text:
                                continue
                            text = r.text
                            new_token = None
                            for pat in combo_pats:
                                m = pat.search(text)
                                if m:
                                    new_token = m.group(1) if pat.pattern.startswith(r'token') else m.group(2)
                                    break
                            if not new_token:
                                m = token_pat.search(text)
                                if m:
                                    new_token = m.group(1)
                            if not new_token or new_token == self.current_token:
                                continue
                            # Test URL — variant'lı path + extras dahil
                            test_url = (f"https://{self.live_host}/{self._resolved_path()}"
                                        f"?token={new_token}&tms={int(time())}"
                                        f"{self._resolve_extras()}")
                            tr = await http.get(test_url, headers={
                                "User-Agent": self.user_agent,
                                "Host": self.live_host,
                                "Accept": "*/*",
                            }, follow_redirects=True, timeout=4.0)
                            if tr.status_code == 200 and tr.text.startswith("#EXTM3U"):
                                self.current_token = new_token
                                self.last_refresh = time()
                                logger.info(f"[{self.channel_id}] token refresh OK (src={url})")
                                return True
                        except Exception as e:
                            logger.debug(f"[{self.channel_id}] {url}: {e}")
            except Exception as e:
                logger.warning(f"[{self.channel_id}] refresh outer: {e}")
            return False


# === REGISTRY — tüm aktif stream manager'lar burada ===
_REGISTRY: Dict[str, StreamManager] = {}


def register(mgr: StreamManager) -> None:
    _REGISTRY[mgr.channel_id] = mgr
    logger.info(f"Stream registered: {mgr.channel_id} (host={mgr.live_host}, sid={mgr.stream_id})")


def get(channel_id: str) -> Optional[StreamManager]:
    return _REGISTRY.get(channel_id)


def all_managers() -> Dict[str, StreamManager]:
    return dict(_REGISTRY)


async def refresh_all() -> Dict[str, dict]:
    """Tüm kanalların token'ını paralel kontrol/yenile (cron endpoint için)."""
    async def _one(mgr: StreamManager):
        valid = await mgr.is_token_valid()
        refreshed = False
        if not valid and mgr.is_configured():
            refreshed = await mgr.try_auto_refresh()
        return mgr.channel_id, {
            "configured": mgr.is_configured(),
            "was_valid": valid,
            "refreshed": refreshed,
            "current_tms": mgr.current_tms or "(dynamic)",
        }
    results = await asyncio.gather(*[_one(m) for m in _REGISTRY.values()])
    return dict(results)


# === STREAMS — tüm kanal config'leri burada (ekleme yeri) ===
#
# Yeni kanal eklemek için 1 satır ekle:
#   register(StreamManager(
#       channel_id="<frontend id>",       # örn: "bein1", "ssport", "trtspor"
#       live_host="live.stXX.lol",         # m3u8 master host
#       embed_host="stXX.lol",             # token parse edilecek host
#       stream_id="<path>",                # /master.m3u8'den önceki path örn: "ss11"
#       env_prefix="<PREFIX>",             # ENV: <PREFIX>_TOKEN
#   ))
def _bootstrap():
    # === S Sport (st15.lol — ss11) ===
    register(StreamManager(
        channel_id="ssport",
        live_host="live.st15.lol",
        embed_host="st15.lol",
        stream_id="ss11",
        env_prefix="SSPORT",
    ))
    # SSPORT alias: STREAM_TOKEN/STREAM_TMS de destekleniyor (backward compat)
    ssport_mgr = get("ssport")
    if ssport_mgr and not ssport_mgr.current_token:
        ssport_mgr.current_token = os.environ.get("STREAM_TOKEN", "").strip()
        ssport_mgr.current_tms = os.environ.get("STREAM_TMS", "").strip()

    # === Tivibu Spor (st15.lol /t1 — TRT 1 origin reject ediyor, st15 üzerinden veriyoruz) ===
    register(StreamManager(
        channel_id="tivibuspor",
        live_host="live.st15.lol",
        embed_host="st15.lol",
        stream_id="t1",
        env_prefix="TIVIBUSPOR",
    ))

    # === TRT 1 (st15.lol /t1 — ayrı token slot'u; tivibuspor ile aynı host) ===
    register(StreamManager(
        channel_id="trt1",
        live_host="live.st15.lol",
        embed_host="st15.lol",
        stream_id="t1",
        env_prefix="TRT1",
    ))

    # === TV 8 (st15.lol /tv8) ===
    register(StreamManager(
        channel_id="tv8",
        live_host="live.st15.lol",
        embed_host="st15.lol",
        stream_id="tv8",
        env_prefix="TV8",
    ))

    # === TRT Haber (TRT origin — direct) ===
    register(StreamManager(
        channel_id="trthaber",
        live_host="tv-trthaber.medya.trt.com.tr",
        embed_host="www.trt.net.tr",
        stream_id="",
        env_prefix="TRTHABER",
        path_template="master.m3u8",
    ))

    # === TRT Spor (daioncdn — özel pattern: master_1080.m3u8 + platform + sid) ===
    register(StreamManager(
        channel_id="trtspor",
        live_host="trt.daioncdn.net",
        embed_host="www.trtspor.com.tr",
        stream_id="trtspor",
        env_prefix="TRTSPOR",
        path_template="{stream_id}/master_1080.m3u8",
        extra_query={
            "platform": "trtspor",
            "sid": "$ENV:TRTSPOR_SID",
        },
        extra_allowed_hosts=["trt.daioncdn.net", "daioncdn.net"],
    ))
    # Yeni kanallar buraya register() ile eklenir.


_bootstrap()

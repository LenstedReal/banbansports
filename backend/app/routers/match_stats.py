"""Match stats — LiveScore + SportsDB + SofaScore fallback chain."""
import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter

from ..core.config import LIVESCORE_FETCH_TIMEOUT
from ..core.team_translations import tr_to_en_candidates
from ..services.livescore import (
    livescore_fetch_day, _normalize_tr,
    LIVESCORE_HEADERS, SDB_BASE, SOFASCORE_HEADERS,
)

logger = logging.getLogger("banbansports.matchstats")
router = APIRouter(prefix="/api/match", tags=["match"])

SDB_HEADERS = {"User-Agent": "Mozilla/5.0"}


async def _sdb_get(http: httpx.AsyncClient, path: str) -> Optional[dict]:
    try:
        r = await http.get(f"{SDB_BASE}{path}", headers=SDB_HEADERS)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


@router.get("/stats")
async def get_match_stats(home: str, away: str, date: Optional[str] = None):
    # Accept both Turkish and English team names — generate all candidates
    home_candidates = [_normalize_tr(c) for c in tr_to_en_candidates(home.strip())]
    away_candidates = [_normalize_tr(c) for c in tr_to_en_candidates(away.strip())]
    stats: dict = {"home": home, "away": away, "events": [], "stats": {}, "sources": []}

    def _match(t1: str, t2: str) -> bool:
        t1n, t2n = _normalize_tr(t1), _normalize_tr(t2)
        h_ok = any(h in t1n or t1n in h for h in home_candidates if h)
        a_ok = any(a in t2n or t2n in a for a in away_candidates if a)
        return h_ok and a_ok

    async with httpx.AsyncClient(timeout=LIVESCORE_FETCH_TIMEOUT) as http:
        found = None
        dates_to_try = [date] if (date and len(date) == 8) else [
            (datetime.now(timezone.utc) - timedelta(days=d)).strftime("%Y%m%d") for d in range(0, 15)
        ]
        for d in dates_to_try:
            data = await livescore_fetch_day(http, d)
            if not data:
                continue
            for stage in (data.get("Stages") or []):
                for ev in (stage.get("Events") or []):
                    t1 = ((ev.get("T1") or [{}])[0].get("Nm") or "")
                    t2 = ((ev.get("T2") or [{}])[0].get("Nm") or "")
                    if _match(t1, t2):
                        found = (ev, d, stage)
                        break
                if found:
                    break
            if found:
                break

        if found:
            ev, ev_date, stage = found
            stats["sources"].append("livescore")
            stats["live_event_id"] = ev.get("Eid")
            stats["date"] = ev_date
            stats["league"] = stage.get("Snm") or stage.get("Cnm") or ""
            stats["score"] = {
                "home": ev.get("Tr1", 0), "away": ev.get("Tr2", 0),
                "pen_home": ev.get("Trp1"), "pen_away": ev.get("Trp2"),
            }
            stats["eps"] = ev.get("Eps")

            event_id = ev.get("Eid")
            md_incs = []
            if event_id:
                try:
                    r = await http.get(f"https://prod-public-api.livescore.com/v1/api/app/scoreboard/soccer/{event_id}",
                                       headers=LIVESCORE_HEADERS)
                    if r.status_code == 200:
                        md = r.json()
                        if md.get("Tr1") is not None:
                            stats["score"]["home"] = md.get("Tr1")
                        if md.get("Tr2") is not None:
                            stats["score"]["away"] = md.get("Tr2")
                        venue_raw = md.get("Venue")
                        if isinstance(venue_raw, dict):
                            stats["venue"] = venue_raw.get("Vnm") or venue_raw.get("Nm") or ""
                        elif isinstance(venue_raw, str):
                            stats["venue"] = venue_raw
                        if md.get("Esd"):
                            stats["start_date"] = md.get("Esd")
                        for period_key, groups in (md.get("Incs-s") or {}).items():
                            for grp in (groups or []):
                                for inc in (grp.get("Incs") or [grp]):
                                    side = "a" if str(inc.get("Nm", "1")) == "2" else "h"
                                    md_incs.append((side, inc))
                except Exception:
                    pass

                # Statistics
                try:
                    stat_r = await http.get(f"https://prod-public-api.livescore.com/v1/api/app/statistics/soccer/{event_id}",
                                            headers=LIVESCORE_HEADERS)
                    if stat_r.status_code == 200:
                        stat_list = (stat_r.json() or {}).get("Stat") or []
                        home_stat, away_stat = {}, {}
                        for s in stat_list:
                            if s.get("Tnb") == 1:
                                home_stat = s
                            elif s.get("Tnb") == 2:
                                away_stat = s
                        stat_map = {
                            "ball_possession":   ("Pss", "%"),
                            "shots_on_goal":     ("Shon", None),
                            "shots_off_goal":    ("Shof", None),
                            "blocked_shots":     ("Shbl", None),
                            "corner_kicks":      ("Crs", None),
                            "offsides":          ("Ofs", None),
                            "fouls":             ("Fls", None),
                            "yellow_cards":      ("Ycs", None),
                            "red_cards":         ("Rcs", None),
                            "goalkeeper_saves":  ("Gks", None),
                            "throw_ins":         ("Ths", None),
                            "xg":                ("Xg", None),
                        }
                        for stat_key, (field, suffix) in stat_map.items():
                            hv = home_stat.get(field, 0)
                            av = away_stat.get(field, 0)
                            if hv or av:
                                stats["stats"][stat_key] = {
                                    "home": f"{hv}{suffix or ''}",
                                    "away": f"{av}{suffix or ''}",
                                }
                        stats["sources"].append("livescore_statistics")
                except Exception:
                    pass

            # Incidents (goals/cards/subs)
            for inc in (ev.get("Incs") or []):
                side = "a" if str(inc.get("Nm", "1")) == "2" else "h"
                md_incs.append((side, inc))

            GOAL_ITS = {4, 36, 49, 50}
            PEN_ITS = {37}
            OG_ITS = {38}
            YC_ITS = {6, 39}
            SYC_ITS = {41}
            RC_ITS = {7, 40}
            # Bug #8 derinleştirme: LiveScore'un SUB IT kodları farklı maç türlerinde {11,12,13,14,15,25,26,27,30,31}
            # gibi geniş bir aralıkta gelebiliyor. SUB için player out + player in alanlarını da kontrol et.
            SUB_ITS = {11, 12, 13, 14, 15, 25, 26, 27, 30, 31}
            seen = set()
            for side, inc in md_incs:
                it = inc.get("IT")
                # Dedup: sub'larda (side, minute, player) — gol/kart aynı dakikada player ile de ayırt edilir
                player_name = inc.get("Pn") or (f"{inc.get('Fn','')} {inc.get('Ln','')}".strip()) or inc.get("Player") or "—"
                key = (side, it, inc.get("Min"), player_name)
                if key in seen:
                    continue
                seen.add(key)
                kind = label = None
                if it in YC_ITS:
                    kind, label = "yellow", "SARI KART"
                elif it in SYC_ITS:
                    kind, label = "red", "2. SARI = KIRMIZI"
                elif it in RC_ITS:
                    kind, label = "red", "KIRMIZI KART"
                elif it in SUB_ITS:
                    kind, label = "sub", "DEĞİŞİKLİK"
                # Ek tespit: LiveScore raw "Pn2" (player out) alanı doluysa sub event'tir
                elif it is None and inc.get("Pn2") and not inc.get("Tsc"):
                    kind, label = "sub", "DEĞİŞİKLİK"
                elif it in PEN_ITS:
                    kind, label = "goal", "PENALTI GOL"
                elif it in OG_ITS:
                    kind, label = "goal", "K. KALE GOL"
                elif it in GOAL_ITS:
                    kind, label = "goal", "GOL"
                if kind:
                    stats["events"].append({
                        "minute": inc.get("Min") or inc.get("Mn") or 0,
                        "type": kind, "label": label,
                        "team": "home" if side == "h" else "away",
                        "player": player_name,
                        "assist": inc.get("Pn2") or inc.get("P2"),
                    })

        # SofaScore fallback for live incidents
        try:
            sofa_id = None
            for d_iso in [datetime.now(timezone.utc).strftime("%Y-%m-%d")] + \
                        [(datetime.now(timezone.utc) - timedelta(days=d)).strftime("%Y-%m-%d") for d in range(1, 8)]:
                r = await http.get(f"https://api.sofascore.com/api/v1/sport/football/scheduled-events/{d_iso}",
                                   headers=SOFASCORE_HEADERS)
                if r.status_code != 200:
                    continue
                for ev in (r.json().get("events") or []):
                    h = (ev.get("homeTeam") or {}).get("name") or ""
                    a = (ev.get("awayTeam") or {}).get("name") or ""
                    if _match(h, a):
                        sofa_id = ev.get("id")
                        break
                if sofa_id:
                    break
            if sofa_id:
                inc_r = await http.get(f"https://api.sofascore.com/api/v1/event/{sofa_id}/incidents",
                                       headers=SOFASCORE_HEADERS)
                if inc_r.status_code == 200:
                    # Dedup key player ismi ile zenginleştirildi → aynı dakikada 2 değişiklik artık merge olmuyor (Bug #8)
                    existing = set((e.get("minute"), e["type"], e["team"], (e.get("player") or '')) for e in stats["events"])
                    for inc in (inc_r.json() or {}).get("incidents") or []:
                        itype = inc.get("incidentType") or ""
                        is_home = inc.get("isHome", True)
                        minute = inc.get("time") or 0
                        team = "home" if is_home else "away"
                        new_ev = None
                        if itype == "substitution":
                            p_in = (inc.get("playerIn") or {}).get("name") or "—"
                            p_out = (inc.get("playerOut") or {}).get("name")
                            new_ev = {"minute": minute, "type": "sub", "label": "DEĞİŞİKLİK", "team": team,
                                      "player": p_in, "assist": p_out}
                        elif itype == "card":
                            color = (inc.get("incidentClass") or "").lower()
                            if color == "yellow":
                                new_ev = {"minute": minute, "type": "yellow", "label": "SARI KART", "team": team,
                                          "player": (inc.get("player") or {}).get("name") or "—"}
                            elif color in ("red", "yellowred"):
                                new_ev = {"minute": minute, "type": "red",
                                          "label": "KIRMIZI KART" if color == "red" else "2. SARI = KIRMIZI",
                                          "team": team, "player": (inc.get("player") or {}).get("name") or "—"}
                        elif itype == "goal":
                            cls = (inc.get("incidentClass") or "").lower()
                            label = "PENALTI GOL" if cls == "penalty" else ("K. KALE GOL" if cls == "owngoal" else "GOL")
                            new_ev = {"minute": minute, "type": "goal", "label": label, "team": team,
                                      "player": (inc.get("player") or {}).get("name") or "—",
                                      "assist": (inc.get("assist1") or {}).get("name") if inc.get("assist1") else None}
                        if new_ev:
                            key = (new_ev["minute"], new_ev["type"], new_ev["team"], new_ev.get("player") or '')
                            if key not in existing:
                                stats["events"].append(new_ev)
                                existing.add(key)
                    stats["sources"].append("sofascore")
                    stats["events"].sort(key=lambda e: int(e.get("minute") or 0))
        except Exception:
            pass

    # === SAYIM BAZLI İSTATİSTİKLER — events array'inden GERÇEK sayım hesapla ===
    # (Bug #8 fix: backend bunları hesaplamıyordu, frontend hep 0 gösteriyordu.
    # Veri YİNE LiveScore/SofaScore — sadece toplama yapıyoruz, fake değil.)
    counts = {
        "goals":          [0, 0],
        "penalty_goals":  [0, 0],
        "own_goals":      [0, 0],
        "yellow_cards":   [0, 0],
        "second_yellow":  [0, 0],
        "red_cards":      [0, 0],
        "substitutions":  [0, 0],
    }
    for ev in stats["events"]:
        side = 0 if ev.get("team") == "home" else 1
        ev_type = ev.get("type") or ""
        label = (ev.get("label") or "").upper()
        if ev_type == "goal":
            counts["goals"][side] += 1
            if "PENALTI" in label:
                counts["penalty_goals"][side] += 1
            elif "K. KALE" in label or "KENDİ KALE" in label:
                counts["own_goals"][side] += 1
        elif ev_type == "yellow":
            counts["yellow_cards"][side] += 1
        elif ev_type == "red":
            counts["red_cards"][side] += 1
            if "2. SARI" in label or "İKİNCİ SARI" in label:
                counts["second_yellow"][side] += 1
        elif ev_type == "sub":
            counts["substitutions"][side] += 1
    # Yalnızca events'den GERÇEK sayı çıkıyorsa stats'e yaz — boş array'de
    # de always:true olan stat'lar 0-0 gösterilecek (ki bu DOĞRU davranış,
    # maç başlamamış/event yok demektir).
    for k, (h, a) in counts.items():
        if k not in stats["stats"]:
            stats["stats"][k] = {"home": h, "away": a}

    stats["available"] = bool(stats["sources"])
    if not stats["available"]:
        stats["message"] = "Bu maç için detaylı istatistik henüz yok."
    return stats


# ============== Match detail by slug ==============
@router.get("/by-slug/{slug:path}")
async def get_match_by_slug(slug: str):
    """Slug format: team1__team2__YYYYMMDD.
    Hem ham (Güney_Kore) hem percent-encoded (G%C3%BCney_Kore) gelir, ikisi de çözülür."""
    from urllib.parse import unquote
    try:
        decoded = unquote(slug)
        if "%" in decoded:
            try:
                decoded = unquote(decoded)
            except Exception:
                pass
    except Exception:
        decoded = slug
    parts = decoded.split("__")
    if len(parts) < 2:
        return {"available": False, "message": "Geçersiz slug"}
    home = parts[0].replace("_", " ").strip()
    away = parts[1].replace("_", " ").strip()
    date = parts[2] if len(parts) >= 3 else None
    return await get_match_stats(home=home, away=away, date=date)

"""Score endpoints — /api/scores/*, /api/livescore/*"""
import logging
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter

from ..services.livescore import fetch_live_scores, livescore_fetch_day, TR_TZ
from ..core.team_translations import tr_team_name
from ..core.config import LIVESCORE_FETCH_TIMEOUT

logger = logging.getLogger("banbansports.scores")
router = APIRouter(prefix="/api", tags=["scores"])


def _translate_stages(data: dict) -> dict:
    """Apply Turkish team-name translation to all Events within Stages."""
    if not data or "Stages" not in data:
        return data
    for stage in data.get("Stages") or []:
        for ev in (stage.get("Events") or []):
            t1_arr = ev.get("T1") or []
            t2_arr = ev.get("T2") or []
            if t1_arr and isinstance(t1_arr, list):
                for t in t1_arr:
                    if isinstance(t, dict) and t.get("Nm"):
                        t["NmEn"] = t["Nm"]
                        t["Nm"] = tr_team_name(t["Nm"])
            if t2_arr and isinstance(t2_arr, list):
                for t in t2_arr:
                    if isinstance(t, dict) and t.get("Nm"):
                        t["NmEn"] = t["Nm"]
                        t["Nm"] = tr_team_name(t["Nm"])
    return data


@router.get("/scores/live")
async def get_live_scores():
    score = await fetch_live_scores(top_n=1)
    if not score:
        return {"type": "score_update", "available": False, "message": "Şu an için maç verisi yok",
                "timestamp": datetime.now(timezone.utc).isoformat()}
    return score


@router.get("/scores/top")
async def get_top_scores(n: int = 5):
    n = max(1, min(int(n), 10))
    data = await fetch_live_scores(top_n=n)
    if not data:
        return {"type": "score_top", "matches": [], "timestamp": datetime.now(timezone.utc).isoformat()}
    return data


@router.get("/livescore/today")
async def livescore_today():
    # Use Istanbul date — otherwise after 21:00 UTC (00:00 TR) we'd fetch yesterday
    date_str = datetime.now(TR_TZ).strftime("%Y%m%d")
    try:
        async with httpx.AsyncClient(timeout=LIVESCORE_FETCH_TIMEOUT) as http:
            data = await livescore_fetch_day(http, date_str)
            if data:
                return _translate_stages(data)
    except Exception as e:
        logger.warning(f"LiveScore today error: {e}")
    return {"Stages": []}


@router.get("/livescore/date/{date_str}")
async def livescore_date(date_str: str):
    try:
        async with httpx.AsyncClient(timeout=LIVESCORE_FETCH_TIMEOUT) as http:
            data = await livescore_fetch_day(http, date_str)
            if data:
                return _translate_stages(data)
    except Exception as e:
        logger.warning(f"LiveScore date error: {e}")
    return {"Stages": []}

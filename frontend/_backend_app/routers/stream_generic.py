"""Generic stream router — kayıtlı tüm StreamManager'ları HTTP endpoint'ler üzerinden sunar.

Endpointler:
  GET  /api/stream/{ch}/health      → config + canlılık
  POST /api/stream/{ch}/refresh     → manuel token refresh
  GET  /api/stream/{ch}/stream.m3u8 → master proxy (segment rewrite)
  GET  /api/stream/{ch}/seg.ts      → tek segment proxy (SSRF allowlist)
  GET  /api/stream/list             → tüm kayıtlı kanallar
"""
import httpx
from urllib.parse import quote
from time import time
from fastapi import APIRouter, HTTPException, Response

from ..services import stream_registry as reg

router = APIRouter(prefix="/api/stream", tags=["stream"])


@router.get("/list")
async def list_streams():
    out = {}
    for cid, mgr in reg.all_managers().items():
        out[cid] = {
            "configured": mgr.is_configured(),
            "host": mgr.live_host,
            "stream_id": mgr.stream_id,
            "dynamic_tms": mgr.dynamic_tms,
        }
    return out


@router.get("/{channel_id}/health")
async def health(channel_id: str):
    mgr = reg.get(channel_id)
    if not mgr:
        raise HTTPException(status_code=404, detail="Channel not registered")
    if not mgr.is_configured():
        return {"configured": False, "ok": False}
    valid = await mgr.is_token_valid()
    return {
        "configured": True,
        "ok": valid,
        "dynamic_tms": mgr.dynamic_tms,
        "current_tms": mgr._effective_tms(),
        "token_preview": (mgr.current_token[:8] + "…") if mgr.current_token else "",
        "last_refresh_age_seconds": int(time() - mgr.last_refresh),
    }


@router.post("/{channel_id}/refresh")
async def refresh(channel_id: str):
    mgr = reg.get(channel_id)
    if not mgr:
        raise HTTPException(status_code=404, detail="Channel not registered")
    ok = await mgr.try_auto_refresh()
    return {"refreshed": ok, "token_preview": (mgr.current_token[:8] + "…") if mgr.current_token else ""}


@router.get("/{channel_id}/stream.m3u8")
async def stream_m3u8(channel_id: str):
    mgr = reg.get(channel_id)
    if not mgr:
        raise HTTPException(status_code=404, detail="Channel not registered")
    if not mgr.is_configured():
        raise HTTPException(status_code=503, detail=f"{channel_id} token not configured")

    url = mgr.get_stream_url()
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as http:
            r = await http.get(url, headers={
                "User-Agent": mgr.user_agent,
                "Accept": "*/*",
                "Host": mgr.live_host,
            })
            # Token expired → auto refresh + 1 retry
            if r.status_code in (401, 403, 404, 410):
                if await mgr.try_auto_refresh():
                    r = await http.get(mgr.get_stream_url(), headers={
                        "User-Agent": mgr.user_agent,
                        "Accept": "*/*",
                        "Host": mgr.live_host,
                    })
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail="Upstream unavailable")

            base = mgr.get_segment_base()
            lines = r.text.split("\n")
            new = []
            for line in lines:
                if line.startswith("#") or not line.strip():
                    new.append(line)
                else:
                    seg = line.strip()
                    if not seg.startswith("http"):
                        seg = (f"https://{mgr.live_host}{seg}") if seg.startswith("/") else (base + seg)
                    new.append(f"/api/stream/{channel_id}/seg.ts?url={quote(seg, safe='')}")
            return Response(
                content="\n".join(new),
                media_type="application/vnd.apple.mpegurl",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                },
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Fetch failed: {e}")


@router.get("/{channel_id}/seg.ts")
async def segment(channel_id: str, url: str):
    mgr = reg.get(channel_id)
    if not mgr:
        raise HTTPException(status_code=404, detail="Channel not registered")
    if not mgr.host_allowed(url):
        raise HTTPException(status_code=403, detail="Host not allowed")
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as http:
            r = await http.get(url, headers={
                "User-Agent": mgr.user_agent,
                "Accept": "*/*",
                "Host": mgr.live_host,
            })
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail="Segment failed")
            return Response(
                content=r.content,
                media_type="video/mp2t",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "private, max-age=60",
                },
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Segment proxy error: {e}")

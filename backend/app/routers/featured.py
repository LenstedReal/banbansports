"""Öne çıkan yayın (featured) — tek yapılandırılabilir HLS kaynağını Cloudflare
bypass (curl_cffi impersonate) + Referer ile proxy'ler.

Kaynak env'den gelir (FEATURED_SOURCE_URL). Kaynak günlük değişebileceği ve
bazen bir maç yayınını (ör. beIN Sports) taşıdığı için:
  * /status  → kaynak canlı mı? (yeşil/turuncu LED sinyali) — 45sn cache
  * /stream.m3u8 → master proxy (segment/child rewrite)
  * /playlist.m3u8?url= → child playlist proxy
  * /seg.ts?url= → segment proxy (SSRF allowlist)

NOT: Datacenter IP'leri (Vercel/preview) korsan-koruma Cloudflare tarafından
403'lenebilir. Bu durumda status live=false döner ve UI zarifçe "aktif değil"
gösterir. Residential/mobil IP'li bir kaynak (ör. tünellenmiş) sorunsuz çalışır.
"""
import asyncio
import logging
import os
from time import time
from urllib.parse import quote, urlparse
from fastapi import APIRouter, HTTPException, Response

logger = logging.getLogger("banbansports.featured")
router = APIRouter(prefix="/api/featured", tags=["featured"])

_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
_IMPERSONATE = "chrome120"
_TIMEOUT = 10.0

_STATUS_CACHE = {"at": 0.0, "live": False}
_STATUS_TTL = 45.0


def _cfg():
    return {
        "source": os.environ.get("FEATURED_SOURCE_URL", "").strip(),
        "referer": os.environ.get("FEATURED_REFERER", "").strip(),
        "channel": os.environ.get("FEATURED_CHANNEL", "bein1").strip(),
        "name": os.environ.get("FEATURED_NAME", "").strip(),
        "extra_hosts": [h.strip().lower() for h in
                        os.environ.get("FEATURED_ALLOWED_HOSTS", "").split(",") if h.strip()],
    }


def _reg_domain(host: str) -> str:
    parts = (host or "").lower().split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else host.lower()


def _host_allowed(url: str) -> bool:
    cfg = _cfg()
    if not cfg["source"]:
        return False
    try:
        host = (urlparse(url).netloc or "").split(":")[0].lower()
        if not host:
            return False
        src_host = (urlparse(cfg["source"]).netloc or "").split(":")[0].lower()
        if host == src_host or host.endswith("." + _reg_domain(src_host)):
            return True
        for allowed in cfg["extra_hosts"]:
            if host == allowed or host.endswith("." + allowed):
                return True
        return False
    except Exception:
        return False


def _headers(cfg):
    h = {"User-Agent": _UA, "Accept": "*/*"}
    if cfg["referer"]:
        h["Referer"] = cfg["referer"]
        try:
            p = urlparse(cfg["referer"])
            h["Origin"] = f"{p.scheme}://{p.netloc}"
        except Exception:
            pass
    return h


def _fetch_sync(url: str, headers: dict):
    """curl_cffi ile (Cloudflare TLS bypass) senkron GET — to_thread içinde çağrılır."""
    from curl_cffi import requests as cffi
    return cffi.get(url, headers=headers, impersonate=_IMPERSONATE,
                    timeout=_TIMEOUT, allow_redirects=True)


async def _fetch(url: str, headers: dict):
    return await asyncio.to_thread(_fetch_sync, url, headers)


def _rewrite_playlist(text: str, base_url: str, live_host: str) -> str:
    lines = text.split("\n")
    out = []
    base = base_url.rsplit("/", 1)[0] + "/" if "/" in base_url else base_url
    for line in lines:
        if line.startswith("#") or not line.strip():
            out.append(line)
            continue
        seg = line.strip()
        if not seg.startswith("http"):
            if seg.startswith("/"):
                seg = f"https://{live_host}{seg}"
            else:
                seg = base + seg
        low = seg.split("?", 1)[0].lower()
        if low.endswith(".m3u8"):
            out.append(f"/api/featured/playlist.m3u8?url={quote(seg, safe='')}")
        else:
            out.append(f"/api/featured/seg.ts?url={quote(seg, safe='')}")
    return "\n".join(out)


@router.get("/status")
async def status():
    cfg = _cfg()
    default_name = {"bein1": "beIN SPORTS 1", "ssport": "S SPORT", "trt1": "TRT 1",
                    "tv8": "TV 8", "trtspor": "TRT SPOR"}.get(cfg["channel"], cfg["channel"].upper())
    name = cfg["name"] or default_name
    base = {"channel": cfg["channel"], "name": name, "configured": bool(cfg["source"])}
    if not cfg["source"]:
        return {**base, "live": False}
    now = time()
    if (now - _STATUS_CACHE["at"]) < _STATUS_TTL:
        return {**base, "live": _STATUS_CACHE["live"], "cached": True}
    live = False
    try:
        r = await _fetch(cfg["source"], _headers(cfg))
        live = r.status_code == 200 and r.text.startswith("#EXTM3U")
    except Exception as e:
        logger.debug(f"featured status fail: {e}")
        live = False
    _STATUS_CACHE["at"] = now
    _STATUS_CACHE["live"] = live
    return {**base, "live": live, "cached": False}


@router.get("/stream.m3u8")
async def stream_m3u8():
    cfg = _cfg()
    if not cfg["source"]:
        raise HTTPException(status_code=503, detail="Öne çıkan yayın yapılandırılmadı")
    live_host = (urlparse(cfg["source"]).netloc or "").split(":")[0].lower()
    try:
        r = await _fetch(cfg["source"], _headers(cfg))
        if r.status_code != 200 or not r.text.startswith("#EXTM3U"):
            raise HTTPException(status_code=502, detail="Kaynak yayın erişilemez")
        body = _rewrite_playlist(r.text, cfg["source"], live_host)
        return Response(content=body, media_type="application/vnd.apple.mpegurl",
                        headers={"Access-Control-Allow-Origin": "*",
                                 "Cache-Control": "no-cache, no-store, must-revalidate"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Fetch failed: {e}")


@router.get("/playlist.m3u8")
async def child_playlist(url: str):
    if not _host_allowed(url):
        raise HTTPException(status_code=403, detail="Host not allowed")
    cfg = _cfg()
    live_host = (urlparse(url).netloc or "").split(":")[0].lower()
    try:
        r = await _fetch(url, _headers(cfg))
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail="Child playlist unavailable")
        body = _rewrite_playlist(r.text, url, live_host)
        return Response(content=body, media_type="application/vnd.apple.mpegurl",
                        headers={"Access-Control-Allow-Origin": "*",
                                 "Cache-Control": "no-cache, no-store, must-revalidate"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Child playlist error: {e}")


@router.get("/seg.ts")
async def segment(url: str):
    if not _host_allowed(url):
        raise HTTPException(status_code=403, detail="Host not allowed")
    cfg = _cfg()
    try:
        r = await _fetch(url, _headers(cfg))
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail="Segment failed")
        low = url.split("?", 1)[0].lower()
        ct = "application/vnd.apple.mpegurl" if low.endswith(".m3u8") else "video/mp2t"
        if low.endswith(".m3u8"):
            live_host = (urlparse(url).netloc or "").split(":")[0].lower()
            body = _rewrite_playlist(r.text, url, live_host)
            return Response(content=body, media_type=ct,
                            headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache"})
        return Response(content=r.content, media_type=ct,
                        headers={"Access-Control-Allow-Origin": "*",
                                 "Cache-Control": "private, max-age=60"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Segment error: {e}")

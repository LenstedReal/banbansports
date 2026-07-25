"""Öne çıkan yayın (featured) — tünellenmiş residential kaynağı proxy'ler.

Kaynak env'den gelir (FEATURED_SOURCE_URL). Genelde bir cloudflared/ngrok tüneli
(residential IP'li Termux köprüsü) — datacenter'dan erişilebilir olduğu için düz
httpx yeterli (curl_cffi gerekmez).

Manifest içindeki segment URL'leri MUTLAK CDN adresleridir; bunları rewrite ETMEYİZ
→ son kullanıcının tarayıcısı (residential IP) segmentleri doğrudan CDN'den çeker,
böylece datacenter IP engeli devreye girmez. Yalnız göreli URL'ler FEATURED_SEGMENT_BASE
ile mutlaklaştırılır.

Endpointler:
  * /api/featured/status      → kaynak canlı mı? (yeşil/turuncu LED) — 30sn cache
  * /api/featured/stream.m3u8 → manifest proxy (CORS + göreli→mutlak)
"""
import logging
import os
import asyncio
import httpx
from curl_cffi import requests as cffi_requests
from time import time
from urllib.parse import urljoin, quote
from fastapi import APIRouter, HTTPException, Response

logger = logging.getLogger("banbansports.featured")
router = APIRouter(prefix="/api/featured", tags=["featured"])

_TIMEOUT = 15.0
_STATUS_CACHE = {"at": 0.0, "live": False}
_STATUS_TTL = 30.0
_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")


def _cfg():
    return {
        "source": os.environ.get("FEATURED_SOURCE_URL", "").strip(),
        "channel": os.environ.get("FEATURED_CHANNEL", "bein1").strip(),
        "name": os.environ.get("FEATURED_NAME", "").strip(),
        "seg_base": os.environ.get("FEATURED_SEGMENT_BASE", "").strip(),
    }


async def _fetch(url: str):
    # Kaynak Cloudflare arkasında (tünel = orange cloud). Düz httpx bazen bot
    # challenge (HTML) yiyor; curl_cffi impersonate gerçek Chrome TLS parmak izi
    # ile bunu güvenilir şekilde geçer. Sync olduğu için thread'e alıyoruz.
    def _do():
        return cffi_requests.get(url, headers={"User-Agent": _UA, "Accept": "*/*"},
                                 impersonate="chrome120", timeout=_TIMEOUT)
    return await asyncio.to_thread(_do)


@router.get("/status")
async def status():
    cfg = _cfg()
    default_name = {"bein1": "beIN SPORTS 1", "ssport": "S SPORT", "trt1": "TRT 1",
                    "tv8": "TV 8", "trtspor": "TRT SPOR"}.get(cfg["channel"], cfg["channel"].upper())
    base = {"channel": cfg["channel"], "name": cfg["name"] or default_name,
            "configured": bool(cfg["source"])}
    if not cfg["source"]:
        return {**base, "live": False}
    now = time()
    if (now - _STATUS_CACHE["at"]) < _STATUS_TTL:
        return {**base, "live": _STATUS_CACHE["live"], "cached": True}
    live = False
    try:
        r = await _fetch(cfg["source"])
        live = r.status_code == 200 and r.text.lstrip().startswith("#EXTM3U")
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
    try:
        r = await _fetch(cfg["source"])
        if r.status_code != 200 or not r.text.lstrip().startswith("#EXTM3U"):
            raise HTTPException(status_code=502, detail="Kaynak yayın erişilemez")
        seg_base = cfg["seg_base"] or (cfg["source"].rsplit("/", 1)[0] + "/")
        out = []
        for line in r.text.split("\n"):
            s = line.strip()
            if not s or s.startswith("#"):
                out.append(line)
                continue
            # Segment URL'sini MUTLAKLAŞTIR, sonra BACKEND proxy'sine sar.
            # Böylece tarayıcı segmenti bizim üzerimizden çeker → istemcinin
            # stream.lenstedreal.xyz'yi çözebilmesi GEREKMEZ (short.io/DNS sorunu biter).
            abs_url = s if s.startswith("http") else urljoin(seg_base, s)
            out.append(f"/api/featured/seg?u={quote(abs_url, safe='')}")
        return Response(content="\n".join(out),
                        media_type="application/vnd.apple.mpegurl",
                        headers={"Access-Control-Allow-Origin": "*",
                                 "Cache-Control": "no-cache, no-store, must-revalidate"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Fetch failed: {e}")


@router.get("/seg")
async def seg(u: str):
    """Segment proxy — tarayıcı yerine backend segmenti çeker (DNS/CORS bağımsız)."""
    if not u:
        raise HTTPException(status_code=400, detail="segment yok")
    try:
        r = await _fetch(u)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"segment {r.status_code}")
        return Response(content=r.content,
                        media_type="video/mp2t",
                        headers={"Access-Control-Allow-Origin": "*",
                                 "Cache-Control": "no-cache"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"segment fetch failed: {e}")

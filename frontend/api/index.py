"""
Vercel Serverless entry point — slim version.

Yalnızca HTTP-only router'ları (scores, match_stats, streams, channels, bein,
ssport, stream_generic, internal) varsayılan olarak yükler. Ağır AI/DB
router'ları yalnızca dependency + env var hazırsa eklenir.

ÖNEMLİ — Import-time crash koruması:
- `_backend_app.core.config` modülü `JWT_SECRET` ve `ADMIN_PASSWORD` env vars
  yoksa `RuntimeError` fırlatır. Vercel'de bu env'ler set edilmemişse tüm API
  500 döner (en küçük endpoint dahil). Bunu engellemek için config import
  EDİLMEDEN önce güvenli placeholder set ediliyor (auth feature'ı runtime'da
  zaten devre dışı kalır).
- `database.py` modül üstünde `motor` import eder; `motor` paketi yoksa import
  zinciri patlar. Bu nedenle slim deploy'da bile `frontend/requirements.txt`
  içinde `motor`+`pymongo` bulunmalıdır.
"""
import sys
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# --- Import-time crash koruması (config _required guard'ları) ---
# Not: setdefault yalnızca env unset için çalışır; Vercel'de bazen boş string set
# edilmiş olabilir → açıkça kontrol et + set et.
if not os.environ.get("JWT_SECRET", "").strip():
    os.environ["JWT_SECRET"] = "vercel-slim-no-auth-placeholder"
if not os.environ.get("ADMIN_PASSWORD", "").strip():
    os.environ["ADMIN_PASSWORD"] = "vercel-slim-no-auth-placeholder"

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

app = FastAPI(title="banbansports", version="4.1-vercel-slim")


@app.get("/api/")
async def root():
    return {"message": "banbansports v4 — API ready (Vercel slim)", "version": "4.1-vercel-slim"}


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "runtime": "vercel-serverless",
        "version": "4.1-vercel-slim",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# --- Core router'lar (her biri ayrı try/except — bir router patlasa diğerleri yaşar) ---
def _safe_include(import_path: str, attr: str = "router") -> None:
    """Tek bir router'ı güvenle yükler. Hata olursa log atar, app çökmez."""
    try:
        mod = __import__(import_path, fromlist=[attr])
        app.include_router(getattr(mod, attr))
    except Exception as e:  # pragma: no cover — defensive
        import logging
        logging.getLogger("vercel-slim").warning("Router %s yüklenemedi: %s", import_path, e)


for _path in (
    "_backend_app.routers.scores",
    "_backend_app.routers.match_stats",
    "_backend_app.routers.streams",
    "_backend_app.routers.channels",
    "_backend_app.routers.bein",
    "_backend_app.routers.ssport",
    "_backend_app.routers.stream_generic",  # multi-kanal token+tms proxy (TRT, TV8, S Sport, Tivibu)
    "_backend_app.routers.internal",        # Vercel Cron endpoints
):
    _safe_include(_path)

# stream_registry._bootstrap() — generic kanal handler'larını kaydet
try:
    from _backend_app.services import stream_registry  # type: ignore
    stream_registry._bootstrap()
except Exception as e:  # pragma: no cover
    import logging
    logging.getLogger("vercel-slim").warning("stream_registry bootstrap atlandı: %s", e)


# --- Optional: DB-backed router'lar (yalnızca MONGO_URL gerçek mongo ise) ---
if os.environ.get("MONGO_URL", "").startswith("mongodb"):
    for _path in (
        "_backend_app.routers.auth",
        "_backend_app.routers.predictions",
        "_backend_app.routers.chat",
        "_backend_app.routers.notifications",
        "_backend_app.routers.push",
        "_backend_app.routers.admin",
    ):
        _safe_include(_path)

# --- Optional: AI predict (en az 1 provider key + lib varsa) ---
if any(os.environ.get(k) for k in ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY")):
    _safe_include("_backend_app.routers.ai_predict")


# CORS — same-origin on Vercel (frontend + api share domain), wildcard fine
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

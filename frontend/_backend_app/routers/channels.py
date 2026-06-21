"""Channel listing — static catalogue.

Her kanalın `logo` alanı opsiyonel — frontend logo path veya null kabul eder.
Logolar /public/logos/channels/ altında dururlar (yoksa frontend fallback üretir).
"""
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["channels"])


@router.get("/channels")
async def get_channels():
    return {
        "tivibuspor": {"name": "TİVİBU SPOR",   "status": "online",      "logo": "/logos/channels/tivibuspor.png"},
        "trtspor":    {"name": "TRT SPOR",      "status": "maintenance", "logo": "/logos/channels/trtspor.png"},
        "trthaber":   {"name": "TRT HABER",     "status": "online",      "logo": "/logos/channels/trthaber.png"},
        "tv8":        {"name": "TV 8",          "status": "online",      "logo": "/logos/channels/tv8.png"},
        "bein1":      {"name": "beIN SPORTS 1", "status": "maintenance", "logo": "/logos/channels/bein1.png", "premium": True},
        "ssport":     {"name": "S SPORT",       "status": "maintenance", "logo": "/logos/channels/ssport.png", "premium": True},
        "atv":        {"name": "ATV",           "status": "maintenance", "logo": "/logos/channels/atv.png"},
    }

"""Korumalı yayın erişimi — 30 dk geçerli Signed Token (üyelik DEĞİLDİR)."""
import time

import jwt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.config import JWT_SECRET, JWT_ALGORITHM

router = APIRouter(prefix="/api/stream-auth", tags=["stream-auth"])

ACCESS_USER = "lenstedreal_marka"
ACCESS_PASS = "zirvedeyiz"
TOKEN_TTL = 30 * 60  # 30 dakika
SOURCES = ("dub", "sub")


class LoginBody(BaseModel):
    username: str
    password: str


def _make_token(source: str) -> str:
    return jwt.encode(
        {"src": source, "scope": "hls", "iat": int(time.time()), "exp": int(time.time()) + TOKEN_TTL},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


@router.post("/login")
async def login(body: LoginBody):
    """Korumalı yayına erişim doğrulaması — her iki kaynak için ayrı token üretir."""
    if body.username.strip() != ACCESS_USER or body.password.strip() != ACCESS_PASS:
        raise HTTPException(status_code=401, detail="Geçersiz erişim bilgileri")
    return {
        "ok": True,
        "token_dub": _make_token("dub"),
        "token_sub": _make_token("sub"),
        "expires_in": TOKEN_TTL,
    }


@router.get("/validate")
async def validate(token: str, source: str = ""):
    """Origin/CDN entegrasyonu için token doğrulama (m3u8 + tüm segmentler)."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=403, detail="token geçersiz veya süresi dolmuş")
    if payload.get("scope") != "hls" or payload.get("src") not in SOURCES:
        raise HTTPException(status_code=403, detail="token kapsamı geçersiz")
    if source and payload.get("src") != source:
        raise HTTPException(status_code=403, detail="kaynak uyuşmazlığı")
    return {"ok": True, "src": payload["src"], "exp": payload["exp"]}

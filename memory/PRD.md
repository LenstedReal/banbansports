# BanbanSports — Stream Token V2.1 (PRD)

## Problem
`?token=` JWT tabanlı m3u8/segment koruması → Access JWT / Refresh cookie / HLS HMAC / Cast token ayrımı. WAF, Turnstile, Basic Auth, site gate aynen kalır.

## Mimari
- Backend FastAPI (`backend/app`, Vercel'de `frontend/_backend_app` aynası — rsync ile senkron tutulur)
- `app/core/stream_tokens.py`: Access JWT (30 dk), HLS HMAC (js 30 dk / native 3 s / srv 5 dk), Cast imzası
- `app/routers/stream_auth.py`: /config /login /refresh /logout /status /url /start /heartbeat /stop /cast-token /validate(dev)
- DB: stream_sessions (TTL 6h), stream_refresh_tokens (sha256, rotation 45 sn grace, replay→family revoke), stream_activity (lease TTL 90 sn)
- Worker `cloudflare/worker/src/index.js`: sig→HMAC | token→legacy JWT (ALLOW_LEGACY_JWT) | Basic; m3u8 rewrite; caches.default segment cache; WORKER_ENFORCE shadow/enforce
- Frontend `lib/streamAuth.ts` + `components/MoviePlayer.tsx`: sessiz refresh, /url, lease heartbeat 45 sn, native mode, Cast loadMedia
- featured.py: HMAC (m=srv) ile korumalı kaynak, seg host allowlist, cache TTL/anahtar düzeltmesi

## Yapılanlar (2026-06)
- Faz 1–5 kodu tamam; Worker lokal testleri (32) geçti; backend akışı curl ile doğrulandı.
- Prod'da aktif olması için: Vercel env (STREAM_TOKEN_SECRET, STREAM_CAST_SECRET, STREAM_MAX_CONCURRENT) + Worker secret + deploy (bkz. cloudflare/KURULUM.md V2.1).

## Backlog
- P0: Yeni Worker deploy → shadow izleme → enforce → legacy kapatma
- P1: testing_agent ile tarayıcı e2e (kullanıcı isteğiyle ertelendi)
- P2: `index.nocomment.js` yeniden üretimi; ikinci içerik için host/bucket eşlemesi

# banbansports — PRD / Durum

## Problem
Mevcut Next.js + FastAPI spor yayın sitesine (banbansports) güvenlik katmanı eklemek: Cloudflare Turnstile, 30 dk HS256 JWT, Cloudflare Worker ile HLS (m3u8 + segment) koruması, Basic Auth harici istemci bariyeri, site giriş kapısı; efekt-odaklı tasarım dokunuşu; kanal listesini genişletme; takım logosu eşleşme düzeltmeleri.

## Mimari
- Frontend: Next.js 15 (`/app/frontend`), HLS.js, MoviePlayer (ikincil player), SiteGate, TurnstileWidget
- Backend: FastAPI (`/app/backend/app`, Vercel için `/app/frontend/_backend_app` kopyası — her değişiklikte senkron)
- CDN: Cloudflare Worker `banbansports-hls-guard` (deploy edildi) → R2 binding `banban-stream` / `banban-stream1`
- Sırlar: `STREAM_JWT_SECRET` (backend + Worker aynı), `TURNSTILE_SECRET_KEY`

## Yapılanlar (2026-09-18)
- stream_auth: Turnstile siteverify (fail-closed), rate limit, `/config`, `/refresh`, `/validate`, ayrı STREAM_JWT_SECRET
- site_gate: site açılışında Turnstile kapısı (12 sa HttpOnly çerez)
- MoviePlayer: Turnstile widget, xhrSetup ile her segment isteğine token, sessiz yenileme, sınırlı preload (20 s / 40 MB)
- Worker: HS256 doğrulama, m3u8 rewrite, 401 Basic → 403 sıralaması, host↔kaynak eşleşmesi, CORS; 13/13 lokal test + 8/8 canlı test geçti
- featured proxy: korumalı hosta Bearer JWT ile erişim
- Tasarım: neon-touch.css, cinema-v3.css (kompakt gişe/film), gate.css, yasal metin tek akış, FPS cam
- Kanallar: 21 doğrudan HLS kanalı eklendi (DirectStreamManager) → toplam 27
- Logo eşleşme: alias + ön-ek/son-ek fallback (footy.ts)
- Canlı veri uçlarında `Cache-Control: no-store`
- Doküman: `/app/cloudflare/KURULUM.md`

## Backlog
- P1: Gerçek Turnstile anahtarlarıyla canlı doğrulama (Vercel env sonrası)
- P1: Kanal logoları (yeni 21 kanal için PNG)
- P2: Kalan eşleşmeyen alt lig takım logoları (veri seti yok)
- P2: nowtv kaynağı aralıklı 502 (yedek URL gerekiyor)

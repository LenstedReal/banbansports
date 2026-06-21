# banbansports v4.1 — PRD

## Orijinal sorun
- Eski repo (banban-merged-v3) çalışıyor ama tasarım berbat.
- Yeni repo (banbansports) tasarım kusursuz **AMA Vercel'de TÜM /api/* 500 dönüyor**.
- Birleştirme: yeni tasarımı koru, sadece kırık kısımları düzelt. Hiçbir emergent kalıntısı bırakma.

## Mimari (KORUNDU — mantığa dokunulmadı)
- **Frontend**: Next.js 15.5.18 + React 19 + TypeScript + Tailwind (App Router)
- **Backend**: FastAPI + Motor (async MongoDB) + JWT auth + WebSocket
- **Vercel**: `frontend/api/index.py` slim Python serverless function
- **Pod**: `backend/server.py` shim → `app.main:app`

## Kırık olan ve düzeltilen kısımlar
1. **`frontend/requirements.txt`** — `motor`, `pymongo`, `bcrypt`, `pyjwt` EKSİKTİ. `_backend_app/core/database.py` modül üstünde `motor` import eder → Vercel slim deploy import-time'da `ModuleNotFoundError`. Eklendi.
2. **`frontend/api/index.py`** — `_required('JWT_SECRET')` / `_required('ADMIN_PASSWORD')` Vercel env yoksa RuntimeError fırlatıyordu. Config import edilmeden önce placeholder set ediliyor (runtime'da auth feature'ı zaten devre dışı).
3. **`frontend/api/index.py`** — `stream_generic` router'ı dahil DEĞİLDİ. VideoPlayer `/api/stream/{ch}/stream.m3u8` çağırıyor → 404. Eklendi + `stream_registry._bootstrap()` çağrısı eklendi.
4. **`frontend/api/index.py`** — Bir router patlasa tüm app çöküyordu. `_safe_include()` helper ile her router try/except'e alındı.
5. **`frontend/_backend_app/`** — `channels.py` + `stream_registry.py` `backend/app/`'tan 3 fark içeriyordu (tivibuspor vs trt1 host swap, TRT haber endpoint). Sync edildi.
6. **Emergent kalıntı temizliği** — `.emergent/`, `.gitconfig`, eski `test_reports/`, `test_result.md` silindi. Kodda zero emergent referansı.
7. **Pod entry shim** — `backend/server.py` oluşturuldu (supervisor `uvicorn server:app` bekliyor).
8. **`.env` dosyaları** — `backend/.env` (JWT_SECRET, ADMIN_PASSWORD, MONGO_URL, CORS) + `frontend/.env` (REACT_APP_BACKEND_URL, NEXT_PUBLIC_BACKEND_URL) oluşturuldu.

## Test sonuçları
- ✅ `/api/health` → `{"status":"ok","mongo":true,"version":"4.0"}`
- ✅ `/api/scores/top?n=3` → BELÇİKA vs İRAN, İSPANYA vs SUUDİ ARABİSTAN, URUGUAY vs YEŞİL BURUN
- ✅ `/api/livescore/today` → 68 stage (lig/turnuva)
- ✅ `/api/channels` → 8 kanal, yeni mantık (tivibuspor + TRT1 st15)
- ✅ Vercel slim simülasyon (JWT_SECRET unset) → 33 route hatasız yüklendi
- ✅ Frontend SSR → HTTP 200, Peaky splash + neon UI + scoreboard + matchcenter + 14 filtre + 5 maç kartı + FPS counter görsel doğrulandı

## Stream tokens (kullanıcı tarafından sağlandı, backend/.env'de)
- TRT1, TV8, SSport, TRT Spor, TRT Haber → CONFIGURED + token valid (health: ok:true)
- m3u8 master proxy 200 dönüyor, segment'ler /api/stream/{ch}/seg.ts üzerinden CORS-safe akıyor
- Tivibu Spor → TIVIBUSPOR_TOKEN verilmedi, maintenance görünür (kullanıcı isterse sonra ekler)
- beIN 1 → ST11_TOKEN verilmedi, maintenance

## VERCEL DEPLOY için TODO (kullanıcı tarafında)
1. **Vercel Dashboard → Settings → Environment Variables** ekle:
   - `JWT_SECRET` = (rastgele 32-byte hex)
   - `ADMIN_PASSWORD` = (güçlü password)
   - `ADMIN_EMAIL` = `admin@banbansports.vercel.app`
   - `CRON_SECRET` = (rastgele hex — cron için)
   - `SSPORT_TOKEN`, `TRT1_TOKEN`, `TV8_TOKEN`, `TIVIBUSPOR_TOKEN`, `TRTSPOR_TOKEN`, `TRTSPOR_SID` — st15.lol token'ları
   - `MONGO_URL` = MongoDB Atlas URI (opsiyonel — yoksa DB-features kapalı kalır)
   - `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` (opsiyonel — yoksa AI predict kapalı)
2. **Cron**: `vercel.json` her gece 00:00 UTC `/api/internal/refresh-all` çağırıyor → token'ları yeniler. `CRON_SECRET` mutlaka set olmalı.
3. **Git push**: `Save to GitHub` özelliği ile push et → Vercel otomatik build alır.

## Backlog (P1/P2)
- [ ] Vercel'de gerçek smoke test (kullanıcı env'leri ekledikten sonra)
- [ ] `_backend_app/` ile `backend/app/` arasında drift monitor (CI check)
- [ ] Long-running loop'lar (score_broadcast, settle_loop) için Vercel'de cron-based replacement

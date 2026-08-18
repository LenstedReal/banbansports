# banbansports — KAPSAMLI REPO ANALİZİ & FORK OTURUMUNA DEVİR NOTU

> Kaynak: https://github.com/LenstedReal/banbansports · Canlı: https://banbansports.vercel.app
> Analiz tarihi: 2026-08 · Bu doküman, yeni (fork) oturumun körü körüne değil, **sistemin gerçek durumunu bilerek** çalışması için hazırlandı.
> Not: Git geçmişi platformca 3 "Auto-generated" commit'e sıkıştırılmış → gün-gün geliştirme izi yok. Aşağıdaki bulgular **kodun satır-satır analizinden** çıkarıldı.

---

## 0. TL;DR — EN KRİTİK 8 BULGU

1. **Backend 3 KEZ var, ve senkron değiller.** `backend/app/` (dev, tam), `frontend/_backend_app/` (Vercel mirror, eksik), `frontend/api/index.py` (Vercel gerçek entry, "slim"). Aralarında router farkları var → prod'da bazı özellikler sessizce kayıp.
2. **`.env` commit'lenmemiş (gitignore).** `config.py` `JWT_SECRET` ve `ADMIN_PASSWORD` yoksa **import-time RuntimeError** fırlatır → fork ortamında **backend hiç başlamaz**. Fork'ta İLK İŞ env kurmak.
3. **WebSocket canlı skor (`ws` router) Vercel'de YOK** (serverless WS desteklemez). Prod'da real-time WS çalışmaz; sadece polling.
4. **Auth / chat / notifications / push / admin / predictions Vercel'de yalnızca `MONGO_URL` gerçek mongo ise yükleniyor.** Mongo yoksa bu özellikler prod'da tamamen kapalı.
5. **`stream_auth` (korumalı film girişi) prod'da mount edilmiyor** — ne `_backend_app/main.py`'de ne de `api/index.py`'de var → film kilidi/giriş Vercel'de **kırık**.
6. **Hardcoded gizli bilgi:** `stream_auth.py:12-13` → `ACCESS_USER="lenstedreal_marka"`, `ACCESS_PASS="zirvedeyiz"`. Repo public → sızmış sır. (redesign kapsamında değil ama not düşülmeli.)
7. **Canlı yayınlar (beIN/S Sport/TRT/TV8) tümüyle env token'larına bağlı** (`ST11_TOKEN`, `SSPORT_*`, `$ENV:*`). Bu değerler olmadan yayınlar oynamaz — fresh ortamda yayın alanı boş/maintenance görünür.
8. **AI tahmini doğrudan SDK + ayrı API key'ler istiyor** (OpenAI gpt-5.2, Anthropic claude-sonnet-4-5, Gemini 3 Pro) — Emergent LLM key kullanmıyor. Key yoksa `available:false`. Ayrıca frontend↔backend model-etiketi uyuşmazlığı var (bkz. §4).

---

## 1. MİMARİ

- **Frontend:** Next.js 15.5 (App Router) + React 19 RC + Tailwind 3.4. Stil ağırlıkla tek dosyada: `app/globals.css` (**3438 satır**, monolitik). Bileşenlerde bol inline style.
- **Backend:** FastAPI, modüler (`core/`, `services/`, `routers/`). Motor (MongoDB), httpx, curl_cffi (scraping), pyjwt, bcrypt, openai/anthropic/google SDK.
- **Deploy:** Vercel. `vercel.json` → `/api/*` `api/index.py`'ye (Python serverless, `maxDuration 30`, region fra1). Frontend `next dev` script'iyle çalışıyor (build `next build`).
- **Yerel/Emergent runtime:** `backend/app/main.py` (lifespan + background loops + tüm router'lar) — Vercel'de KULLANILMAZ.

### 1.1 Üç backend kopyasının farkları (senkron riski)
| | `backend/app/main.py` | `frontend/_backend_app/main.py` | `frontend/api/index.py` (Vercel gerçek) |
|---|---|---|---|
| Giriş noktası | dev/emergent | (mirror, muhtemelen kullanılmıyor) | **prod** |
| `stream_auth` router | ✅ | ❌ yok | ❌ yok |
| `boxoffice.refresh_loop()` | ✅ | ❌ | (loop yok, lazy refresh var) |
| `ws` (WebSocket) | ✅ | ✅ | ❌ (serverless) |
| `sponsors` router | ✅ | ✅ | ❌ mount edilmiyor |
| DB router'lar (auth/chat/…) | ✅ | ✅ | ⚠️ sadece MONGO_URL=mongodb… ise |
| ai_predict | ✅ | ✅ | ⚠️ sadece provider key varsa |
| `boxoffice.py`, `movies.py` | (base) | **içerik farklı** | — |

➡️ **Devir notu:** redesign sırasında backend'e dokunulmayacak; ama bu üçlemenin farkında ol. Bir backend değişikliği gerekirse **üç yerde de** yapılmalı (özellikle `backend/app` ↔ `_backend_app` ↔ `api/index.py` router listesi).

---

## 2. ÖZELLİK ENVANTERİ & DURUM

Durum etiketleri: ✅ çalışıyor · 🟡 env/anahtar bağımlı · 🔴 prod'da kırık/eksik · 🧩 kısmi/placeholder

| Özellik | Dosya(lar) | Durum | Not |
|---|---|---|---|
| Canlı skor — bugünün maçları | `routers/scores.py`, `services/livescore.py`, `MatchCenter.tsx`, `MatchBanner.tsx` | ✅ | Fotmob/livescore kaynaklı, polling (30/60s). Lig filtre + slug + pagination mantığı sağlam. |
| Real-time skor push (WS) | `routers/ws.py`, `services/ws_manager.py` | 🔴 (Vercel) / ✅ (dev) | Vercel serverless WS yok → prod'da polling'e düşer. |
| Maç detay + istatistik | `app/match/[id]`, `routers/match_stats.py` (585 satır), `MatchStatsModal.tsx` | ✅ | `MatchStatsModal.tsx:68` "deprecated route" notu — login varsa kullanılıyor. |
| Canlı TV yayını (beIN ST11) | `routers/bein.py`, `services/st11.py`, `stream_registry` | 🟡 | `ST11_TOKEN/ST11_TMS` env şart; yoksa yayın yok. HLS proxy `streams.py` üzerinden. |
| S Sport yayını (ST15) | `routers/ssport.py`, `services/st15.py` | 🟡 | `SSPORT_EMAIL/PASSWORD` veya `STREAM_TOKEN/TMS` şart. |
| Generic kanal proxy (TRT/TV8/Tivibu) | `routers/stream_generic.py`, `stream_registry._bootstrap()` | 🟡 | `$ENV:*` placeholder'lar (ör. `$ENV:TRTSPOR_SID`) runtime'da çözülür; env yoksa çalışmaz. |
| HLS proxy + segment rewrite | `routers/streams.py` | ✅ | SSRF allowlist var (§5). "Bug #1" (kalite dropdown) düzeltilmiş. |
| Korumalı film girişi (signed token) | `routers/stream_auth.py`, `MoviePlayer.tsx` lock | 🔴 | Prod'da router mount edilmiyor + hardcoded şifre. |
| Film oynatıcı (HLS) | `routers/movies.py`, `MoviePlayer.tsx` (834), `VideoPlayer.tsx` (2057) | 🟡 | Tek seed film (Spider-Man). Stream: `stream.lenstedreal.xyz` (kullanıcı CDN'i) — canlılığı harici. |
| Canlı gişe / box office | `routers/boxoffice.py` (798), `BoxOfficeCounter.tsx` (273) | ✅🟡 | **Gerçek scraping**: Box Office Mojo + IMDb dataset + TradingView FX + doviz/btcturk/paribu fallback + Mongo snapshot + static seed. Scraping bloklanırsa seed'e düşer. |
| AI maç tahmini (3-model harman) | `routers/ai_predict.py`, `services/ai_predictor.py` (389), `AIPrediction.tsx` | 🟡🐞 | `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`/`GEMINI_API_KEY` şart. Frontend↔backend model-etiketi uyuşmazlığı (§4). |
| Kullanıcı tahminleri + puanlama | `routers/predictions.py` (218), `services/settlement.py` (167) | 🟡 | Mongo + auth şart. 5dk'lık settle döngüsü (dev'de). |
| Auth (JWT cookie + Google) | `routers/auth.py` (260), `AuthProvider.tsx`, `AuthButton.tsx` | 🟡 | register/login/google/me/refresh/logout + seed_admin. Google opsiyonel (`GOOGLE_CLIENT_ID`). Prod'da Mongo+env şart. |
| Sohbet | `routers/chat.py` (222) | 🟡🔴 | Mongo+auth şart; Vercel'de WS/DB yoksa kısıtlı. `CHAT_PLACEHOLDER_*` i18n mevcut. |
| Bildirim (tarayıcı) | `Header.tsx`, `NotificationCenter.tsx`, `routers/notifications.py` | ✅🧩 | Notification API toggle çalışır; backend sadece **log** tutar. |
| Web Push (VAPID) | `routers/push.py` (133), `PushPrompt.tsx`, `sw.js` | 🟡🧩 | `VAPID_PUBLIC_KEY/PRIVATE_KEY` + `pywebpush` şart. **pywebpush requirements'ta YOK** → `send` çalışmaz. MVP: sadece subscription saklıyor. |
| Admin panel | `app/admin`, `routers/admin.py` (214) | 🟡 | admin rolü + Mongo şart. |
| Sponsor tıklama sayacı | `routers/sponsors.py`, `Sponsors.tsx` (255) | 🟡🔴 | Sadece click sayar (Mongo). **Vercel entry'de mount edilmiyor** → `/api/sponsors/click` prod'da 404. Sponsor logoları statik. |
| Reklam alanları | `SponsorBanner.tsx`, `OkeyBanner.tsx`, `ModelShowcase.tsx`, `public/ads/*` | ✅ | Statik medya + linkler. |
| PWA / Service Worker | `public/sw.js`, `SwRegister.tsx`, `manifest.json` | ✅ | Cache + push receiver. |
| FPS sayaç | `FpsCounter.tsx`, `lib/fps.ts` | ✅ | Dekoratif. |
| Cron (token refresh, settle) | `routers/internal.py` | 🟡 | `CRON_SECRET` şart; Vercel Cron tetikler. |

---

## 3. "EKLENMİŞ AMA ÇALIŞMAYAN / PROD'DA KIRIK" LİSTESİ (öncelik sırası)

1. 🔴 **`stream_auth` prod'da yok** → korumalı film girişi (MoviePlayer lock) Vercel'de kırık. Çözüm: `api/index.py` + `_backend_app/main.py`'ye router ekle; hardcoded creds'i env'e taşı.
2. 🔴 **`sponsors` router Vercel entry'de yok** → sponsor click sayacı prod'da 404. Çözüm: `api/index.py`'ye ekle.
3. 🔴 **WebSocket canlı skor Vercel'de imkânsız** → real-time yok, polling fallback. (Mimari sınır; SSE/polling ile telafi.)
4. 🔴 **DB-bağımlı özellikler (auth/chat/predictions/notifications/push/admin) Vercel'de MONGO_URL yoksa tümden kapalı.** Prod ortam değişkeni kontrol edilmeli.
5. 🟡🧩 **Web Push `send` çalışmaz** — `pywebpush` requirements'ta yok. Çözüm: requirements'a ekle + VAPID env.
6. 🐞 **AI model etiketi uyuşmazlığı** (§4) — kozmetik ama görünür.
7. 🟡 **Backend başlangıç kırılganlığı** — `JWT_SECRET`/`ADMIN_PASSWORD` yoksa **hiçbir endpoint çalışmaz** (import-time crash). Fork ortamında mutlaka set edilmeli.
8. 🟡 **`_backend_app` ↔ `backend/app` drift** (`boxoffice.py`, `movies.py` farklı; `stream_auth` eksik) → prod ile dev davranışı ayrışıyor.

---

## 4. HATA & TUTARSIZLIKLAR (satır referanslı)

- **AI model label mismatch:** `AIPrediction.tsx:32-36` `MODEL_LABEL` anahtarları `'gemini/gemini-3.1-pro-preview'`, `'openai/gpt-5.2'`, `'anthropic/claude-sonnet-4-5-20250929'`. Backend `ai_predictor.py:201` `_model = f"google/{GEMINI_MODEL}"` (`google/gemini-3-pro-preview`). Anahtar (`gemini/` vs `google/`, `3.1` vs `3`) uyuşmuyor → Gemini için etiket fallback'e düşer.
- **Hardcoded credentials:** `stream_auth.py:12-13`.
- **Font/token tutarsızlığı:** `globals.css :root` (Orbitron/VT323, `--cyan #00f0ff` …) ile `tailwind.config.js` (`Bebas Neue/Oswald/Rajdhani`, ayrı `bg` tonları) uyuşmuyor → iki ayrı tasarım sistemi.
- **globals.css teknik borcu:** 3438 satır, ~60+ "tek seferlik düzeltme" bloğu (ör. `/* === TURKCELL kucultme === */`, `/* === CROP HATA DÜZELTMELERİ === */`). Sürdürülemez; redesign'da design-token sistemine geçilmeli.
- **Zorlanmış viewport:** `layout.tsx:56-61` `width=980` + MutationObserver → mobil = küçültülmüş masaüstü. Gerçek responsive yok.
- **`_backend_app/main.py`** muhtemelen **dead code** (Vercel `api/index.py` kullanıyor). Kafa karışıklığı yaratır.

---

## 5. GÜVENLİK NOTLARI
- ✅ İyi: `streams.py` SSRF allowlist (`STREAM_PROXY_ALLOWED_HOSTS`), `internal.py` `CRON_SECRET` guard, JWT httpOnly cookie, CORS prod'da explicit origin şartı.
- 🔴 Hardcoded stream-auth creds (public repo → sızmış).
- 🟡 Vercel slim'de CORS `allow_origins=["*"]` — same-origin olduğu için düşük risk ama not.
- 🟡 `.env` gizli değerleri repo'da yok (doğru) ama bu yüzden bootstrap env listesi (§6) dışarıdan sağlanmalı.

---

## 6. ENV DEĞİŞKENLERİ — FORK BOOTSTRAP İÇİN ZORUNLU LİSTE
`config.py`'de `_required`: **JWT_SECRET**, **ADMIN_PASSWORD** (yoksa backend import-time çöker).
Opsiyonel ama özellik açar:
- `MONGO_URL`, `DB_NAME` (auth/chat/predictions/box-office snapshot/push)
- `ADMIN_EMAIL` (default `admin@banbansports.local`)
- `CORS_ORIGINS` (prod'da zorunlu — yoksa RuntimeError)
- `GOOGLE_CLIENT_ID` (Google login)
- Yayın: `ST11_TOKEN`, `ST11_TMS`, `SSPORT_EMAIL`, `SSPORT_PASSWORD`, `STREAM_TOKEN`, `STREAM_TMS`, `$ENV:TRTSPOR_SID` vb. generic kanal env'leri
- AI: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` (+ opsiyonel `*_MODEL` override)
- Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (+ `pywebpush`)
- Cron: `CRON_SECRET`
- `ENV=production|development`

➡️ **Öneri:** AI tahmini fork'ta çalışsın isteniyorsa, doğrudan SDK yerine **Emergent LLM key + emergentintegrations**'a taşınabilir (integration_expert ile). Bu, ayrı ayrı OpenAI/Anthropic/Gemini key ihtiyacını kaldırır. (Kullanıcı onayı gerekir — model seçimi kullanıcının.)

---

## 7. VERİ KAYNAKLARI — GERÇEK Mİ? (redesign'da korunacak)
- **Maçlar/skorlar:** GERÇEK (Fotmob/livescore). `livescore.py` (514), `fotmob_client.py`.
- **Box office / gişe / seyirci / IMDb / FX:** GERÇEK (scraping + dataset + FX API), Mongo snapshot + static seed fallback. Film metinleri (konu/credits) `boxoffice.py:78-96`'da **sabit, elle yazılmış** → **AI yeniden yazmayacak, aynen kullanılacak.**
- **Film kataloğu:** tek seed (`movies.py:17-33` Spider-Man), stream URL kullanıcı CDN'i.
- **Kanallar/yayınlar:** GERÇEK ama env-token bağımlı.
- **Sponsorlar/reklamlar:** statik asset + link.

➡️ Redesign kuralı: **bu içeriklerin hiçbiri yeniden üretilmez/uydurulmaz** (bkz. `redesign_plan.md §3, §8`).

---

## 8. FORK OTURUMU İÇİN ADIM ADIM PLAN

**ADIM 0 — Devir & doğrulama**
- Prototip görselini al (`get_assets_tool`) → `design_agent`'e ver.
- Repo kodunu bu ortama kur (şu an `/app` boş şablon). `backend/.env` oluştur: en az `JWT_SECRET`, `ADMIN_PASSWORD` (+ MONGO_URL/DB_NAME). Aksi halde backend başlamaz.
- `supervisorctl` ile backend+frontend ayağa kaldır. `/api/health` + ana sayfa baseline ekran görüntüsü. `test_credentials.md` güncelle (admin).

**ADIM 1 — Sağlık taraması (kırık olanı bilerek başla)**
- §3 listesini doğrula: hangi özellikler env eksikliğinden kapalı, hangileri gerçekten kırık. Kullanıcıya net söyle (yayın/AI/push key'leri olmadan bu alanlar demo/boş görünecek).

**ADIM 2 — Design system temeli** (bkz. `redesign_plan.md §2, FAZ 1`)
- Token'ları `tailwind.config.js` + `globals.css :root` içinde tekilleştir. Font pipeline. `components/ui/` primitive'leri.

**ADIM 3 — Bölüm bölüm redesign** (bkz. `redesign_plan.md §3, FAZ 2`)
- Header → MatchBanner → MatchCenter → Film(MoviePlayer+BoxOffice) → Kanal/Yayın → Reklam/Sponsor → access-notice → Footer → overlay → match/[id] → admin. Her adımda veri kaynağı korunur.

**ADIM 4 — Responsive IA** (`layout.tsx` viewport düzelt, mobil ayrı akış).

**ADIM 5 — Polish + QA** (`redesign_plan.md §22, FAZ 5`) → sonra `testing_agent`.

**ADIM 6 (opsiyonel, kullanıcı isterse) — Teknik borç/kırıkları düzelt:**
- `stream_auth` + `sponsors`'ı Vercel entry'ye ekle; 3 backend router listesini eşitle.
- Hardcoded stream-auth creds'i env'e taşı.
- AI model-etiketi uyuşmazlığını düzelt; istenirse AI'ı Emergent LLM key'e taşı.
- `pywebpush`'ı requirements'a ekle (push send için).

**ADIM 7 — CLOUDFLARE GÜVENLİK SERTLEŞTİRME (kullanıcının "ASLA SİLME" backlog'u — `PRD.md`'de kalıcı):**

**7A) Turnstile (kilit/şifre paneli bot koruması):**
- Kullanıcı Cloudflare'de Turnstile Site oluşturur (Managed mode), **Site Key + Secret Key** verir.
- Ajan: `MoviePlayer.tsx` kilit paneline Turnstile widget'ı ekler (Site Key gömülü). Backend `stream_auth.py` login'ine **`siteverify`** doğrulaması ekler → Turnstile token geçmeden **JWT ÜRETİLMEZ**. Secret Key `backend/.env`'e.
- Domain listesi: canlı alan adı + `*.preview.emergentagent.com`.

**7B) Cloudflare Workers (HLS token zorunluluğu — CDN tarafı):**
- Sorun: backend 30dk JWT üretiyor ama `stream.lenstedreal.xyz` tokensız da 200 → koruma CDN'de zorlanmıyor.
- Kullanıcı: `stream`/`stream1` DNS kayıtlarını **Proxied** yapar; Worker oluşturur; ajanın vereceği script'i yapıştırır; `JWT_SECRET` **Secret** var'ını backend `.env` ile AYNI değere set eder; route'lar: `stream.lenstedreal.xyz/*`, `stream1.lenstedreal.xyz/*`.
- Ajan: Worker script'ini üretir (her m3u8/segment isteğinde `?token=` JWT'sini HS256 ile doğrular; yoksa/geçersizse **403**). Frontend HLS URL'lerine token'ı ekler.
- Doğrulama: tokensız `curl .../stream.m3u8` → **403**; tokenlı → 200.

> Tam kurulum adımları `PRD.md` "⛔ ASLA SİLME" bölümünde kalıcı. Bu iki madde stream-auth (§3.1) kırığıyla birlikte, ADIM 6 sync fix'inin ardından ele alınır ve **testing_agent + curl (403/200)** ile uçtan uca doğrulanır.

⚠️ Redesign birincil hedef; ADIM 6-7 ayrı iş kalemleri — kullanıcı onayıyla ele alınır, redesign'ı bloklamaz.

---

## 9. DOSYA HARİTASI (redesign'da dokunulacak vs dokunulmayacak)
**Dokunulacak (UI):** `app/globals.css`, `tailwind.config.js`, `app/layout.tsx` (viewport), `app/page.tsx`, tüm `components/*.tsx` (görsel katman), yeni `components/ui/*`.
**DOKUNULMAYACAK (veri/işlev):** `lib/api.ts`, `lib/i18n.ts`, `lib/knownTeams.ts`, `lib/footy.ts`, `lib/footyIndex.json`, tüm `backend/**` + `frontend/_backend_app/**` + `frontend/api/index.py`, `public/**` assetler, `vercel.json`, `next.config.js` (rewrite/güvenlik header'ları).

---

## 10. GÜVENLİK — MEVCUT DURUM & BACKLOG (yeniden oluşturuldu)

> ⚠️ Kullanıcının "asla silme" dediği orijinal `memory/PRD.md` güvenlik backlog'u **GitHub repoda YOK** (`memory/` sadece `.gitkeep`; `test_credentials.md` gitignore satır 79). Fork oturumunda kullanıcıdan orijinal PRD istenmeli. Aşağıdaki liste koddan çıkarıldı.

### 10.1 Mevcut (✅ var, doğrulandı)
- bcrypt password hash (`core/security.py:8-16`)
- JWT access(24h)/refresh(30g), httpOnly cookie; prod'da `Secure` + `SameSite=None`, dev'de `Lax` (`auth.py:55-68`)
- Chat rate-limit (in-memory 5 msg/30sn) + kontrol-karakter temizliği + 300 char cap (`chat.py:28-44`)
- Stream proxy SSRF allowlist (`streams.py:12-43`)
- CRON_SECRET guard (`internal.py:24-32`)
- Güvenlik header'ları: X-Frame-Options, X-Content-Type-Options(nosniff), X-XSS-Protection, Referrer-Policy (`next.config.js:40-61`)
- CORS: prod'da explicit origin şartı (wildcard reddi) (`main.py:141-162`)

### 10.2 Backlog (🔴 eksik / zayıf — kullanıcı onayıyla ele alınır)
1. 🔴 **Login brute-force koruması YOK** — `auth.py` login'de deneme sayacı/lockout/429 yok. (öncelik: yüksek)
2. 🔴 **Global rate-limit YOK** — sadece chat'te var; auth/ai/predictions/stream endpoint'leri korumasız. (slowapi vb.)
3. 🔴 **In-memory rate-limit serverless'te etkisiz** — Vercel'de her instance ayrı bellek → chat limiti bypass edilebilir. (Redis/DB tabanlı gerekir.)
4. 🔴 **Hardcoded stream-auth creds** (`stream_auth.py:12-13`) → env'e taşınmalı.
5. 🟡 **CSRF koruması yok** — cookie-tabanlı auth + POST; `SameSite=None` (prod) CSRF yüzeyi açar. CSRF token / origin-check eklenebilir.
6. 🟡 **CSP (Content-Security-Policy) header yok** — XSS derinlik savunması zayıf.
7. 🟡 **Vercel slim CORS `["*"]`** — same-origin olduğundan düşük risk; yine de sıkılaştırılabilir.
8. 🟡 **Input validation limitleri** — bazı POST body'lerinde uzunluk/şekil sınırı yok.
9. 🟡 **Secrets rotation / .env yönetimi** — repo public; sızmış creds rotate edilmeli.

➡️ Bu backlog **redesign'dan bağımsız** bir güvenlik iş kalemi. Redesign'ı bloklamaz; fork'ta ayrı faz olarak, kullanıcının orijinal PRD'siyle birleştirilerek ele alınır.

---

## 11. KULLANICI BİLDİRİMİ — STREAM-AUTH PREVIEW HATASI (doğrulandı)
Kullanıcı: "şifre al mantığı çalışıyor ama preview tarayıcıda çalışmıyor." → §3.1 ile örtüşüyor.
**Kök neden adayları (fork'ta doğrulanacak):**
- `stream_auth` router Vercel/slim entry'de (`api/index.py`) ve `_backend_app/main.py`'de **mount edilmiyor** → preview/prod'da `/api/stream-auth/login` 404.
- Emergent preview `backend/app/main.py` kullanıyorsa router var; o zaman sorun frontend proxy/rewrite veya cookie/CORS (`SameSite=None+Secure` preview domaininde) kaynaklı olabilir.
**Fix (fork/uygulama oturumunda):** router'ı üç entry'de eşitle + creds'i env'e taşı → ardından **testing_agent ile doğrula** (bu planlama oturumunda düzeltme yapılmadı).

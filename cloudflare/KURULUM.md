# BANBANSPORTS — Cloudflare Güvenlik Kurulumu (Adım Adım)

Bu doküman kod dışında **Cloudflare panelinde / terminalde** yapman gereken her şeyi sırayla anlatır.
Sıra önemlidir. Toplam ~30 dk.

Mimari:
```
SITE (Vercel) → Cloudflare WAF / Managed Challenge ("ben robot değilim")
   → Film → Filmi İzle → 🔒 Korumalı İçerik → ID+Şifre → Turnstile → backend siteverify
   → 30 dk JWT → HLS.js (her m3u8 + .ts isteğine ?token=) → Cloudflare Worker (HS256 doğrula)
   → R2 → medya
Harici istemci (Chrome/VLC, tokensız) → Worker → 401 + WWW-Authenticate: Basic → popup
Yanlış/süresi dolmuş token → Worker → 403
```

---

## ADIM 0 — Gizli anahtarlar (hazır)

Backend `.env` için üretilen değerler (Vercel'e de gireceksin):

| Değişken | Değer |
|---|---|
| `STREAM_JWT_SECRET` | `16DzUXLbpqGM381vi9bR_ynG_usYMPKeltv2AoHcjdwHVyd6sObFQ6XeiERfWuCS` |
| `STREAM_ACCESS_USER` | `lenstedreal_marka` |
| `STREAM_ACCESS_PASS` | `zirvedeyiz` |

> `STREAM_JWT_SECRET` hem **backend (Vercel env)** hem **Worker secret** olarak AYNI girilecek. Admin `JWT_SECRET` ile bilerek ayrı tutuldu: Worker'a admin sırrı verilmez.

---

## ADIM 1 — Turnstile anahtarlarını al ("ben robot değilim" — player içi)

1. https://dash.cloudflare.com → sol menüden **Turnstile**.
2. **Add widget** (Widget ekle).
3. **Widget name:** `banbansports-player`
4. **Hostname management → Add hostnames:** şu ikisini ekle:
   - `banbansports.vercel.app`
   - `banban.lenstedreal.xyz` (site bu adresten açılıyorsa ŞART — yoksa Turnstile "hostname" hatası verir)
5. **Widget Mode:** **Managed** seç. ("Pre-clearance" kapalı kalsın.)
6. **Create** → ekranda iki değer çıkar:
   - **Site Key** (public) → `TURNSTILE_SITE_KEY`
   - **Secret Key** (gizli) → `TURNSTILE_SECRET_KEY`
7. Bu ikisini **Vercel → Project → Settings → Environment Variables** içine ekle (ADIM 2).

> Şu an projede Cloudflare'in resmi **test anahtarları** duruyor (`1x000…AA`); test anahtarı her zaman "geçer", canlıda mutlaka gerçek anahtarla değiştir. Gerçek anahtar, localhost'ta çalışmaz — sadece 4. adımda yazdığın hostlarda çalışır.

---

## ADIM 2 — Vercel ortam değişkenleri

Vercel → Project → **Settings → Environment Variables** → aşağıdakileri ekle (Production + Preview):

```
STREAM_JWT_SECRET=16DzUXLbpqGM381vi9bR_ynG_usYMPKeltv2AoHcjdwHVyd6sObFQ6XeiERfWuCS
STREAM_ACCESS_USER=lenstedreal_marka
STREAM_ACCESS_PASS=zirvedeyiz
TURNSTILE_SITE_KEY=<ADIM 1'deki Site Key>
TURNSTILE_SECRET_KEY=<ADIM 1'deki Secret Key>
```

Sonra **Deployments → ⋯ → Redeploy** (env değişikliği yeniden deploy ister).

Kontrol: `https://banbansports.vercel.app/api/stream-auth/config` → `{"turnstile_site_key":"0x4AAA…","token_ttl":1800}` dönmeli.

> ⚠️ Vercel env'lerini bu sohbette paylaştın (Mongo şifresi dahil). Güvenlik için Atlas kullanıcı şifresini ve `JWT_SECRET`'ı en kısa sürede **değiştirmeni** öneririm.

---

## ADIM 3 — Worker'ı deploy et (HLS'in gerçek koruması)

### 3-TELEFON — Bilgisayarsız, Cloudflare panelinden (ÖNERİLEN)

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**
2. İsim: `banbansports-hls-guard` → **Deploy** (önce boş "Hello World" deploy olur, sorun değil)
3. **Edit code** → editördeki her şeyi sil → `cloudflare/worker/src/index.js` dosyasının **tamamını** yapıştır → **Deploy**
4. Worker sayfası → **Settings → Variables and Secrets** → **Add**:
   | Tür | İsim | Değer |
   |---|---|---|
   | Secret | `STREAM_JWT_SECRET` | `16DzUXLbpqGM381vi9bR_ynG_usYMPKeltv2AoHcjdwHVyd6sObFQ6XeiERfWuCS` |
   | Secret | `BASIC_USER` | `lenstedreal_marka` |
   | Secret | `BASIC_PASS` | `zirvedeyiz` |
   | Text | `HOST_SRC_MAP` | `{"stream.lenstedreal.xyz":"dub","stream1.lenstedreal.xyz":"sub"}` |
   | Text | `ALLOWED_ORIGINS` | `https://banban.lenstedreal.xyz,https://banbansports.vercel.app` |
   Her birinden sonra **Deploy** / **Save and deploy**.
5. **Settings → Domains & Routes** → **Add** → **Route**:
   - Zone: `lenstedreal.xyz` · Route: `stream.lenstedreal.xyz/*` → Add
   - tekrar Add → Route: `stream1.lenstedreal.xyz/*` → Add
6. (Önerilen) **Settings → Bindings** → **Add** → **R2 bucket**:
   - Variable name `R2_DUB` → dublaj bucket'ını seç
   - Variable name `R2_SUB` → altyazı bucket'ını seç → Deploy
   Sonra R2 → her bucket → Settings → **r2.dev subdomain: Disable** (custom domain kalsın).
7. ADIM 5'teki testleri yap (Termux'ta `pkg install curl` ile aynı komutlar çalışır).

### 3-TERMUX — Alternatif (wrangler ile)
```bash
pkg install nodejs git
npm i -g wrangler
git clone https://github.com/LenstedReal/banbansports && cd banbansports/cloudflare/worker
wrangler login          # çıkan linki tarayıcıda aç, izin ver
wrangler secret put STREAM_JWT_SECRET
wrangler secret put BASIC_USER
wrangler secret put BASIC_PASS
wrangler deploy
```

### 3-BİLGİSAYAR — wrangler ile

Bilgisayarında (Node 18+ kurulu):

```bash
cd cloudflare/worker
npm i -g wrangler          # veya: yarn global add wrangler
wrangler login             # tarayıcı açılır, Cloudflare hesabına izin ver
```

`wrangler.toml` içinde kontrol et:
- `zone_name = "lenstedreal.xyz"` → domainin buysa aynen kalsın.
- `ALLOWED_ORIGINS` → sitenin adresleri (`https://banbansports.vercel.app` hazır).

Secret'ları gir (her komut değer ister, yapıştır + Enter):

```bash
wrangler secret put STREAM_JWT_SECRET     # → 16DzUXLbpqGM381vi9bR_ynG_usYMPKeltv2AoHcjdwHVyd6sObFQ6XeiERfWuCS
wrangler secret put BASIC_USER            # → lenstedreal_marka
wrangler secret put BASIC_PASS            # → zirvedeyiz
```

Deploy:

```bash
wrangler deploy
```

Çıktıda `stream.lenstedreal.xyz/*` ve `stream1.lenstedreal.xyz/*` route'larını görmelisin.

### 3b — R2 binding (ÖNERİLEN, bucket'ları public bırakmadan yayın)

1. Cloudflare → **R2** → bucket adlarını not al (dublaj bucket'ı ve altyazı bucket'ı).
2. `wrangler.toml` içinde `[[r2_buckets]]` bloklarının yorumunu kaldır, `bucket_name` değerlerini yaz.
3. `wrangler deploy` tekrar.
4. Artık R2 → bucket → **Settings → Public access**: **Custom domain'i bağlı bırak (DNS kaydı için gerekir)**, ama **"r2.dev subdomain"** erişimini **Disable** yap. Worker route hostname'in önünde olduğu için tüm istekler Worker'dan geçer; bucket'a tokensız/şifresiz ulaşan yol kalmaz.

> Binding kullanmazsan Worker origin'e (R2 custom domain) `fetch` ile gider; bu da çalışır ama r2.dev subdomain'i mutlaka kapat.

---

## ADIM 4 — DNS: turuncu bulut (Proxied)

Cloudflare → `lenstedreal.xyz` → **DNS → Records**:
- `stream` ve `stream1` kayıtlarında **Proxy status = Proxied (turuncu bulut)** olmalı. Gri ise tıkla → turuncu yap → Save.
- Route'lar yalnızca Proxied kayıtlarda çalışır.

---

## ADIM 5 — Doğrulama testleri (Worker canlıya alındıktan sonra)

```bash
# 1) Tokensız → 401 + Basic popup başlığı
curl -sI https://stream.lenstedreal.xyz/stream.m3u8 | head -3
#   HTTP/2 401
#   www-authenticate: Basic realm="banbansports korumali yayin"

# 2) Basic Auth ile → 200
curl -sI -u lenstedreal_marka:zirvedeyiz https://stream.lenstedreal.xyz/stream.m3u8 | head -1
#   HTTP/2 200

# 3) Bozuk token → 403
curl -sI "https://stream.lenstedreal.xyz/stream0.ts?token=bozuk" | head -1
#   HTTP/2 403

# 4) Segment de korumalı (tokensız .ts → 401)
curl -sI https://stream.lenstedreal.xyz/stream0.ts | head -1
#   HTTP/2 401

# 5) Geçerli token → 200 (token'ı siteden GİRİŞ YAP sonrası Network sekmesinden alabilirsin)
curl -sI "https://stream1.lenstedreal.xyz/stream.m3u8?token=<TOKEN_SUB>" | head -1
#   HTTP/2 200
# 6) Kaynak uyuşmazlığı: dub token'ı stream1'de → 403
```

Chrome'a `https://stream.lenstedreal.xyz/stream.m3u8` yazınca **Kullanıcı adı / Şifre** popup'ı çıkmalı. VLC'de aynı.

---

## ADIM 6 — Site girişinde "ben robot değilim" (İKİ KATMAN)

### 6.0 — Uygulama içi Turnstile kapısı (HAZIR — kod tarafında yapıldı)
Site açılırken tam ekran **"GÜVENLİK DOĞRULAMASI"** ekranı çıkar (Cloudflare Turnstile Managed).
Başarılı siteverify → 12 saat geçerli HttpOnly `bb_gate` çerezi → site açılır. Bu, `*.vercel.app`
adresinde de çalışır; ek Cloudflare ayarı gerekmez. Sadece ADIM 2'deki env'ler yeterlidir.
(Turnstile widget'ında hostname olarak `banbansports.vercel.app` ekli olmalı — ADIM 1.)

Kontrol: `https://banbansports.vercel.app/api/site-gate/status` → `{"ok":false,"enabled":true,...}` (çerezsiz).
`enabled:false` görüyorsan env eksik demektir; bu durumda kapı **devre dışı kalır ve site normal açılır** (site kilitlenmez).

### 6.1 — Cloudflare WAF / Managed Challenge (kendi domainin varsa, ek katman)

Bu koruma **sitenin domaini Cloudflare üzerinden proxy'lenirse** çalışır (`*.vercel.app` adresinde YAPILAMAZ; kendi domainin lazım).

**6a. Domaini Cloudflare'e bağla (henüz değilse)**
1. Cloudflare → **Add a site** → `banbansports.app` (kendi domainin) → Free plan.
2. Verilen 2 nameserver'ı domain sağlayıcında (GoDaddy/Namecheap/İsimtescil…) NS kaydı olarak gir.
3. Vercel → Project → **Settings → Domains** → domaini ekle; Vercel'in verdiği `CNAME cname.vercel-dns.com` (veya A 76.76.21.21) kaydını Cloudflare DNS'e **Proxied (turuncu)** olarak ekle.
4. Cloudflare → **SSL/TLS → Overview → Full (strict)** seç. (Aksi halde Vercel ile sonsuz yönlendirme olur.)

**6b. Managed Challenge kuralı**
1. Cloudflare → domain → **Security → WAF → Custom rules → Create rule**.
2. **Rule name:** `Site giris - Managed Challenge`
3. **Edit expression** (metin olarak yapıştır):
   ```
   (http.host in {"banbansports.app" "www.banbansports.app"} and not starts_with(http.request.uri.path, "/api/") and not starts_with(http.request.uri.path, "/_next/") and not starts_with(http.request.uri.path, "/icons/") and not starts_with(http.request.uri.path, "/logos/") and not starts_with(http.request.uri.path, "/ads/") and http.request.method eq "GET")
   ```
   (`/api/`, `/_next/` ve statik dosyalar hariç: fetch/XHR istekleri challenge sayfasını çözemez, sayfa açıldıktan sonra zaten `cf_clearance` çerezi ile geçer.)
4. **Choose action:** **Managed Challenge**.
5. **Deploy**.

**6c. (Opsiyonel, daha sert)** Security → **Bots → Bot Fight Mode: On**. Security → Settings → **Security Level: Medium/High**.

Sonuç: Ziyaretçi siteye ilk girişte Cloudflare'in "Bağlantınız kontrol ediliyor / ben robot değilim" ekranını görür; geçtikten sonra site açılır. Bu, **yayına erişim vermez** — yayın için player içindeki Turnstile + şifre + JWT ayrı katman olarak çalışır.

---

## Katman sırası (Worker) — neden çakışmaz?

| İstek | Sonuç |
|---|---|
| `?token=<geçerli>` | HS256 + exp + scope + host↔src kontrolü → **200**; m3u8 satırları `?token=` ile yeniden yazılır → segmentler de tokenlı |
| `?token=<bozuk/süresi dolmuş>` | **403 Forbidden** |
| dub token'ı `stream1` hostunda | **403** (kaynak uyuşmazlığı) |
| token yok + `Authorization: Basic` doğru | **200** (harici istemci) |
| token yok + Basic yok/yanlış | **401 + WWW-Authenticate: Basic** → tarayıcı/VLC popup |
| Preload istekleri | Aynı kurallara tabi (bypass yok) |

## Sorun giderme
- **Yayın 403 veriyor, siteye girişten sonra:** Worker secret `STREAM_JWT_SECRET` ile Vercel env'deki değer aynı mı? Saat farkı? (`exp` 30 dk.)
- **Site içinde CORS hatası:** `wrangler.toml → ALLOWED_ORIGINS` içine sitenin tam origin'ini ekle, `wrangler deploy`.
- **Turnstile "Doğrulama yükleniyor…" kalıyor:** `/api/stream-auth/config` boş site key dönüyor → Vercel env eksik. Ya da Turnstile widget hostname listesinde site yok.
- **Öne çıkan (beIN) yayını kesildi:** `FEATURED_SOURCE_URL` `stream.lenstedreal.xyz` üzerinde; backend artık kendi Bearer JWT'siyle çekiyor → Vercel'de `STREAM_JWT_SECRET` set olmalı.
- **Worker log:** `wrangler tail`.

---

## V2.1 — Stream Token (HMAC) geçişi

### Vercel → Environment Variables (EKLENECEK 3 yeni değer; mevcutlar aynen kalır)
| Değişken | Değer | Not |
|---|---|---|
| `STREAM_TOKEN_SECRET` | `b7f2c9d4e1a84f3b9c6d2e7a1f5b8c3d4e9a6f1b2c7d8e3f4a5b6c7d8e9f0a1b` | HLS m3u8/segment imzası — Worker ile AYNI |
| `STREAM_CAST_SECRET` | `c3e8a1f6b2d94c7e5a0f3b8d1c6e9a2f7b4d0c5e8a1f3b6d9c2e7a4f0b5d8c1e` | Chromecast media_url imzası — Worker ile AYNI |
| `STREAM_MAX_CONCURRENT` | `2` | Aynı tarayıcı (refresh family) başına eşzamanlı izleme |

`STREAM_VALIDATE_ENABLED` prod'a GİRİLMEZ (yalnızca dev; `/validate` prod'da 404).

### Worker → Settings → Variables and Secrets
| Tür | Ad | Değer |
|---|---|---|
| Secret | `STREAM_TOKEN_SECRET` | Vercel'deki ile aynı |
| Secret | `STREAM_CAST_SECRET` | Vercel'deki ile aynı |
| Secret | `STREAM_JWT_SECRET` | (mevcut, dokunulmaz) |
| Secret | `BASIC_USER` / `BASIC_PASS` | (mevcut, dokunulmaz) |
| Var | `WORKER_ENFORCE` | `false` → shadow (logla, servis et) · doğrulama sonrası `true` |
| Var | `ALLOW_LEGACY_JWT` | `true` → eski `?token=` yolu açık · V2.1 player yayında + 24 saat sorunsuzsa `false` |

```bash
cd cloudflare/worker
wrangler secret put STREAM_TOKEN_SECRET
wrangler secret put STREAM_CAST_SECRET
wrangler deploy
node test/worker.test.mjs   # lokal mantık testi (32 senaryo)
```

### Geçiş planı
1. Vercel env + Worker secret gir → `wrangler deploy` (shadow: `WORKER_ENFORCE=false`).
2. `wrangler tail` ile `{"ev":"hmac_fail"...}` logu izle (24 saat). Loglarda yalnızca sid parmak izi vardır.
3. Hata yoksa `WORKER_ENFORCE="true"` → deploy.
4. Bir 24 saat daha sonra `ALLOW_LEGACY_JWT="false"` → eski `?token=` yolu kapanır (Basic Auth kalır).

### Sorun giderme
- **Film 401 veriyor (preview/prod):** Yeni Worker deploy edilmemiş → `?sig=` tanınmıyor, Basic Auth'a düşüyor.
- **Enforce sonrası 403:** Vercel `STREAM_TOKEN_SECRET` ≠ Worker secret; ya da saat farkı (`exp`).
- **Chromecast oynatmıyor:** `STREAM_CAST_SECRET` Worker'da eksik/farklı (cs'li istekler bu secret ile doğrulanır).

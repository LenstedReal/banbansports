# banbansports — YENİ NESİL UI/UX YENİDEN TASARIM PLANI

> **Bu bir PLAN dokümanıdır.** Uygulama (implementation) fork oturumunda, model seçildikten sonra tetiklenecektir.
> **Repo:** https://github.com/LenstedReal/banbansports · **Canlı:** https://banbansports.vercel.app
> **Stack:** Next.js 15.5 (App Router) + React 19 + Tailwind 3.4 + tek `globals.css` · FastAPI backend (Vercel serverless `frontend/api/index.py` → `_backend_app`)

---

## 0. ANA İLKE (bozulmaz kural)

> **DO NOT PRESERVE THE OLD UI. PRESERVE THE WORKING SYSTEM. REBUILD THE EXPERIENCE.**

- **Tasarım:** radikal şekilde yeniden inşa edilecek (yeni nesil, sinematik, premium, underground-neon).
- **Veri / işlev / sistem mantığı:** birebir korunacak. Hiçbir gerçek içerik (film konusu, gişe, seyirci, maç, takım, lig, kanal, sponsor, yasal metin) **yeniden yazılmayacak, uydurulmayacak, silinmeyecek.**
- **Prototip görseli = ANA GÖRSEL REFERANS (north star).** Körü körüne kopyalanmayacak; prototipteki hatalı/AI-uydurma içerikler ve teknik zayıflıklar taklit edilmeyecek — tasarım felsefesi (kompozisyon, atmosfer, hiyerarşi, yoğunluk, neon dili) alınacak.

**Öncelik sırası (karar anında):**
1. Functionality → 2. Data Integrity → 3. Usability → 4. Responsive Behavior → 5. Information Hierarchy → 6. Visual Consistency → 7. Prototype Visual Language → 8. Decorative Effects

⚠️ **Uygulama oturumunda ilk iş:** kullanıcının eklediği **prototip görselini** almak (`get_assets_tool`) ve `design_agent`'e vermek. Görsel yoksa kullanıcıdan tekrar istenmeli; bu plandaki görsel yön prototiple doğrulanmalı.

---

## 1. MEVCUT DURUM ANALİZİ (as-is)

### 1.1 Sayfa yapısı — `app/page.tsx` (client component)
İlk yüklemede `/api/scores/top?n=5` ve `/api/livescore/today` çekiliyor, sonra bileşenler kendi polling döngülerini yönetiyor. Render sırası:
1. `<Header/>` — logo (glitch), CANLI badge, ADMIN linki (admin ise), bildirim toggle
2. `<MatchBanner/>` — carousel tarzı tek büyük skorboard (en büyük 5 maç)
3. `<MatchCenter/>` — lig filtreleri + maç kartları grid (pagination 24'er)
4. `<VideoPlayer/>` — kanal listesi, canlı yayın, "GÜNÜN MAÇI", film oynatıcı, box office sayacı, model showcase, sponsor banner, server footer (2057 satır — çok sorumluluklu)
5. `access-notice` — akan duyuru şeridi (alan adı değişim uyarısı)
6. `<Sponsors/>` — "SPONSORLARIMIZ" hiyerarşik logo düzeni
7. Overlay: `<NotificationCenter/>`, `<PushPrompt/>`, `<FpsCounter/>`, `<SwRegister/>`

### 1.2 Diğer route'lar
- `app/match/[id]/page.tsx` + `MatchDetailClient.tsx` — maç detay sayfası (AI tahmin, istatistik modalı)
- `app/admin/page.tsx` — admin paneli
- `app/og/match/route.tsx` — dinamik OG görsel

### 1.3 Bileşenler (`frontend/components/`)
`Header, MatchBanner, MatchCenter, VideoPlayer(2057), MoviePlayer(834), BoxOfficeCounter(273), MatchStatsModal(379), AIPrediction(254), Sponsors(255), Scoreboard(143), NotificationCenter, PushPrompt, HeroTicker, MatchBanner, ModelShowcase, OkeyBanner, SponsorBanner, ServersFooter, TeamLogo, FpsCounter, AuthButton, AuthProvider, SwRegister, TeamLogo`

### 1.4 Veri / API katmanı (`lib/`) — **DOKUNULMAYACAK**
- `lib/api.ts` — SSR+CSR fetch yardımcıları (`getTopScores`, `getTodayMatches`, `getChannels`, `getClient/postClient/deleteClient/getServer`, `wsUrl`). Backend `NEXT_PUBLIC_BACKEND_URL` / rewrite proxy üzerinden.
- `lib/i18n.ts` (TR sabitleri, `trLeagueName`), `lib/knownTeams.ts`, `lib/footy.ts` (`leagueLogo`), `lib/fps.ts`, `lib/footyIndex.json`
- Backend router'ları: `scores, channels, streams, movies, boxoffice, sponsors, notifications, ws, auth, admin, predictions, ai_predict, match_stats, featured, bein, ssport, ...`
- Public assetler: `/footy/leagues/*.svg`, `/footy/teams/*.svg`, `/logos/channels/*.png`, `/ads/*`, `spiderman_*`, `peaky_splash.jpg` vb. → **korunacak, yeniden çizilmeyecek.**

### 1.5 Mevcut tasarım sistemi (kusurlar)
- **Stil tek dosyada:** `app/globals.css` = **3438 satır**, monolitik, ~60+ "tek seferlik düzeltme" yorum bloğu (`/* === CROP HATA DÜZELTMELERİ === */`, `/* === TURKCELL kucultme === */` vb.) — sürdürülemez.
- **Token tutarsızlığı:** CSS `:root` renkleri (`--cyan #00f0ff`, `--pink #ff00aa`, `--purple #aa00ff`, `--green #00ff88`, `--orange #ff8800`, `--red #ff0040`, `--bg-dark #0a0510`) ile `tailwind.config.js` renkleri **kısmen farklı** (bg tonları ayrışıyor). Font'lar da tutarsız: CSS `Orbitron`/`VT323` kullanıyor ama Tailwind `Bebas Neue/Oswald/Rajdhani/VT323` tanımlıyor.
- **Bol inline style:** bileşenlerde yüzlerce satır inline `style={{...}}` (Header toast, MatchCenter kartları, "daha fazla" butonu...).
- **Zorlanmış desktop layout:** `layout.tsx` viewport'u `width=980`'e sabitliyor + MutationObserver ile geri yazıyor → mobil = küçültülmüş masaüstü. **Gerçek responsive yok.** (Bu davranış plana göre kaldırılacak / yeniden tasarlanacak.)
- **Aşırı kutu/border kalabalığı** ve dağınık glow kullanımı (semantik değil).

---

## 2. HEDEF TASARIM SİSTEMİ (to-be)

### 2.1 Design tokens (tek kaynak)
Tek merkez: `tailwind.config.js` + `globals.css :root`. İkisi **birebir aynı** değerleri paylaşacak. Hardcoded/kopuk değerler kaldırılacak.

**Renk (semantic — sadece dekor değil, HİYERARŞİ):**
- Zemin: `--bg-0 #07070b` (deep black), `--bg-1 #0d0d14`, `--bg-2 #13131c` (near-black purple/blue surfaces)
- `cyan #00f0ff` → information / active / navigation
- `magenta/pink #ff00aa` → primary emphasis / entertainment / CTA
- `green #00ff88` → online / live-healthy / success
- `red #ff0040` → warning / live-critical
- `amber/orange #ffaa00` / `#ff8800` → upcoming / attention
- Metin: `ink-high #f4f1ff`, `ink-mid #cfc9e0`, `ink-low #9b8db5`

**Kural:** her bileşen kendi neon mantığına sahip; glow rastgele DEĞİL. cyan=bilgi/nav, magenta=CTA/eğlence, green=online, red=canlı/uyarı, amber=yaklaşan.

**Tipografi (hiyerarşi):**
- Display/headline: condensed (ör. Bebas Neue / Oswald) — uppercase section label'ları, büyük başlıklar
- Body: yüksek okunabilirlik (ör. Rajdhani / Inter) — film konusu, yasal metin **mutlaka okunur**
- Mono/digital metadata: VT323 / IBM Plex Mono — skor, dakika, sayaç, kaynak/timestamp
- Ölçek: H1 `text-4xl sm:text-5xl lg:text-6xl`, section label `text-xs/sm uppercase tracking-widest`, body `text-sm/base`

**Spacing / radius / shadow / glow / transition / breakpoints** design-token olarak tanımlanacak (Tailwind theme.extend). transition **belirli property'lere** (opacity, transform, background, border-color) — `transition: all` YASAK.

**Atmosfer katmanları (kontrollü, performans dostu):** ince scanlines, hafif grain/noise, atmosferik radyal neon glow, glass surface (12–24px backdrop-blur), thin luminous border, soft bloom, depth shadow. Ağır sürekli blur/filtre/animasyon YASAK. Hedef: premium underground broadcast — ucuz "cyberpunk template" DEĞİL.

### 2.2 Kart design-system'i (tek aile, işleve göre varyant)
Ortak kurallar: radius, border treatment, shadow, glow, padding, header yapısı, metadata yerleşimi, hover/active, responsive. Varyantlar aynı aileden ama farklılaşır:
`HeroCard (scoreboard) · MatchCard · MovieHero · ChannelCard · ServerCard · SponsorCard · AdCard`
İlke: **LESS BOXES, MORE COMPOSITION** — her bilgiye border verme; divider/spacing/typography/bg-contrast/subtle-glow ile ayır. Bilgi **silinmez**, daha iyi gruplanır.

### 2.3 Yeni bileşen mimarisi (refactor)
- `components/ui/` altında yeniden kullanılabilir primitive'ler: `Card`, `SectionLabel`, `NeonBadge`, `StatusDot`, `Divider`, `Tabs/FilterBar`, `Marquee`, `GlassPanel`, `Skeleton`, `EmptyState`, `ErrorState`.
- `VideoPlayer.tsx` (2057) ve `globals.css` (3438) mantıklı parçalara bölünecek — **ama tüm data-fetch/state/WS/HLS mantığı korunacak.**
- Inline style'lar token tabanlı sınıflara taşınacak.

---

## 3. BÖLÜM BAZINDA YENİDEN TASARIM (data korunur, UI yeniden)

### 3.1 Header / Navigation
Underground broadcast kimliği; sticky/compact davranış. Logo + UNDERGROUND HD, canlı durum, ADMIN (koşullu), bildirim toggle — **işlevler aynen**. Glitch efekti kontrollü. Toast inline style → token sınıfı.

### 3.2 MatchBanner (büyük skorboard / "GÜNÜN MAÇI")
Sinematik hero skorboard: takım karşılaştırması, canlı dakika/skor, lig, kanal, CTA (▶ İZLE). Neon semantic (canlı=green/red, yaklaşan=amber). Carousel/ticker micro-interaction. **Veri: `/api/scores/top` — değişmez.**

### 3.3 MatchCenter — **öncelikli yeniden tasarım**
- Kompakt, hızlı taranabilir, bilgi yoğun ama düzenli maç kartları.
- Kategori/lig filtreleri: **mobilde yatay scroll** (sticky). Filtre mantığı ve `FILTERS` dizisi + `epsToLabel`/`smartLeague`/slug üretimi + pagination (24'er) **aynen korunacak.**
- Canlı/gelecek/bitti durum göstergeleri semantic renkle. Gereksiz border kalabalığı azaltılacak; uzun takım/lig isimleri taşmayacak (truncate + tooltip).
- Kart link'i `/match/[slug]` **korunacak**.

### 3.4 Film alanı — **özellikle sinematik yeniden tasarım (MoviePlayer + BoxOfficeCounter)**
- "10 küçük kutu" → **1 güçlü sinematik film experience + mantıklı bilgi grupları.**
- Poster/backdrop hero katmanında; ön planda okunabilirlik için gradient/dark overlay/blur/glass/neon-accent/kontrollü glow. Aşırı efekt yok.
- Bilgi mimarisi (mevcut verilerle, **yeniden yazılmadan**):
  - **PRIMARY:** film adı, poster, vizyon, format (720p/1080p, dublaj/altyazı), IMDb puanı
  - **FINANCIAL / AUDIENCE:** dünya geneli hasılat, yerel (TR), uluslararası, seyirci, artış hızı, para birimi seçici (USD/TRY/EUR/GBP/JPY)
  - **DETAILS:** konu (tam metin, okunur), yönetmen, oyuncular, süre, faz
  - **SOURCE / METADATA:** kaynak (Box Office Mojo/IMDb/TradingView FX), son güncelleme, "tahmini seyirci = hasılat ÷ ort. bilet" açıklaması
- Box office canlı sayaç animasyonu (`BoxOfficeCounter`) **korunacak**, sadece görsel dil premium'a taşınacak.
- Film oynatıcı (`MoviePlayer` HLS/kontroller/trailer) **işlev aynen**.

### 3.5 Canlı yayın / Kanal alanları
Kanal kartları tek design-system'den; canlı=green pulse, bakım=amber, HD/CANLI badge'leri. Öne çıkan kanal vurgusu ve "YAKINDA" (12sn) mantığı **korunacak**. Server selector aynı aileye taşınacak.

### 3.6 Reklam / Sponsor banner (video altı)
Grandpashabet/Okey/model cutout vb. reklam alanları AdCard varyantı olarak düzenlenecek; **linkler, videolar, gif'ler ve metinler aynen** (yasal/sponsor içeriği değişmez).

### 3.7 Sponsors ("SPONSORLARIMIZ")
Alt tarafta düz logo listesi değil → **hiyerarşi**: featured sponsors (büyük) vs secondary (küçük), tutarlı logo alanı, responsive wrapping. Logolar **yeniden çizilmez/uydurulmaz** — mevcut assetler. "Kalitenin zirvesindeyiz" atmosferi neon başlıkla.

### 3.8 access-notice ticker
Akan alan-adı duyurusu korunacak; marquee micro-interaction, kontrollü neon.

### 3.9 Footer (ServersFooter)
Underground/premium broadcast hissi. **Korunacak içerik:** sosyal medya, Telegram destek, yasal bilgilendirme, sorumluluk reddi, DMCA, sunucular, teknik/marka bilgileri, copyright. Uzun yasal metinler için accordion/collapsible kullanılabilir **ama metin kısaltılmaz/yeniden yazılmaz.**

### 3.10 Overlay'ler
`NotificationCenter`, `PushPrompt`, `FpsCounter`, toast'lar → token tabanlı, tutarlı neon; işlev aynen.

### 3.11 Alt route'lar
`match/[id]` detay (AI tahmin + istatistik modalı) ve `admin` paneli aynı design-system'e taşınacak; veri/aksiyonlar korunacak.

---

## 4. RESPONSIVE (sonradan eklenmeyecek — baştan ayrı IA)
- `layout.tsx`'teki `width=980` viewport sabitleme + MutationObserver **kaldırılacak** → gerçek responsive `viewport` (device-width) kurulacak.
- **Desktop:** LEFT SIDEBAR / MAIN CONTENT / RIGHT SIDEBAR (uygun bölümlerde).
- **Mobil ayrı akış:** PRIMARY CONTENT → MATCHES → FEATURED (canlı yayın) → MOVIE → ADS → SPONSORS → FOOTER.
- Mobilde: yatay scroll tab'lar, sticky/compact nav, hero oranları, kart genişlikleri, typography scale yeniden. Desktop 3 kolon mobilde zorlanmayacak.
- Breakpoint'ler sistematik (Tailwind).

⚠️ Not: mobil viewport değişikliği geniş etki yaratır — kapsamlı responsive QA şart (5. faz).

## 5. ANİMASYON
Sadece: hover, active, live status, loading, card reveal (staggered), neon pulse, subtle glow, ticker, carousel. Kısa, smooth, GPU-friendly, tutarlı. Sürekli ağır animasyon yok. `transition: all` yok.

## 6. DURUM TASARIMLARI
Her veri alanı için loading (skeleton) / empty / error tasarımı (mevcut boş-mesaj metinleri korunarak).

---

## 7. UYGULAMA FAZLARI (fork oturumu için sıralı yol haritası)

**FAZ 0 — Hazırlık**
- Prototip görselini al (`get_assets_tool`), `design_agent`'e ver → `design_guidelines.json`.
- Repo'yu bu ortama kur/senkronla (mevcut banbansports kodu; `/app` şu an boş şablon). Backend + frontend ayağa kaldır, baseline ekran görüntüsü al.

**FAZ 1 — Design system temeli (görsel kırılma yok)**
- Token'ları `tailwind.config.js` + `globals.css :root` içinde tekilleştir. Font pipeline (Google Fonts) kur.
- `components/ui/` primitive'lerini oluştur (Card, SectionLabel, NeonBadge, StatusDot, FilterBar, GlassPanel, Skeleton, EmptyState...).

**FAZ 2 — Bölüm bölüm yeniden tasarım** (her adımda veri kaynağı korunur, tek tek doğrulanır)
Sıra: Header → MatchBanner → MatchCenter → Film (MoviePlayer+BoxOffice) → Kanal/Canlı yayın → Reklam/Sponsor banner → Sponsors → access-notice → Footer → overlay'ler → `match/[id]` → `admin`.

**FAZ 3 — Responsive IA**
- `layout.tsx` viewport düzelt; mobil ayrı akış + yatay scroll tab'lar + sticky nav.

**FAZ 4 — Polish pass**
- Tüm sayfa birlikte: spacing/hierarchy/visual consistency, atmosfer katmanları, micro-interactions, performans (blur/animasyon maliyeti).

**FAZ 5 — QA (görsel "tamam" demek yetmez)**
- Desktop / tablet / mobil layout; çok uzun film konusu; uzun yasal metin; eksik veri; uzun takım/film isimleri; farklı ekran genişlikleri; kart taşması; görsel oranları; buton/nav/filter/tab; API render; loading/empty/error; hover/focus; erişilebilirlik; performans.
- **Özellikle:** hiçbir metin karttan taşmıyor, hiçbir bileşen mobilde kırılmıyor.
- Ardından `testing_agent` (backend flow'ları bozulmadı mı + frontend flow'ları).

---

## 8. VERİ/İŞLEV KORUMA — DEĞİŞMEZ LİSTE (regression guard)
Bunların hiçbiri bozulmayacak / değiştirilmeyecek:
- Tüm `lib/*` fetch mantığı, endpoint'ler, WS, HLS oynatma
- `MatchCenter` filtre/etiket/slug/pagination mantığı
- Route'lar (`/`, `/match/[id]`, `/admin`, `/og/match`)
- Buton davranışları, linkler, filtreler, server logic, veri formatları
- Gerçek içerik: film konusu/özet/yönetmen/oyuncu/gişe/seyirci/artış/tarih/kaynak, maç/takım/lig/kanal, sponsor, yasal/DMCA/sorumluluk reddi, sosyal medya
- Public assetler (logolar, posterler, reklam medyaları)

## 9. BAŞARI KRİTERİ
Bittiğinde kullanıcı **"eski siteye neon renk eklenmiş"** DEMEMELİ; **"aynı platformun tamamen yeni nesil versiyonu"** hissetmeli. Aynı anda: film bilgileri kaybolmamış, maç verileri değişmemiş, yasal metinler yeniden yazılmamış, fonksiyonlar bozulmamış, mobil kırılmamış olmalı.
**Görsel dönüşüm BÜYÜK; veri/işlev kaybı SIFIR.**

---

### ⚠️ Açık bağımlılık
- **Prototip görseli bu planlama oturumunda sisteme ulaşmadı.** Uygulama oturumunda ilk adım olarak eklenmeli — bu plandaki görsel yön (neon/underground/cinematic) prototiple doğrulanıp keskinleştirilmeli.

# banbansports — PRD

## ✅ TUR 6 (2026-08-18): Film kartı NETFLIX TARZI TEK KOMPOZİSYON (final)
- CinemaSection.tsx SIFIRDAN yazıldı: 240px cin2-hero (Spider-Man tam görünür) — görsel ÜZERİNDE: rozetler+IMDb (üst), poster küçük resmi + başlık(2 satır clamp) + dublaj/altyazı etiketleri + İZLE (alt), KONU ▼ çipi → hero içi cam panel.
- KONU kapanma: document click listener — metne/dışarı/çipe tıklayınca kapanır (iteration_12 PASS).
- BoxOfficeCounter: sadece tabs+stats (başlık/hero çıkarıldı); YEREL/ULUSLARARASI yan yana, ARTIŞ HIZI şerit. Kart ~640px. Eski cin-backdrop/cin-veil display:none.
- Testler: iteration_11 (kart tam), iteration_12 (KONU kapanma) %100 PASS.

## ✅ TUR 5 (2026-08-18, devam): Film kartı TEK BLOK yeniden tasarım + kilit paneli + son rötuşlar
- Film kartı: kart arkası backdrop/veil tamamen kapatıldı; Spider-Man kendi 330px sinematik hero bloğunda (bo2-hero), KONU metni hero ÜZERİNDE cam panel (3 satır clamp + DEVAMI/GİZLE toggle, credits açılınca görünür); ayrı cin-plot bölümü kaldırıldı — veri kaybı yok (iteration_10: hepsi PASS).
- Kilit paneli yeniden tasarım: neon kilit ikonu halkası, BANBANSPORTS kicker, film adı alt başlığı, ERİŞİM BİLGİLERİ başlıklı cam creds kutusu, bulanık poster bg, pill butonlar; kopyala → ✓ + KOPYALANDI toast + titreşim.
- Alt GPB banner silindi (tek banner, player üstünde); 5G notu silindi → bağlantı göstergesi 5G'de altın italik glif; alıntı CTA altında, — T. SHELBY sağ altta; meritking_news.png (kullanıcı görseli) sponsor şeridinde; fs-brands logosu 34px.
- Vercel env: YENİ ZORUNLU DEĞİŞKEN YOK; opsiyonel STREAM_ACCESS_USER/PASS. stream-auth Vercel 404'ünün kök nedeni api/index.py mount eksiğiydi (düzeltildi, push+redeploy gerek).
- Testler: iteration_6 (backend 9/9 + frontend tam akış), iteration_7/9/10 frontend %100 PASS.

## ✅ TUR 4 (2026-08-18, bu oturum): Kullanıcı hata listesi + Vercel sync
- **Vercel sync KÖK NEDEN fix**: `_backend_app/routers/boxoffice.py` eski bilet modelindeydi → `backend/app` ile eşitlendi (TR 240TL ağırlıklı model, seyirci ~1.9M). `movies.py` de eşitlendi. `stream_auth` + `sponsors` router'ları `api/index.py`'ye eklendi. `stream_auth` creds env'e taşındı (STREAM_ACCESS_USER/PASS, default eski değerler). sw.js → v8-sync. **Kullanıcı GitHub push + Vercel redeploy yapmalı.**
- Yasal panel: CSS marquee → JS marquee (rAF, 34px/sn, hover pause). KÖK NEDEN: `column-count:1` bile multicol container yaratıp metni görünmez yan kolonlara akıtıyordu → `column-count:auto !important`. Artık 14 maddenin tamamı akıyor.
- Box office kartı: başlıkta KAYNAK + kaynak satırı (onMeta callback); CANLI GİŞE + YENİ FİLM rozetleri tarihten sonra yan yana; '(tahmini)' kaldırıldı; alt kartlar tam genişlik defter düzeni (grid label/value/sub) → sıfır sayı kesilmesi (8/8 taşma testi temiz @980px); gerçek cam paneller (rgba .38 + blur 14px) + text-shadow; veil çok hafif (.16/.09/.05) → Spider-Man backdrop maksimum görünür.
- GPB RESMİ YAYIN SPONSORU: player'ın hem üstünde hem altında (page.tsx + VideoPlayer sonu). Player altında betzula + birleşik film/gişe kartı düzeni korunur.
- 5G notu footer'dan player altına taşındı (player-5g-note). Footer'da footer-powered kaldırıldı.
- Player splash çakışma fix: alıntı+imza ÜSTTE, play ortada, CTA altta; buton clamp(70-94px).
- Footer: SPONSORLARIMIZ ortalandı (margin auto fix); adidas sponsor listesinden kaldırıldı; Football Suppliers yeniden tasarım (marka şeridi + GS/FB/BJK/TS isimli takım kartları, flex:1 dolu düzen); site dibi: DMCA + '® 2024–2027 ... TÜM HAKLARI SAKLIDIR' + 'altyapı lenstedreal StreamRadar' ince mono fontlarla; KALİTENİN ZİRVESİNDEYİZ çizgileri düzgün konumda; OK banner object-fit contain (rozet kesilmiyor); sol kolon TÜM MAÇLARI GÖR listeden hemen sonra.
- backend/.env: yayın token'ları (TRT1/TV8/TRTHABER/SSPORT/TIVIBUSPOR/TRTSPOR) + FEATURED_* + CRON_SECRET eklendi (kullanıcı verdi). Ops notları: memory/deploy_notes.md (ASLA SİLME).
- Test: backend 9/9 (test_iter6_bugfix.py; testing agent 8/9 + stale assertion düzeltildi). Frontend: manuel 980px doğrulama (taşma 8/8 temiz, marquee half=3617px akıyor); testing agent frontend turu iki kez kesildi — tam otomasyon pass bekliyor.
- BEKLEYEN: Meritking yerine kullanıcının vereceği görsel (henüz yüklenmedi); Vercel redeploy sonrası stadyum verisi doğrulaması; frontend otomasyon testi.

## ✅ TUR 3 FİNAL (2026-06):
- KÖK NEDEN boşluk fix: legacy `.main-content{flex:1}` → flex:0 0 auto (iteration_4: %100 doğrulandı)
- Çözünürlük/netlik: VT323 pixel fontu → JetBrains Mono; tüm mikro fontlar ≥9.5px'e çıkarıldı, aşırı letter-spacing kaldırıldı, küçük metin glow'ları kapatıldı (telefonda 2.5x küçülmede net)
- Performans: noise/scanline katmanları kapalı (FPS 16→~55), tabular-nums
- Kullanıcı onaylı: Telegram + Sosyal Medya birleşik panel; Galatasaray sponsor listesinden çıkarıldı; öne çıkan sponsor sırası ince tek şerit; duyuru şeridi header altına taşındı+küçültüldü; yasal metin eski yapıdaki gibi yukarı akışlı (hover'da durur, TÜMÜ sekmesi)
- Ölçek pass'leri: sayfa 3200→~2200px; header 50px; GPB 2 satır kompakt; kolonlar stretch dengeli
- SW_VERSION v7-final (kullanıcı cihazı cache bump)

> Ana problem: banbansports (Next.js 15 + React 19 + FastAPI) projesinde, mevcut veri/işlev korunarak prototip görseline dayalı YENİ NESİL UI/UX yeniden tasarımı. Ayrıca güvenlik sertleştirmeleri (Cloudflare Turnstile + Workers) tamamlanacak.
> İlgili dokümanlar: `memory/repo_analysis.md` (satır-satır repo analizi + bulgular), `memory/redesign_plan.md` (UI/UX redesign planı).

## ✅ TAMAMLANAN (2026-06, redesign oturumu)
### Tur 2 (aynı gün, kullanıcı onaylı sadeleştirme + final):
- Kullanıcı onayıyla kaldırılan tekrarlar: CANLI YAYINDA logo ızgarası, alt lig ikon şeridi (LeagueStrip silindi), çift copyright, çift seyirci açıklaması, "· BOX OFFICE" tekrarı, ÖZET "TÜM DETAYLAR" butonu
- Bug fix: MİLLİ MAÇ filtresi kulüp hazırlık maçlarını gösteriyordu (isNTFriendly ayrımı eklendi) — testing agent doğruladı
- TeamLogo fallback: logosu olmayan takımlara baş harfli neon rozet; SVG viewbox→viewBox fix + ?v=2 cache-bust + SW bump
- Footer prototip düzenine alındı: SOSYAL MEDYA + TELEGRAM + sekmeli YASAL BİLGİLENDİRME (metin aynen) + FOOTBALL SUPPLIERS/DMCA/5G
- Sponsorlar: ok butonlu 2 yatay kaydırmalı sıra (SponsorRow, spx-*)
- Maç detay sayfası yeni neon dile taşındı (md2-*, TeamLogo'lu hero)
- Performans: tam ekran noise blend + scanlines kaldırıldı (FPS düşüşü fix), tabular-nums sayaç titremesi fix
- Kolon dengesi: bb-grid stretch, sayfa yüksekliği ~2370px (980 viewport)
- Test: iteration_1 (backend 9/9 + FE %100), iteration_2 (%100), iteration_3 (18/19 → kalan badge fix uygulandı+doğrulandı)
- Repo klonlandı, ortam kuruldu (backend/.env: JWT_SECRET/ADMIN_PASSWORD prod ile aynı; yayın token'ları eklendi; MONGO_URL lokal — prod Atlas'a dokunulmuyor)
- **3 kolonlu dashboard redesign UYGULANDI** (prototip = north star, testing agent %100 geçti):
  - Sol: MAÇ MERKEZİ (dikey lig filtreleri) + YAKLAŞAN MAÇLAR kompakt kartlar + OKEY reklamı (`MatchCenter.tsx` — filtre/slug/pagination mantığı korundu)
  - Orta: Hero skorboard (`MatchBanner`) + GÜNÜN MAÇI (`DailyMatchStrip`) + video player (`VideoPlayer` — HLS/reklam/kontrol mantığı AYNEN) + Betzula/Grandpashabet + BOX OFFICE sinema kartı (`CinemaSection` + `BoxOfficeCounter` bo2-*)
  - Sağ: CANLI YAYINDA + TV KANALLARI (`ChannelRail`, bb:select-channel event köprüsü) + SUNUCULAR (`ServerPanel`, window.bbSwitchServer) + ÖZET (`OzetPanel`, gerçek film konusu, aç/kapa)
  - Tam genişlik: lig ikon şeridi (`LeagueStrip`, bb:set-filter) + ticker + sponsors/footer
- CSS: `app/legacy.css` (eski 3438 satır, player içi/modal/admin/maç detay stilleri) + `app/globals.css` (yeni token tabanlı design system, semantik neon)
- Viewport width=980 kilidi KORUNDU (kullanıcı isteği: mobil=masaüstü aynı görünüm). Tüm ekran testleri 980px'te yapılmalı.
- SVG fix: footy lig/takım logolarında `viewbox`→`viewBox` düzeltildi (108+1631 dosya) + `?v=2` cache-buster + sw.js SW_VERSION bump
- Film HLS buffer doğrulandı: maxBufferLength 30sn (tamamı yüklenmiyor — maliyet sorunu yok)
- Event köprüleri: bb:select-channel, bb:open-movie, bb:player-state, bb:set-filter, bb:server-changed
- Test: /app/test_reports/iteration_1.json — backend 9/9, frontend %100

## Backlog / P0-P2
- **P0: Backend router sync** — `stream_auth` + `sponsors` router'larını `frontend/api/index.py` (Vercel slim) + `frontend/_backend_app/main.py`'ye ekle; `stream_auth.py` hardcoded creds (lenstedreal_marka/zirvedeyiz) env'e taşı → "şifre al" preview/prod fix
- **P0: Cloudflare Turnstile + Workers** (aşağıdaki ⛔ bölüm — kullanıcıdan Site/Secret Key gerekli)
- **P1: match/[id] + admin sayfalarını yeni design-system'e taşı** (şu an legacy stillerle çalışıyor)
- **P2:** AI model etiket uyuşmazlığı, pywebpush requirements, login brute-force, /api/auth/login 401 semantiği
- Kullanıcı notu: SVG logoların "çözünürlük işlemesi" ileride ele alınacak (kullanıcı sözü)

## Backlog / P1-P2

<!-- ============================================================
     ⛔ ASLA SİLİNMEYECEK BÖLÜM — KALICI KAYIT ⛔
     Bu bölüm hiçbir PRD güncellemesinde silinmez, kısaltılmaz, taşınmaz.
     ============================================================ -->
## ⛔ KALICI: CLOUDFLARE TURNSTILE + WORKERS KURULUM ADIMLARI (ASLA SİLME)

### A) TURNSTILE (kilit paneli bot koruması) — kullanıcının Cloudflare panelinde yapacakları:
1. Cloudflare Dashboard → **Turnstile** → **Add Site** (ücretsiz).
2. Site adı: banbansports (serbest); Domain'ler: canlı alan adı/adları + `preview.emergentagent.com` (test için).
3. Widget Mode: **Managed** (önerilen).
4. Oluşunca 2 anahtar verilir → **İKİSİNİ DE AJANA VER**:
   - **Site Key** (frontend widget'a gömülür — herkese açık)
   - **Secret Key** (backend doğrulama için — GİZLİ, backend/.env'e girilecek)
5. Ajan sonra: kilit paneline widget'ı ekler, backend `siteverify` doğrulamasını yazar; token Turnstile geçilmeden ÜRETİLMEZ.

### B) WORKERS (HLS stream token zorunluluğu — tokensız izlemeyi kapatır):
Mevcut durum: backend 30 dk'lık JWT üretiyor (çalışıyor, test edildi) AMA `stream.lenstedreal.xyz` tokensız da 200 dönüyor → koruma CDN tarafında ZORLANMIYOR.
Kullanıcının Cloudflare panelinde yapacakları:
1. `lenstedreal.xyz` DNS'inde `stream` ve `stream1` kayıtları **Proxied (turuncu bulut)** olmalı — Worker ancak proxy'li trafiğe girer.
2. Cloudflare Dashboard → **Workers & Pages** → **Create Worker** (ücretsiz plan yeterli).
3. Ajanın vereceği hazır Worker script'ini yapıştır (script: her m3u8/segment isteğinde `?token=` JWT'sini HS256 ile doğrular; yoksa/geçersizse 403).
4. Worker → **Settings → Variables** → `JWT_SECRET` adında **Secret** ekle. Değeri backend `.env` içindeki `JWT_SECRET` ile AYNI olmalı (ajan hazır olduğunda değeri güvenli şekilde iletir; PRD'ye yazılmaz).
5. Worker → **Triggers → Routes**: `stream.lenstedreal.xyz/*` ve `stream1.lenstedreal.xyz/*` route'larını ekle.
6. Doğrulama: tokensız `curl https://stream.lenstedreal.xyz/stream.m3u8` → **403** dönmeli; tokenlı istek → 200.

### Kullanıcının AJANA vermesi gerekenler (özet):
- [ ] Turnstile **Site Key**
- [ ] Turnstile **Secret Key**
- [ ] Worker kurulumuna başlandığında "script'i ver" demesi yeterli (script + secret değeri ajan tarafından sağlanır)
- [ ] Route'lar bağlandıktan sonra haber vermesi (ajan uçtan uca test eder)
<!-- ⛔ ASLA SİLİNMEYECEK BÖLÜM SONU ⛔ -->

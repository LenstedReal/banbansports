# banbansports — UNDERGROUND HD (PRD)

## Ürün Özeti
Türkçe canlı spor yayını / skor platformu. Next.js 15 (App Router) + Tailwind + hls.js frontend,
FastAPI + MongoDB backend. Vercel deploy uyumlu (frontend `vercel.json` + `app/_backend_app/` serverless).
Kullanıcı dili: **Türkçe** (tüm iletişim Türkçe olmalı).

## Kullanıcı Kişiliği / Bağlam
- Sahibi mobil cihazdan (Chrome) yönetiyor; masaüstü ile mobil görünüm tutarlı olsun istiyor.
- İllegal/underground spor yayını + bahis sponsorlu bir vitrin. Bahis sponsoru: **Grandpashabet**
  (link: `https://grandpashabet8239.com/?btag=52146205_483350`).
- Talimatları HARFİYEN uygulanmalı. İstenmeyen özellik (ör. "sponsor toplama", otomatik entegrasyon) EKLENMEMELİ.

## Mevcut Durum (2026-06 / son oturum)
Frontend tamamen çalışıyor. Backend hazır ancak özel yayın (Cloudflare tüneli) RAFTA.

### Tamamlanan işler (bu oturum)
- **Grandpashabet sponsor banner**: Video player altında, tam yatay (maxWidth 1100, üst/alt dolgulu).
  Animasyonlu: parıltı süpürmesi, yüzen altın paralar, taç, KIRMIZI CTA "GEL BURAYA TIKLA | KAYIT OL 👆🔥".
  Sağ ucunda **arka planı kaldırılmış model görseli** entegre (tek parça reklam). Mobilde dengeli dizilim.
  Dosyalar: `components/SponsorBanner.tsx`, `public/gpb_bg.png`, `public/ad_model_cutout.png`.
- **Duyuru şeridi (ticker)**: Sponsorun altında; sol tarafta zil gibi sallanan **📢** ikon pili + sağdan sola
  akan "👉 Bir sonraki alan adımız..." yazısı. "DUYURU" yazısı YOK. `app/page.tsx` + `.access-ticker` CSS.
- **YAKINDA DAHA FAZLASI**: Kanal listesi altında premium teaser (gradient + shimmer + nabız). KALIYOR.
- **Footer**: Instagram (`@lenstedreal.exe`) → telif satırı (`® 2026 ... by lenstedreal ❤️‍🩹`) → Telegram
  sırası. Altyapı yazısı: "lenstedreal **StreamRadar**" (doğru yazım). Opera önerisi + telif en altta.
- **Mobil = Masaüstü**: `app/layout.tsx` head'ine inline script eklendi → viewport `width=1280` (scale'siz).
  Telefonda da masaüstü düzeni görünür (Chrome masaüstü modu davranışı). Masaüstü tarayıcı meta'yı yok sayar.
- **ÖNE ÇIKAN MAÇ tile KALDIRILDI** (`components/VideoPlayer.tsx`). Cloudflare rafa kalktığı için UI'dan çıkarıldı.
  Backend `featured.py` ve `featured` state ileride tekrar açmak için KORUNDU.

### Kaldırılan/rafa kalkan
- Cloudflare tüneli ile özel yayın (`mono.m3u8`) — İLERİDE yapılacak. Backend hazır, sadece tünel URL'i eksik.

## Mimari
- `frontend/app/page.tsx`: Ana akış → Header → MatchBanner → MatchCenter → VideoPlayer → SponsorBanner →
  access-notice(ticker) → Sponsors.
- `frontend/components/`: SponsorBanner.tsx, VideoPlayer.tsx, Sponsors.tsx, MatchBanner.tsx, MatchCenter.tsx.
- `frontend/components/ModelShowcase.tsx`: ARTIK KULLANILMIYOR (page'de render edilmiyor; dosya duruyor).
- `frontend/app/globals.css`: Tüm özel stiller (gpb-*, access-*, model-*, ch-soon-*).
- `backend/app/routers/featured.py`: `GET /api/featured/status`, `GET /api/featured/stream.m3u8` (proxy). RAFTA.
- `backend/.env`: `FEATURED_SOURCE_URL` (şu an ölü trycloudflare URL'i), `FEATURED_CHANNEL=bein1`.

## Entegrasyonlar
- Emergent LLM / emergentintegrations: **YOK**. (openai/anthropic paketleri requirements'ta ama proje kodu import etmiyor.)
- 3rd party runtime dependency EKLENMEDİ. (rembg/onnxruntime yalnızca tek seferlik görsel arka planı silme için
  ortama kuruldu; requirements.txt'e YAZILMADI, deploy'u etkilemez.)
- Görseller `image_generation_tool` (statik asset) + rembg cutout ile üretildi; public/ altında statik.

## Deploy
- Vercel: `frontend/vercel.json` + `frontend/next.config.js` DOKUNULMADI. Bozulmadı.
- Preview: `frontend/.env` → `REACT_APP_BACKEND_URL`.

## Backlog / Sonraki Adımlar (P0 → P2)
- **P0 (kullanıcı tetikleyecek)**: Cloudflare tüneli + Termux (`termux_server.py`, residential IP) ile özel
  yayın. Kullanıcı yeni tünel URL'ini verince: `backend/.env` → `FEATURED_SOURCE_URL` güncelle,
  `curl /api/featured/status` → `live:true` doğrula, ÖNE ÇIKAN MAÇ tile'ını `VideoPlayer.tsx`'e geri ekle.
  NOT: Cloudflare Termux'ta `cloudflared --protocol http2` ile çalışmalı (ISP UDP/QUIC engeli).
- **P1**: Mobil (width=1280) görünümünü gerçek cihazda doğrula; okunabilirlik için tipografi ince ayarı.
- **P2**: Reklam dönüşüm takibi / sponsor tıklama analitiği.

## Test Kimlikleri
`/app/memory/test_credentials.md` (admin/JWT — backend/.env).

## 2026-07-18 — Match Center Fix Paketi (bu oturum)
1. **İstatistik çakışması (P0) DÜZELTİLDİ**: `MatchDetailClient.tsx` poll isteği artık slug'daki `date`
   parametresini gönderiyor (`&date=YYYYMMDD`). Backend `match_stats.py` SofaScore fallback'i artık
   verilen tarihi (±1 gün) tarıyor ve TAM takım-adı eşleşmesini bulanık eşleşmeye tercih ediyor.
   Doğrulama: aynı istekler 3x tekrarda tutarlı; frontend'de doğru maç verisi kalıyor.
2. **İngilizce durumlar Türkçe'ye çevrildi**: `Postp./Canc./AW/SUSP/INT/ABAND` vb. → ERTELENDİ/İPTAL/HÜKMEN...
   (i18n.ts `epsToLabel` + MatchCenter lokal kopyası). Dakika formatı ("40'") artık canlı olarak algılanıyor.
3. **Lig/aşama adları Türkçe**: `trLeagueName()` eklendi (i18n.ts) — "Third Place Play-Off" → "ÜÇÜNCÜLÜK MAÇI",
   Semi/Quarter/Round of 16/Group A vs. MatchCenter `smartLeague` turnuva+aşama birleştiriyor
   ("DÜNYA KUPASI · ÜÇÜNCÜLÜK MAÇI"). Backend `stats["league"]` aşama-adına turnuva öneki ekliyor.
4. **Stadyum**: Detay sayfasında "🏟 STADYUM: X" satırı (`data-testid="match-venue"`). LiveScore Venue +
   SofaScore `/event/{id}` fallback (şehir dahil).
5. Başlamamış maçta skor "0–0" yerine "vs" gösteriliyor.

# banbansports — PRD / Changelog

## CHANGELOG — 2026-07-18 (E1 — Öne Çıkan Yayın)

Yeni özellik: **Öne Çıkan Yayın** (featured broadcast) — günün en önemli maçını
ana sayfanın en üstünde büyük bir bölmede otomatik gösterir.

Backend (`app/routers/featured.py` — Vercel slim `api/index.py`'e de kayıtlı, `_backend_app` senkron):
- Tek yapılandırılabilir HLS kaynağını (`FEATURED_SOURCE_URL`) Cloudflare bypass
  (`curl_cffi` impersonate=chrome120) + `FEATURED_REFERER` ile proxy'ler.
- Endpointler: `/api/featured/status` (45sn cache, canlı mı?), `/stream.m3u8` (master
  proxy + child/segment rewrite), `/playlist.m3u8?url=`, `/seg.ts?url=` (SSRF allowlist:
  kaynak registrable domain + `FEATURED_ALLOWED_HOSTS`).
- Otomatik algılama = sağlık kontrolü: kaynak 200 + `#EXTM3U` → live:true (yeşil), aksi → false (turuncu).
- `FEATURED_CHANNEL` (varsayılan `bein1`) hangi kanal LED'inin yeşile döneceğini belirler.

Frontend:
- `components/FeaturedBroadcast.tsx` — ana sayfa en üstünde (Header altı) büyük bölme.
  Canlıyken muted autoplay önizleme + yeşil "CANLI" rozeti + "TAM İZLE"; değilken
  zarif idle poster + turuncu "YAYIN BEKLENİYOR".
- `VideoPlayer.tsx`: featured canlıysa map'li kanalın (beIN) LED'i yeşile döner ve
  o kanal seçilince kaynak `/api/featured/stream.m3u8` olur (reklam/kalite/failover korunur).
  "TAM İZLE" → `bb:select-channel` event ile o kanalı seçer + player'a scroll.
- globals.css: `.featured-*` neon temalı stiller (tema bozulmadı).

### ÖNEMLİ KISIT (datacenter IP)
`tzy.zirvedesin236.cfd` gibi korsan-koruma Cloudflare kaynakları **datacenter IP'lerini
403'ler** (Vercel + preview pod dahil). TLS fingerprint (chrome120/124/131/safari) fark
etmez — engel IP itibarı kaynaklı. Termux residential/mobil IP'den çalıştığı için geçiyordu.
Çözüm seçenekleri:
  1. Termux'u bir tünelle (cloudflared/ngrok) public yap → `FEATURED_SOURCE_URL`'i tünel
     URL'ine ayarla (backend tüneli proxy'ler, residential IP Cloudflare'i geçer).
  2. Datacenter engellemeyen bir kaynak kullan.
Kod tarafı hazır; erişilebilir bir kaynak verildiği an tam çalışır (mux test yayını ile
uçtan uca doğrulandı: status live, master→child→segment 200, UI yeşil + oynatım).

## AÇIK / SONRAKI TUR
- Gerçek featured kaynağı için residential-IP tünel kurulumu (kullanıcı tarafı).
- ssport/tv8/trtspor/tivibuspor token'ları preview'de `ok:false` (verilen tms'ler eski);
  auto-refresh loop yeniler. TRT Haber `ok:true` (doğrulandı, aktif).

---

## CHANGELOG — 2026-07-13 (E1 oturumu)


GitHub reposu (LenstedReal/banbansports) ortama alındı; mimari + Vercel deploy yapısı
korunarak SADECE hatalı kısımlar düzeltildi. Emergent kalıntısı temizlendi.

Yapılan düzeltmeler:
- VideoPlayer: bakım overlay'i artık canlı `liveStatus`'tan türetilen "effective status"
  kullanıyor (turuncu/ok:false kanal seçilince TRT1 gibi bakım metni çıkıyor).
- Scoreboard (`fetch_live_scores`): UEFA KULÜP kupalarının ELEME turlarındaki ufak kulüpler
  (KuPS/Riga/TNS/Larne...) eleniyor — sadece büyük Türk kulübü varsa kalır. Dünya Kupası /
  milli maçlar (Fransa-İspanya, İngiltere-Arjantin) öne çıkıyor.
- Match Center: kaynak artık bugün + yaklaşan 3 gün (yaz sezon arasında boş kalmasın);
  frontend'de UEFA kulüp elemesi ufak kulüpleri `BIG_CLUB_RE` gate ile eleniyor.
- MatchBanner: 15sn otomatik geçiş + dokunmatik sağ/sol swipe + görünür ‹ › ok butonları.
- Stream token persistence: yenilenen token'lar MongoDB'ye (`stream_tokens`) yazılıyor;
  `is_token_valid`/`stream.m3u8` DB'den hydrate ediyor → Vercel serverless'te token/yayın ölmez.

Backend'in iki kopyası (`backend/app` + `frontend/_backend_app`) birebir senkron.

## AÇIK / DOĞRULANMAMIŞ (sonraki tur)
- İstatistik paneli canlı güncelleme ("0'da takılı"): şu an tüm maçlar başlamadı (WC yarı
  final yarın) → istatistik doğal olarak 0. Canlı maç olmadan doğrulanamadı.
- Test aracının başsız tarayıcısı client fetch'leri çekemiyor (egress); gerçek tarayıcıda çalışıyor.

## Ortam notları (yalnız preview)
- `frontend/package.json` `start` → `next dev` (Vercel bunu kullanmaz; `next start` → `start:prod`).
- `.env` değerleri preview içindir; Vercel kendi environment variables'ını kullanır.

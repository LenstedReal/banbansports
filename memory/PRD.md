# banbansports — PRD / Changelog

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

# banbansports — PRD / Changelog

## DURUM (2026-07-18) — Öne Çıkan Maç özelliği

### Uygulama kodu: %100 HAZIR ve DOĞRULANDI ✅
- GitHub'dan orijinal repo sıfırdan çekildi, orijinal tasarım korundu.
- **Öne Çıkan Maç** bölmesi: MatchCenter ile VideoPlayer arasında kompakt şerit (~150px, ekranı kaplamaz).
  Canlıysa yeşil "CANLI" + muted önizleme + "İZLE"; değilse turuncu "BEKLEMEDE".
- **İZLE** → `bb:select-channel` event → ana VideoPlayer'da map'li kanalı (beIN) seçer →
  reklam/kalite/failover/cast dahil TÜM işlevler otomatik.
- **Otomatik LED:** `/api/featured/status` polling → yayın canlıysa beIN tile YEŞİL + "CANLI" flag + glow geçiş efekti; değilse turuncu.
- Backend `app/routers/featured.py` (Vercel `api/index.py`'e kayıtlı, `_backend_app` senkron):
  düz `httpx` ile FEATURED_SOURCE_URL (tünel) proxy'ler; mutlak segmentler olduğu gibi bırakılır
  (tarayıcı=residential IP doğrudan CDN'den çeker → datacenter engeli yok).
- **Uçtan uca doğrulandı:** mux test yayınıyla status live, master→child→segment 200,
  beIN LED yeşil, kompakt bölme + oynatım hepsi çalıştı.

### Bekleyen tek iş: canlı KAYNAK (dış bağımlılık, kullanıcı tarafı)
`tzy.zirvedesin236.cfd` datacenter IP'lerini Cloudflare ile 403'ler (Python curl_cffi + Node cycletls + Node fetch = hepsi 403; Vercel de datacenter). Çözüm: residential IP (Termux köprüsü) + Cloudflare Tunnel.

**Kanıtlanan gerçekler:**
- Termux köprüsü (curl_cffi) + kaynak ÇALIŞIYOR: `curl 127.0.0.1:8080/lenstedreal_stream/mono.m3u8 → 200 #EXTM3U`.
- Köprü `0.0.0.0`'a bağlanmalı (IPv6-only bind = cloudflared ulaşamıyor). Düzeltilmiş `termux_server.py` verildi.
- Quick tunnel'lar wormdemon'un lokal `config.yml`'ini (`40d90341` cred) yüklediği için bozuluyordu.
- wormdemon (tunnelID `40d90341`) lokal-config'li, `lenstedreal.info` köküne bağlı — DOKUNULMAYACAK.

**Kalıcı çözüm planı (kullanıcı yapacak):** Yeni domain al → Cloudflare'e ekle → Termux'ta AYRI config'li
(`~/.cloudflared/banban.yml`) named tunnel kur → `stream.YENIDOMAIN.com` → `http://localhost:8080`.
Sonra tek satır: `.env` (preview) / Vercel env → `FEATURED_SOURCE_URL=https://stream.YENIDOMAIN.com/lenstedreal_stream/mono.m3u8`.

### Env değişkenleri
- FEATURED_SOURCE_URL (tünel m3u8), FEATURED_CHANNEL (default bein1), FEATURED_NAME, FEATURED_SEGMENT_BASE (opsiyonel).

## Ortam
- Admin: admin@banbansports.com / 200cf39563dc85abb595c284 (local `test_database`).
- Preview MONGO_URL lokaldir (prod Atlas'a dokunulmaz). Vercel env variables dashboard'da.

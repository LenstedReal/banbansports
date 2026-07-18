# banbansports — PRD / Changelog

## CHANGELOG — 2026-07-18 (E1 — Öne Çıkan Maç)

GitHub'dan orijinal repo **sıfırdan** çekildi (orijinal tasarım korundu). Yeni özellik:
**Öne Çıkan Maç** — günün önemli yayınını (tünellenmiş residential kaynak) gösteren
ayrı, kompakt bir bölme + otomatik kanal-LED entegrasyonu.

### Backend (`app/routers/featured.py`, `_backend_app` senkron, Vercel `api/index.py`'e kayıtlı)
- `FEATURED_SOURCE_URL` (cloudflared/ngrok tüneli — residential Termux köprüsü) düz `httpx` ile proxy'lenir
  (tünel datacenter'dan erişilebilir; curl_cffi gerekmez).
- `/api/featured/status` (30sn cache) → `{live, channel, name, configured}`. 200+#EXTM3U → live.
- `/api/featured/stream.m3u8` → manifest proxy; MUTLAK segment URL'leri olduğu gibi bırakılır
  (tarayıcı=residential IP doğrudan CDN'den çeker → datacenter engeli yok), göreliler seg_base ile mutlaklaştırılır.
- `FEATURED_CHANNEL` (varsayılan bein1) hangi kanalın yeşile döneceğini belirler.

### Frontend
- `components/FeaturedBroadcast.tsx` — MatchCenter ile VideoPlayer arasında **kompakt şerit** (~150px, ekran kaplamaz).
  Canlıysa yeşil "CANLI" + muted önizleme + aktif "İZLE"; değilse turuncu "BEKLEMEDE".
- `İZLE` → `bb:select-channel` event → ana VideoPlayer'da o kanalı seçer → reklam/kalite/failover/cast dahil TÜM işlevler.
- `VideoPlayer.tsx`: `/api/featured/status` polling → map'li kanalın (beIN) LED'i canlıysa YEŞİL + "CANLI" flag + glow geçiş efekti; kaynak `/api/featured/stream.m3u8`.

### Kanıtlanan
- Erişilebilir kaynakla (mux test yayını) uçtan uca doğrulandı: status live, master→child→segment 200,
  beIN LED yeşil, kompakt bölme + oynatım.

### DOĞRULANMADI (dış bağımlılık)
- Kullanıcının gerçek tüneli (`*.trycloudflare.com`) + Termux köprüsü test anında 404/530 döndü
  (Python köprüsü cevap vermedi veya hedef `tzy.zirvedesin236.cfd` ölü). Kod hazır; köprü canlı m3u8
  döndüğü an sistem çalışır. Tünel URL'i her restart'ta değişir → `.env` (preview) / Vercel env (prod) güncellenmeli.

### ÖNEMLİ TEKNİK GERÇEK
`tzy.zirvedesin236.cfd` gibi kaynaklar datacenter IP'lerini Cloudflare ile 403'ler (Python curl_cffi + Node cycletls + Node fetch = hepsi 403).
Vercel de datacenter → doğrudan çekemez. Çözüm: residential IP (Termux) + tünel. Bu bir ağ meselesidir, kod meselesi değil.

## Ortam
- Admin: admin@banbansports.com / 200cf39563dc85abb595c284 (local `test_database`).
- Preview MONGO_URL lokaldir (prod Atlas'a dokunulmaz). Vercel env variables dashboard'da.

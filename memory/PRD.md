# banbansports v4.2 — PRD (FINAL)

## Mevcut Durum (Pod'da CANLI)
- ✅ TRT 1, TV 8, TRT Haber, S Sport, Tivibu Spor → 5 kanalın hepsi `ok:true`, m3u8 HTTP 200, segment akıyor
- ❌ TRT Spor → token expire (CDN boş response) → maintenance
- ❌ beIN 1, ATV → token yok → maintenance

## Token Yenileme Mantığı (kullanıcı onaylı)
- **REACTIVE (mevcut, otomatik)**: Sadece master m3u8 401/403/404/410 dönerse `try_auto_refresh()` çağrılır. Canlı token'a HİÇ DOKUNULMAZ.
- **CRON (devre dışı bırakıldı, vercel.json)**: Vercel internal cron kaldırıldı. Dış cron-jobs.org kullanılacak — 12 saatte bir `is_token_valid()` check, sadece kırıkları yeniler.

## Düzeltilen Bug'lar (bu session)
1. ✅ `frontend/requirements.txt`'e motor/pymongo/bcrypt/pyjwt eklendi (Vercel slim crash giderildi)
2. ✅ `api/index.py` JWT_SECRET placeholder + safe_include + stream_generic + bootstrap
3. ✅ Channels & stream_registry sync (frontend/_backend_app ↔ backend/app)
4. ✅ Tivibu Spor stream_id `t1` → `ss11` (kullanıcı verification)
5. ✅ S Sport stream_id `ss11`'e restore (token+stream_id eşleşmesi)
6. ✅ HLS `lowLatencyMode: true` → `false` + liveSyncDurationCount=3 (segment 404 fix)
7. ✅ HLS fragLoadingMaxRetry/levelLoadingMaxRetry eklendi (auto-recovery)
8. ✅ FPS counter sample window 1s → 2s (CPU tasarrufu)
9. ✅ Fallback rAF loop setInterval'a düşürüldü (düşük güçlü cihazda smooth)
10. ✅ Vercel cron `vercel.json`'dan kaldırıldı (kullanıcı isteği)
11. ✅ TRT Spor + S Sport UI/backend channel mapping doğru senkronize
12. ✅ Tüm emergent kalıntıları temizlendi (kod tarafı)

## Vercel Deploy Talimatı (USER)
- 18 env'i Vercel Dashboard'a ekle (`/app/VERCEL_ENV.txt`'te kopyala-yapıştır hazır)
- Save to GitHub → otomatik build
- cron-jobs.org'da `GET /api/internal/refresh-all?secret=A7x9kL2pQ5wR1` her 12 saatte bir

## Backlog
- [ ] TRT Spor için yeni token al
- [ ] beIN 1 için ST11_TOKEN
- [ ] (Opsiyonel) Manuel set-token admin endpoint
- [ ] (Opsiyonel) Stream proxy → Cloudflare Workers (bandwidth tasarrufu)

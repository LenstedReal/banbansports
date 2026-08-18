# DEPLOY & OPS NOTLARI — ASLA SİLME (kullanıcı talimatı)

## Vercel Environment Variables (prod'da gerekli — kullanıcı 2026-08 paylaştı)
- JWT_SECRET, ADMIN_EMAIL=admin@banbansports.com, ADMIN_PASSWORD, CRON_SECRET
- Yayın token'ları: TRT1_TOKEN/TMS, TV8_TOKEN/TMS, TRTHABER_TOKEN/TMS, SSPORT_TOKEN/TMS, TIVIBUSPOR_TOKEN/TMS, TRTSPOR_TOKEN/TMS/SID
- MONGO_URL=Atlas (banbansports), DB_NAME=banbansports, CORS_ORIGINS=https://banbansports.vercel.app
- FEATURED_SOURCE_URL=https://stream.lenstedreal.xyz/lenstedreal_stream/mono.m3u8, FEATURED_CHANNEL=bein1, FEATURED_NAME=beINSPORTS1
- Gerçek secret DEĞERLERİ bu dosyaya yazılmaz; kullanıcının Vercel panelinde ve backend/.env'de tutulur.
- NOT: Yayın token'ları (TOKEN/TMS) süreli — yayın ölürse kullanıcı yeniler.

## Stream server operasyonu (kullanıcının kendi sunucusunda)
1) Yayın ölünce / kaynak değişince:
   pkill -9 -f stream_server
   nohup python3 stream_server.py > stream.log 2>&1 &
2) Cloudflare tüneli (http2 ŞART):
   pkill -9 -f cloudflared
   nohup cloudflared tunnel --protocol http2 --config ~/.cloudflared/banban.yml run banban-stream > cf.log 2>&1 &
3) Kaynak .cfd adresi değişirse: nano stream_server.py → SOURCE satırını güncelle → 1'i tekrarla
   Test: curl https://stream.lenstedreal.xyz/lenstedreal_stream/mono.m3u8 | head -3  (#EXTM3U görünmeli)

## KRİTİK MİMARİ NOT — 3 backend kopyası senkron tutulmalı
- backend/app/ (dev/preview) ↔ frontend/_backend_app/ (Vercel mirror) ↔ frontend/api/index.py (Vercel entry)
- Backend'de yapılan HER değişiklik (özellikle boxoffice.py) üç yerde de eşitlenmeli, yoksa
  "preview'de çalışıyor, Vercel/Chrome'da eski davranış" hatası oluşur (bilet fiyatı/seyirci sync hatası bunun sonucuydu).
- Frontend değişikliklerinde sw.js SW_VERSION bump edilmeli (kullanıcı cihaz cache'i).

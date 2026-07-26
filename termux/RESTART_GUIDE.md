# TERMUX YAYIN ALTYAPISI — YENİDEN BAŞLATMA REHBERİ (lenstedreal)

Zincir: Kaynak (.cfd, Cloudflare korumalı) → Termux stream_server.py (port 8080)
→ cloudflared named tunnel (banban-stream) → https://stream.lenstedreal.xyz → site backend'i.

## 1) Stream server'ı (yeniden) başlat
```
cd ~
pkill -9 -f stream_server
nohup python3 stream_server.py > stream.log 2>&1 &
tail -f stream.log        # "Manifest 15 sn onbellegi guncellendi" görmelisin (CTRL+C ile çık)
```
Yerel test: `curl -s http://127.0.0.1:8080/lenstedreal_stream/mono.m3u8 | head -5`
(#EXTM3U görünmeli)

## 2) Cloudflare tünelini (yeniden) başlat
Tünel adı: banban-stream — UUID: 513a0c00-f112-4731-a7af-957e4766ad7b
Config: ~/.cloudflared/banban.yml (hostname stream.lenstedreal.xyz → localhost:8080)
```
pkill -9 -f cloudflared
nohup cloudflared tunnel --protocol http2 --config ~/.cloudflared/banban.yml run banban-stream > cf.log 2>&1 &
tail -f cf.log            # "Registered tunnel connection" görmelisin
```
NOT: `--protocol http2` ŞART (ISP UDP/QUIC engeli var).

Dış test: `curl -s https://stream.lenstedreal.xyz/lenstedreal_stream/mono.m3u8 | head -3`

## 3) Kaynak (.cfd) adresi DEĞİŞİRSE
Kaynak site domain değiştirir (örn. zirvedesin236 → zirvedesin237):
```
nano ~/stream_server.py    # SOURCE = "https://tzy.zirvedesinXXX.cfd/zirve/mono.m3u8" satırını güncelle
pkill -9 -f stream_server
nohup python3 stream_server.py > stream.log 2>&1 &
```
Tünel ve stream.lenstedreal.xyz adresi SABİT kalır, sitede hiçbir şey değişmez.

## 4) Telefon yeniden başladıysa (tam sıfırdan)
```
cd ~
nohup python3 stream_server.py > stream.log 2>&1 &
nohup cloudflared tunnel --protocol http2 --config ~/.cloudflared/banban.yml run banban-stream > cf.log 2>&1 &
```
Termux'un arka planda ölmemesi için: Termux ayarlarından "Acquire wakelock" aç.

## 5) Gerekli paketler (sadece ilk kurulumda / format sonrası)
```
pkg update && pkg install python cloudflared nano
pip install flask curl_cffi
```
cloudflared login/config zaten yapılmıştı; format atılırsa:
`cloudflared tunnel login` → `cloudflared tunnel run banban-stream` (mevcut UUID ile).

## Kontrol listesi (yayın gelmiyor?)
1. `curl http://127.0.0.1:8080/` → "lenstedreal streamradar aktif" mı? Değilse Adım 1.
2. `curl https://stream.lenstedreal.xyz/` → aynı yazı mı? Değilse Adım 2.
3. İkisi de OK ama site oynatmıyorsa → kaynak .cfd değişmiştir → Adım 3.

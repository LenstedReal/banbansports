"""
banbansports — Termux yayın köprüsü (residential IP + Cloudflare bypass)
========================================================================
Telefonun ev IP'sinden Cloudflare korumalı .cfd yayınını çeker, TEMİZ bir
HLS (m3u8) yayınına çevirir ve 8080 portunda servis eder. cloudflared tüneli
bunu internete açar.

ÖNEMLİ: Segmentler de Termux üzerinden proxy'lenir → .cfd segment adresleri
değişse bile sorun olmaz (her manifest isteğinde güncel adresler çekilir).

Kurulum (Termux):
    pkg update && pkg install python -y
    pip install flask curl_cffi
    python stream_server.py
"""
from flask import Flask, Response, request
from curl_cffi import requests
import urllib.parse

# ============ AYARLAR (yalnızca burayı düzenle) ============
# Kaynak .cfd değişirse SADECE bu satırı güncelle:
SOURCE  = "https://tzy.zirvedesin236.cfd/zirve/mono.m3u8"
REFERER = "https://fanatiktv5.com/"
PORT    = 8080
# Tünelde görünecek yol (backend bunu bekliyor). Değiştirmene gerek yok:
MANIFEST_PATH = "/zirve/mono.m3u8"
# ===========================================================

app = Flask(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Referer": REFERER,
}


def _fetch(url: str):
    return requests.get(url, headers=HEADERS, impersonate="chrome120", timeout=12)


@app.route(MANIFEST_PATH)
def manifest():
    try:
        r = _fetch(SOURCE)
        if r.status_code != 200 or not r.text.lstrip().startswith("#EXTM3U"):
            return Response(f"kaynak hata: {r.status_code}", status=502)
        out = []
        for line in r.text.split("\n"):
            s = line.strip()
            if s and not s.startswith("#"):
                # Segment satırı → Termux üzerinden proxy'le (bypass + gizli IP)
                abs_url = urllib.parse.urljoin(SOURCE, s)
                out.append("/seg?u=" + urllib.parse.quote(abs_url, safe=""))
            else:
                out.append(line)
        return Response("\n".join(out),
                        mimetype="application/vnd.apple.mpegurl",
                        headers={"Access-Control-Allow-Origin": "*",
                                 "Cache-Control": "no-cache, no-store, must-revalidate"})
    except Exception as e:
        return Response(f"hata: {e}", status=502)


@app.route("/seg")
def seg():
    u = request.args.get("u", "")
    if not u:
        return Response("segment yok", status=400)
    try:
        r = _fetch(u)
        return Response(r.content, mimetype="video/mp2t",
                        headers={"Access-Control-Allow-Origin": "*"})
    except Exception as e:
        return Response(f"segment hata: {e}", status=502)


@app.route("/")
def health():
    return "banbansports yayin koprusu calisiyor ✓"


if __name__ == "__main__":
    print(f"[*] Yayin koprusu :{PORT}{MANIFEST_PATH} adresinde basladi")
    # threaded=True ŞART: oynatıcı manifest + segmentleri aynı anda ister
    app.run(host="0.0.0.0", port=PORT, threaded=True)

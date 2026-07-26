import time
import threading
import urllib.parse
from flask import Flask, Response, request
from curl_cffi import requests

PORT = 8080
SOURCE = "https://tzy.zirvedesin236.cfd/zirve/mono.m3u8"
REFERER = "https://fanatiktv5.com/"
CACHE_TTL = 15  # 15 saniyelik yenileme periyodu

app = Flask(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Referer": REFERER,
}

cache = {
    "content": None,
    "last_updated": 0,
    "lock": threading.Lock()
}

def fetch_manifest():
    try:
        r = requests.get(SOURCE, headers=HEADERS, impersonate="chrome120", timeout=8)
        if r.status_code == 200 and r.text.lstrip().startswith("#EXTM3U"):
            out = []
            for line in r.text.split("\n"):
                s = line.strip()
                if s and not s.startswith("#"):
                    abs_url = urllib.parse.urljoin(SOURCE, s)
                    out.append("/seg?u=" + urllib.parse.quote(abs_url, safe=""))
                else:
                    out.append(line)
            return "\n".join(out)
    except Exception as e:
        print(f"[-] Manifest cekme hatasi: {e}")
    return None

def get_cached_manifest():
    now = time.time()
    with cache["lock"]:
        if cache["content"] is None or (now - cache["last_updated"]) > CACHE_TTL:
            new_content = fetch_manifest()
            if new_content:
                cache["content"] = new_content
                cache["last_updated"] = now
                print(f"[+] lenstedreal | Manifest 15 sn onbellegi guncellendi ({time.strftime('%H:%M:%S')})")
        return cache["content"]

@app.route("/lenstedreal_stream/mono.m3u8")
def manifest():
    content = get_cached_manifest()
    if content:
        return Response(
            content,
            mimetype="application/vnd.apple.mpegurl",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache, no-store, must-revalidate"
            }
        )
    return Response("Kaynak hatasi", status=502)

@app.route("/seg")
def seg():
    u = request.args.get("u", "")
    if not u:
        return Response("Segment yok", status=400)
    try:
        r = requests.get(u, headers=HEADERS, impersonate="chrome120", timeout=10)
        if r.status_code == 200:
            return Response(
                r.content,
                mimetype="video/mp2t",
                headers={"Access-Control-Allow-Origin": "*"}
            )
    except Exception as e:
        print(f"[-] Segment hatasi: {e}")
    return Response("Segment hatasi", status=502)

@app.route("/")
def health():
    return "lenstedreal streamradar aktif"

if __name__ == "__main__":
    print(f"[*] lenstedreal | StreamRadar Altyapisi Aktif")
    print(f"[*] Istasyon: http://127.0.0.1:{PORT}/lenstedreal_stream/mono.m3u8")
    app.run(host="0.0.0.0", port=PORT, threaded=True)

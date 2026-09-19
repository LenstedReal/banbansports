var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var enc = new TextEncoder();
function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4)
    s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++)
    out[i] = bin.charCodeAt(i);
  return out;
}
__name(b64urlToBytes, "b64urlToBytes");
async function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3)
    return null;
  let header, payload;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  } catch {
    return null;
  }
  if (header.alg !== "HS256")
    return null;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  if (!ok)
    return null;
  const now = Math.floor(Date.now() / 1e3);
  if (typeof payload.exp !== "number" || payload.exp <= now)
    return null;
  if (payload.scope !== "hls")
    return null;
  return payload;
}
__name(verifyJwt, "verifyJwt");
function hostSource(env, host) {
  try {
    const map = JSON.parse(env.HOST_SRC_MAP || "{}");
    return map[host] || null;
  } catch {
    return null;
  }
}
__name(hostSource, "hostSource");
function basicOk(request, env) {
  const h = request.headers.get("Authorization") || "";
  if (!h.startsWith("Basic "))
    return false;
  let decoded = "";
  try {
    decoded = atob(h.slice(6));
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  if (i < 0)
    return false;
  return decoded.slice(0, i) === env.BASIC_USER && decoded.slice(i + 1) === env.BASIC_PASS;
}
__name(basicOk, "basicOk");
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const h = new Headers();
  if (origin && (allowed.includes("*") || allowed.includes(origin))) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Vary", "Origin");
  }
  h.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Range, Authorization, Content-Type");
  h.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
  h.set("Access-Control-Max-Age", "86400");
  return h;
}
__name(corsHeaders, "corsHeaders");
function deny(status, text, request, env, extra = {}) {
  const h = corsHeaders(request, env);
  h.set("Content-Type", "text/plain; charset=utf-8");
  h.set("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(extra))
    h.set(k, v);
  return new Response(text, { status, headers: h });
}
__name(deny, "deny");
function isManifest(pathname) {
  return /\.m3u8$/i.test(pathname);
}
__name(isManifest, "isManifest");
function rewriteManifest(text, token) {
  if (!token)
    return text;
  return text.split("\n").map((line) => {
    const t = line.trim();
    if (!t)
      return line;
    if (t.startsWith("#")) {
      return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${appendToken(u, token)}"`);
    }
    return appendToken(t, token);
  }).join("\n");
}
__name(rewriteManifest, "rewriteManifest");
function appendToken(u, token) {
  if (/[?&]token=/.test(u))
    return u.replace(/([?&])token=[^&]*/, `$1token=${token}`);
  return u + (u.includes("?") ? "&" : "?") + "token=" + token;
}
__name(appendToken, "appendToken");
async function fromR2(bucket, key, request) {
  const range = request.headers.get("Range");
  const opts = {};
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      if (m[1] && m[2])
        opts.range = { offset: +m[1], length: +m[2] - +m[1] + 1 };
      else if (m[1])
        opts.range = { offset: +m[1] };
      else if (m[2])
        opts.range = { suffix: +m[2] };
    }
  }
  const obj = await bucket.get(key, opts);
  if (!obj)
    return null;
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("ETag", obj.httpEtag);
  h.set("Accept-Ranges", "bytes");
  let status = 200;
  if (opts.range && obj.range) {
    const start = obj.range.offset ?? 0;
    const end = start + (obj.range.length ?? obj.size - start) - 1;
    h.set("Content-Range", `bytes ${start}-${end}/${obj.size}`);
    h.set("Content-Length", String(end - start + 1));
    status = 206;
  } else {
    h.set("Content-Length", String(obj.size));
  }
  return new Response(request.method === "HEAD" ? null : obj.body, { status, headers: h });
}
__name(fromR2, "fromR2");
async function serveMedia(request, env, url, token) {
  const src = hostSource(env, url.hostname);
  const bucket = src === "dub" ? env.R2_DUB : src === "sub" ? env.R2_SUB : null;
  const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  let resp;
  if (bucket) {
    resp = await fromR2(bucket, key, request);
    if (!resp)
      return deny(404, "Not Found", request, env);
  } else {
    const originUrl = new URL(url.toString());
    originUrl.search = "";
    const fwd = new Request(originUrl.toString(), { method: request.method, headers: { Range: request.headers.get("Range") || "" } });
    resp = await fetch(fwd, { cf: { cacheEverything: true, cacheTtl: 3600 } });
    if (!resp.ok && resp.status !== 206)
      return deny(resp.status === 404 ? 404 : 502, "Origin error", request, env);
  }
  const headers = new Headers(resp.headers);
  for (const [k, v] of corsHeaders(request, env))
    headers.set(k, v);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.delete("Set-Cookie");
  if (isManifest(url.pathname)) {
    const text = await resp.text();
    headers.set("Content-Type", "application/vnd.apple.mpegurl");
    headers.set("Cache-Control", "no-store");
    headers.delete("Content-Length");
    headers.delete("ETag");
    return new Response(request.method === "HEAD" ? null : rewriteManifest(text, token), { status: 200, headers });
  }
  if (!headers.get("Content-Type") || /octet-stream/.test(headers.get("Content-Type"))) {
    if (/\.ts$/i.test(url.pathname))
      headers.set("Content-Type", "video/MP2T");
    else if (/\.m4s$/i.test(url.pathname))
      headers.set("Content-Type", "video/iso.segment");
  }
  headers.set("Cache-Control", "private, max-age=3600");
  return new Response(resp.body, { status: resp.status, headers });
}
__name(serveMedia, "serveMedia");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return deny(405, "Method Not Allowed", request, env);
    }
    if (!env.STREAM_JWT_SECRET)
      return deny(500, "Worker misconfigured: STREAM_JWT_SECRET", request, env);
    let token = url.searchParams.get("token") || "";
    const auth = request.headers.get("Authorization") || "";
    if (!token && auth.startsWith("Bearer "))
      token = auth.slice(7).trim();
    if (token) {
      const payload = await verifyJwt(token, env.STREAM_JWT_SECRET);
      if (!payload)
        return deny(403, "Forbidden: token invalid or expired", request, env);
      const expected = hostSource(env, url.hostname);
      if (expected && payload.src !== expected)
        return deny(403, "Forbidden: source mismatch", request, env);
      return serveMedia(request, env, url, token);
    }
    if (env.BASIC_USER && env.BASIC_PASS && basicOk(request, env)) {
      return serveMedia(request, env, url, "");
    }
    return deny(401, "Unauthorized", request, env, {
      "WWW-Authenticate": 'Basic realm="banbansports korumali yayin", charset="UTF-8"'
    });
  }
};
export {
  src_default as default
};
//# sourceMappingURL=index.js.map

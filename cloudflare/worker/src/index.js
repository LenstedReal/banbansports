/**
 * banbansports — HLS Koruma Worker'ı (V2.1: HMAC + legacy JWT + Basic Auth)
 * Route'lar: stream.lenstedreal.xyz/*  (dub)   ·  stream1.lenstedreal.xyz/*  (sub)
 *
 * Katman sırası (çakışmasız):
 *   1) ?sig= VARSA → HMAC-SHA256 doğrula (exp, sid, did, m, st, [cs])
 *        msg = host|st|src|sid|did|exp|m[|cs]   secret: cs varsa STREAM_CAST_SECRET, yoksa STREAM_TOKEN_SECRET
 *        geçerli → 200 medya (m3u8 satırlarına aynı param seti basılır)
 *        geçersiz → WORKER_ENFORCE=true ise 403; false (shadow) ise logla + servis et
 *   2) ?token= (veya Authorization: Bearer) VARSA ve ALLOW_LEGACY_JWT!=false → HS256 JWT (mevcut yol)
 *   3) Yoksa → HTTP Basic Auth (harici istemci: Chrome / VLC / ffmpeg) → 401 + WWW-Authenticate
 *
 * Doğrulama sonrası segmentler caches.default üzerinden (key = param'sız URL) → R2 Class-B op düşer.
 * Doğrulama cache'ten ÖNCE çalışır; kimse başkasının yetkisiyle cevap alamaz. Manifest asla cache'lenmez.
 * Tokenlı istekte CORS * (Cast receiver), tokensız/Basic'te ALLOWED_ORIGINS.
 *
 * Secrets (wrangler secret put): STREAM_JWT_SECRET, STREAM_TOKEN_SECRET, STREAM_CAST_SECRET, BASIC_USER, BASIC_PASS
 * Vars (wrangler.toml): HOST_SRC_MAP, ALLOWED_ORIGINS, WORKER_ENFORCE, ALLOW_LEGACY_JWT
 * Opsiyonel R2 binding: R2_DUB / R2_SUB (varsa medya doğrudan bucket'tan okunur; yoksa origin'e fetch)
 * Log: yalnızca sid parmak izi (sha256 ilk 10 hex) — tam URL / token / imza ASLA loglanmaz.
 */

const enc = new TextEncoder();
const AUTH_PARAMS = ['token', 'exp', 'sid', 'did', 'm', 'st', 'cs', 'sig'];

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hexToBytes(h) {
  if (!/^[0-9a-f]+$/i.test(h) || h.length % 2) return null;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function flag(env, name, def) {
  const v = (env[name] ?? '').toString().trim().toLowerCase();
  if (!v) return def;
  return v === 'true' || v === '1' || v === 'yes';
}

async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function fp(s) { return (await sha256hex(s || '')).slice(0, 10); }

function log(ev, extra = {}) {
  try { console.log(JSON.stringify({ ev, ...extra })); } catch { /* noop */ }
}

/* ---------- 1) HMAC katmanı ---------- */
async function verifyHmac(url, env) {
  const q = url.searchParams;
  const exp = q.get('exp'), sid = q.get('sid'), did = q.get('did'), m = q.get('m'), st = q.get('st'), sig = q.get('sig'), cs = q.get('cs') || '';
  if (!exp || !sid || !did || !m || !st || !sig) return { ok: false, reason: 'missing_param' };
  const expN = Number(exp);
  if (!Number.isFinite(expN) || expN <= Math.floor(Date.now() / 1000)) return { ok: false, reason: 'expired' };
  const src = hostSource(env, url.hostname);
  if (!src) return { ok: false, reason: 'host_unmapped' };
  const secret = cs ? env.STREAM_CAST_SECRET : env.STREAM_TOKEN_SECRET;
  if (!secret) return { ok: false, reason: cs ? 'no_cast_secret' : 'no_token_secret' };
  const sigBytes = hexToBytes(sig);
  if (!sigBytes || sigBytes.length !== 32) return { ok: false, reason: 'bad_sig_format' };
  const msg = [url.hostname, st, src, sid, did, exp, m].concat(cs ? [cs] : []).join('|');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(msg));
  if (!ok) return { ok: false, reason: 'bad_sig' };
  return { ok: true, sid, m, cast: !!cs };
}

/* ---------- 2) Legacy JWT katmanı (mevcut) ---------- */
async function verifyJwt(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  let header, payload;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  } catch { return null; }
  if (header.alg !== 'HS256') return null;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  let ok = false;
  try { ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`)); } catch { return null; }
  if (!ok) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
  if (payload.scope !== 'hls') return null;
  return payload;
}

function hostSource(env, host) {
  try {
    const map = JSON.parse(env.HOST_SRC_MAP || '{}');
    return map[host] || null;
  } catch { return null; }
}

/* ---------- 3) Basic Auth katmanı (mevcut, aynen) ---------- */
function basicOk(request, env) {
  const h = request.headers.get('Authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  let decoded = '';
  try { decoded = atob(h.slice(6)); } catch { return false; }
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  return decoded.slice(0, i) === env.BASIC_USER && decoded.slice(i + 1) === env.BASIC_PASS;
}

function corsHeaders(request, env, anyOrigin = false) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const h = new Headers();
  if (anyOrigin) {
    h.set('Access-Control-Allow-Origin', '*');   // Cast receiver / Safari native — tokenlı istek zaten imzalı
  } else if (origin && (allowed.includes('*') || allowed.includes(origin))) {
    h.set('Access-Control-Allow-Origin', origin);
    h.set('Vary', 'Origin');
  }
  h.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type');
  h.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  h.set('Access-Control-Max-Age', '86400');
  return h;
}

function deny(status, text, request, env, extra = {}) {
  const h = corsHeaders(request, env, true);
  h.set('Content-Type', 'text/plain; charset=utf-8');
  h.set('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(text, { status, headers: h });
}

function isManifest(pathname) { return /\.m3u8$/i.test(pathname); }

/* ---------- Manifest rewrite: auth = {kind:'hmac', query} | {kind:'jwt', token} ---------- */
function rewriteManifest(text, auth) {
  if (!auth || auth.kind === 'basic') return text;
  return text.split('\n').map((line) => {
    const t = line.trim();
    if (!t) return line;
    if (t.startsWith('#')) {
      // #EXT-X-KEY / #EXT-X-MAP gibi URI="..." içeren tag'ler
      return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${appendAuth(u, auth)}"`);
    }
    return appendAuth(t, auth);
  }).join('\n');
}

/* Satırdaki eski auth param'larını ayıklar, gelen seti basar (mevcut appendToken genişletildi) */
function appendAuth(u, auth) {
  const [pathPart, queryPart = ''] = u.split('?');
  const kept = queryPart.split('&').filter((kv) => kv && !AUTH_PARAMS.includes(kv.split('=')[0]));
  const authQs = auth.kind === 'hmac' ? auth.query : `token=${auth.token}`;
  return pathPart + '?' + kept.concat([authQs]).join('&');
}
function appendToken(u, token) { return appendAuth(u, { kind: 'jwt', token }); }

function hmacQuery(url) {
  const q = new URLSearchParams();
  for (const k of ['exp', 'sid', 'did', 'm', 'st', 'cs', 'sig']) {
    const v = url.searchParams.get(k);
    if (v) q.set(k, v);
  }
  return q.toString();
}

async function fromR2(bucket, key, request) {
  const range = request.headers.get('Range');
  const opts = {};
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      if (m[1] && m[2]) opts.range = { offset: +m[1], length: +m[2] - +m[1] + 1 };
      else if (m[1]) opts.range = { offset: +m[1] };
      else if (m[2]) opts.range = { suffix: +m[2] };
    }
  }
  const obj = await bucket.get(key, opts);
  if (!obj) return null;
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('ETag', obj.httpEtag);
  h.set('Accept-Ranges', 'bytes');
  let status = 200;
  if (opts.range && obj.range) {
    const start = obj.range.offset ?? 0;
    const end = start + (obj.range.length ?? obj.size - start) - 1;
    h.set('Content-Range', `bytes ${start}-${end}/${obj.size}`);
    h.set('Content-Length', String(end - start + 1));
    status = 206;
  } else {
    h.set('Content-Length', String(obj.size));
  }
  return new Response(request.method === 'HEAD' ? null : obj.body, { status, headers: h });
}

async function fetchOrigin(request, env, url) {
  const src = hostSource(env, url.hostname);
  const bucket = src === 'dub' ? env.R2_DUB : src === 'sub' ? env.R2_SUB : null;
  const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (bucket) {
    const resp = await fromR2(bucket, key, request);
    return resp || deny(404, 'Not Found', request, env);
  }
  // Binding yoksa: aynı hostname'e (R2 custom domain / origin) tokensız temiz istek. Worker kendini tetiklemez.
  const originUrl = new URL(url.toString());
  originUrl.search = '';
  const fwd = new Request(originUrl.toString(), { method: request.method, headers: { Range: request.headers.get('Range') || '' } });
  const resp = await fetch(fwd, { cf: { cacheEverything: true, cacheTtl: 3600 } });
  if (!resp.ok && resp.status !== 206) return deny(resp.status === 404 ? 404 : 502, 'Origin error', request, env);
  return resp;
}

function contentTypeFix(headers, pathname) {
  if (!headers.get('Content-Type') || /octet-stream/.test(headers.get('Content-Type'))) {
    if (/\.ts$/i.test(pathname)) headers.set('Content-Type', 'video/MP2T');
    else if (/\.m4s$/i.test(pathname)) headers.set('Content-Type', 'video/iso.segment');
    else if (/\.mp4$/i.test(pathname)) headers.set('Content-Type', 'video/mp4');
  }
}

/* Doğrulama SONRASI çağrılır. auth.kind: hmac | jwt | basic */
async function serveMedia(request, env, ctx, url, auth) {
  const tokened = auth.kind !== 'basic';
  const manifest = isManifest(url.pathname);
  const cacheKey = new Request(`${url.origin}${url.pathname}`, { method: 'GET' });
  const cache = (!manifest && request.method === 'GET' && !request.headers.get('Range') && globalThis.caches?.default) ? caches.default : null;

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const headers = new Headers(hit.headers);
      for (const [k, v] of corsHeaders(request, env, tokened)) headers.set(k, v);
      headers.set('X-BB-Cache', 'HIT');
      return new Response(hit.body, { status: hit.status, headers });
    }
  }

  const resp = await fetchOrigin(request, env, url);
  if (resp.status >= 400) return resp;

  const headers = new Headers(resp.headers);
  for (const [k, v] of corsHeaders(request, env, tokened)) headers.set(k, v);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.delete('Set-Cookie');

  if (manifest) {
    const text = await resp.text();
    headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    headers.set('Cache-Control', 'no-store');   // token'lı manifest kişiye özeldir, cache'lenmez
    headers.delete('Content-Length');
    headers.delete('ETag');
    return new Response(request.method === 'HEAD' ? null : rewriteManifest(text, auth), { status: 200, headers });
  }
  contentTypeFix(headers, url.pathname);
  headers.set('Cache-Control', 'private, max-age=3600'); // tarayıcı cache'i serbest, paylaşımlı cache yok

  if (cache && resp.status === 200) {
    // Edge cache kopyası: param'sız anahtar, auth header'sız; doğrulama her istekte cache'ten ÖNCE yapılır
    const ch = new Headers(headers);
    ch.set('Cache-Control', 'public, max-age=3600');
    ch.delete('Access-Control-Allow-Origin'); ch.delete('Vary');
    const [body, copy] = resp.body.tee();
    const put = cache.put(cacheKey, new Response(copy, { status: 200, headers: ch }));
    if (ctx?.waitUntil) ctx.waitUntil(put); else await put;
    headers.set('X-BB-Cache', 'MISS');
    return new Response(body, { status: 200, headers });
  }
  return new Response(resp.body, { status: resp.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env, !!(url.searchParams.get('sig') || url.searchParams.get('token'))) });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return deny(405, 'Method Not Allowed', request, env);
    }
    const enforce = flag(env, 'WORKER_ENFORCE', false);          // false → shadow (logla, servis et)
    const legacyJwt = flag(env, 'ALLOW_LEGACY_JWT', true);       // geçiş sonrası false → ?token= yolu kapanır

    // --- 1) HMAC KATMANI (V2.1 player / Cast / backend proxy) ---
    if (url.searchParams.get('sig')) {
      const v = await verifyHmac(url, env);
      const sidfp = await fp(url.searchParams.get('sid'));
      if (!v.ok) {
        log('hmac_fail', { host: url.hostname, path: url.pathname, reason: v.reason, sid_fp: sidfp, enforce });
        if (enforce) return deny(403, 'Forbidden: signature invalid or expired', request, env);
      }
      return serveMedia(request, env, ctx, url, { kind: 'hmac', query: hmacQuery(url) });
    }

    // --- 2) LEGACY JWT KATMANI (mevcut ?token= / Bearer yolu — flag ile kapanır) ---
    let token = url.searchParams.get('token') || '';
    const auth = request.headers.get('Authorization') || '';
    if (!token && auth.startsWith('Bearer ')) token = auth.slice(7).trim();

    if (token) {
      if (!legacyJwt) return deny(403, 'Forbidden: legacy token disabled', request, env);
      if (!env.STREAM_JWT_SECRET) return deny(500, 'Worker misconfigured: STREAM_JWT_SECRET', request, env);
      const payload = await verifyJwt(token, env.STREAM_JWT_SECRET);
      if (!payload) return deny(403, 'Forbidden: token invalid or expired', request, env);
      const expected = hostSource(env, url.hostname);
      if (expected && payload.src !== expected) return deny(403, 'Forbidden: source mismatch', request, env);
      return serveMedia(request, env, ctx, url, { kind: 'jwt', token });
    }

    // --- 3) BASIC AUTH KATMANI (harici istemci: Chrome / VLC / ffmpeg) ---
    if (env.BASIC_USER && env.BASIC_PASS && basicOk(request, env)) {
      return serveMedia(request, env, ctx, url, { kind: 'basic' });
    }
    return deny(401, 'Unauthorized', request, env, {
      'WWW-Authenticate': 'Basic realm="banbansports korumali yayin", charset="UTF-8"',
    });
  },
};

export { appendToken, rewriteManifest, verifyHmac };

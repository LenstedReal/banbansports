// Worker mantığı için lokal test — wrangler gerektirmez (Node 18+)
import worker from '../src/index.js';
import { createHmac } from 'node:crypto';

const SECRET = 'test-secret';
const TOKEN_SECRET = 'hmac-secret';
const CAST_SECRET = 'cast-secret';
const baseEnv = {
  STREAM_JWT_SECRET: SECRET,
  STREAM_TOKEN_SECRET: TOKEN_SECRET,
  STREAM_CAST_SECRET: CAST_SECRET,
  BASIC_USER: 'lenstedreal_marka',
  BASIC_PASS: 'zirvedeyiz',
  HOST_SRC_MAP: '{"stream.lenstedreal.xyz":"dub","stream1.lenstedreal.xyz":"sub"}',
  ALLOWED_ORIGINS: 'https://banbansports.vercel.app',
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (payload, secret = SECRET) => {
  const h = b64({ alg: 'HS256', typ: 'JWT' }), p = b64(payload);
  return `${h}.${p}.${createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')}`;
};
const now = Math.floor(Date.now() / 1000);
const good = sign({ iss: 'banbansports', scope: 'hls', src: 'dub', exp: now + 1800 });
const expired = sign({ iss: 'banbansports', scope: 'hls', src: 'dub', exp: now - 5 });
const wrongSecret = sign({ scope: 'hls', src: 'dub', exp: now + 1800 }, 'other');
const subTok = sign({ scope: 'hls', src: 'sub', exp: now + 1800 });

// HMAC (V2.1) — backend sign_hls_params ile birebir: host|st|src|sid|did|exp|m[|cs]
const hmacQs = ({ host = 'stream.lenstedreal.xyz', st = 'spiderman-bnd-4-1', src = 'dub', sid = 'sid1', did = 'did1', exp = now + 1800, m = 'js', cs = '', secret } = {}) => {
  const msg = [host, st, src, sid, did, String(exp), m].concat(cs ? [cs] : []).join('|');
  const sig = createHmac('sha256', secret || (cs ? CAST_SECRET : TOKEN_SECRET)).update(msg).digest('hex');
  const q = new URLSearchParams({ exp: String(exp), sid, did, m, st });
  if (cs) q.set('cs', cs);
  q.set('sig', sig);
  return q.toString();
};
const H = hmacQs();

// Cache API mock (caches.default)
const store = new Map();
let putCount = 0;
globalThis.caches = { default: {
  async match(req) { const r = store.get(new URL(req.url).href); return r ? r.clone() : undefined; },
  async put(req, res) { putCount++; store.set(new URL(req.url).href, res); },
} };

// origin fetch mock
let originHits = 0;
globalThis.fetch = async (req) => {
  originHits++;
  const u = new URL(req.url);
  if (u.search) return new Response('leak', { status: 500 });
  if (u.pathname.endsWith('.m3u8')) return new Response('#EXTM3U\n#EXTINF:10,\nstream0.ts\n#EXT-X-MAP:URI="init.mp4"\nstream1.ts?x=1\n', { status: 200, headers: { 'content-type': 'application/octet-stream' } });
  return new Response('TSDATA', { status: 200, headers: { 'content-type': 'video/MP2T' } });
};

const ctx = { waitUntil: () => {} };
const call = (url, headers = {}, env = baseEnv) => worker.fetch(new Request(url, { headers }), env, ctx);
let fail = 0;
const expect = async (name, p, status, check) => {
  const r = await p;
  const body = await r.text();
  const ok = r.status === status && (!check || check(r, body));
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} → ${r.status}${check && !check(r, body) ? ' (check failed) ' + body.slice(0, 120) : ''}`);
};

console.log('--- legacy JWT + Basic (mevcut davranış korunur) ---');
await expect('tokensız m3u8 → 401 + Basic', call('https://stream.lenstedreal.xyz/stream.m3u8'), 401, (r) => /Basic/.test(r.headers.get('WWW-Authenticate')));
await expect('tokensız segment → 401', call('https://stream.lenstedreal.xyz/stream0.ts'), 401);
await expect('bozuk token → 403', call('https://stream.lenstedreal.xyz/stream0.ts?token=bozuk'), 403);
await expect('süresi dolmuş → 403', call(`https://stream.lenstedreal.xyz/stream.m3u8?token=${expired}`), 403);
await expect('yanlış secret → 403', call(`https://stream.lenstedreal.xyz/stream.m3u8?token=${wrongSecret}`), 403);
await expect('dub token stream1 hostunda → 403', call(`https://stream1.lenstedreal.xyz/stream.m3u8?token=${good}`), 403);
await expect('sub token stream1 → 200', call(`https://stream1.lenstedreal.xyz/stream.m3u8?token=${subTok}`), 200);
await expect('geçerli m3u8 → 200 + rewrite', call(`https://stream.lenstedreal.xyz/stream.m3u8?token=${good}`), 200,
  (r, b) => b.includes(`stream0.ts?token=${good}`) && b.includes(`URI="init.mp4?token=${good}"`) && r.headers.get('content-type').includes('mpegurl'));
await expect('geçerli segment → 200', call(`https://stream.lenstedreal.xyz/stream0.ts?token=${good}`), 200, (_r, b) => b === 'TSDATA');
await expect('Bearer header → 200', call('https://stream.lenstedreal.xyz/stream0.ts', { Authorization: `Bearer ${good}` }), 200);
await expect('Basic doğru → 200', call('https://stream.lenstedreal.xyz/stream.m3u8', { Authorization: 'Basic ' + Buffer.from('lenstedreal_marka:zirvedeyiz').toString('base64') }), 200);
await expect('Basic yanlış → 401', call('https://stream.lenstedreal.xyz/stream.m3u8', { Authorization: 'Basic ' + Buffer.from('a:b').toString('base64') }), 401);
await expect('CORS origin (Basic → allowlist)', call('https://stream.lenstedreal.xyz/stream0.ts', { Origin: 'https://banbansports.vercel.app', Authorization: 'Basic ' + Buffer.from('lenstedreal_marka:zirvedeyiz').toString('base64') }), 200, (r) => r.headers.get('Access-Control-Allow-Origin') === 'https://banbansports.vercel.app');
await expect('legacy kapalı (ALLOW_LEGACY_JWT=false) → 403', call(`https://stream.lenstedreal.xyz/stream0.ts?token=${good}`, {}, { ...baseEnv, ALLOW_LEGACY_JWT: 'false' }), 403);

console.log('--- HMAC (shadow: WORKER_ENFORCE=false) ---');
store.clear(); putCount = 0; originHits = 0;
await expect('geçerli HMAC m3u8 → 200 + param seti her satırda', call(`https://stream.lenstedreal.xyz/stream.m3u8?${H}`), 200,
  (r, b) => b.includes(`stream0.ts?${H}`) && b.includes(`URI="init.mp4?${H}"`) && b.includes(`stream1.ts?x=1&${H}`) && r.headers.get('Cache-Control') === 'no-store');
await expect('geçerli HMAC segment → 200 + CORS *', call(`https://stream.lenstedreal.xyz/stream0.ts?${H}`, { Origin: 'https://foo.example' }), 200,
  (r, b) => b === 'TSDATA' && r.headers.get('Access-Control-Allow-Origin') === '*' && r.headers.get('X-BB-Cache') === 'MISS');
await expect('aynı segment tekrar → cache HIT (origin\'e gitmez)', call(`https://stream.lenstedreal.xyz/stream0.ts?${hmacQs({ sid: 'sid2' })}`), 200,
  (r, b) => b === 'TSDATA' && r.headers.get('X-BB-Cache') === 'HIT' && originHits === 2);
await expect('imzasız segment cache\'e RAĞMEN 401 (doğrulama önce)', call('https://stream.lenstedreal.xyz/stream0.ts'), 401);
await expect('bozuk imza (shadow) → 200 servis', call(`https://stream.lenstedreal.xyz/stream1.ts?${H.replace(/sig=[0-9a-f]{4}/, 'sig=0000')}`), 200);
await expect('m3u8 cache\'lenmez', call(`https://stream.lenstedreal.xyz/stream.m3u8?${H}`), 200, () => !store.has('https://stream.lenstedreal.xyz/stream.m3u8'));

console.log('--- HMAC (enforce: WORKER_ENFORCE=true) ---');
const E = { ...baseEnv, WORKER_ENFORCE: 'true' };
await expect('geçerli HMAC → 200', call(`https://stream.lenstedreal.xyz/stream0.ts?${H}`, {}, E), 200);
await expect('bozuk imza → 403', call(`https://stream.lenstedreal.xyz/stream0.ts?${H.replace(/sig=[0-9a-f]{4}/, 'sig=0000')}`, {}, E), 403);
await expect('süresi dolmuş → 403', call(`https://stream.lenstedreal.xyz/stream0.ts?${hmacQs({ exp: now - 1 })}`, {}, E), 403);
await expect('yanlış host (dub imzası stream1\'de) → 403', call(`https://stream1.lenstedreal.xyz/stream0.ts?${H}`, {}, E), 403);
await expect('sid değiştirilmiş → 403', call(`https://stream.lenstedreal.xyz/stream0.ts?${H.replace('sid=sid1', 'sid=hacker')}`, {}, E), 403);
await expect('m=js imzası m=native olarak → 403', call(`https://stream.lenstedreal.xyz/stream0.ts?${H.replace('m=js', 'm=native')}`, {}, E), 403);
await expect('eksik param → 403', call(`https://stream.lenstedreal.xyz/stream0.ts?sig=abcd`, {}, E), 403);
await expect('cast token (cs, CAST secret) → 200', call(`https://stream.lenstedreal.xyz/stream.m3u8?${hmacQs({ m: 'native', cs: 'cast1' })}`, {}, E), 200, (_r, b) => b.includes('cs=cast1'));
await expect('cast paramlı ama TOKEN secret ile imzalı → 403', call(`https://stream.lenstedreal.xyz/stream.m3u8?${hmacQs({ m: 'native', cs: 'cast1', secret: TOKEN_SECRET })}`, {}, E), 403);
await expect('backend proxy (m=srv) → 200', call(`https://stream.lenstedreal.xyz/lenstedreal_stream/mono.m3u8?${hmacQs({ st: 'featured', sid: 'featured-proxy', did: 'backend', m: 'srv', exp: now + 300 })}`, {}, E), 200);
await expect('enforce + legacy JWT hâlâ çalışır', call(`https://stream.lenstedreal.xyz/stream0.ts?token=${good}`, {}, E), 200);
await expect('enforce + Basic hâlâ çalışır', call('https://stream.lenstedreal.xyz/stream.m3u8', { Authorization: 'Basic ' + Buffer.from('lenstedreal_marka:zirvedeyiz').toString('base64') }, E), 200);

console.log(fail ? `\n${fail} TEST BAŞARISIZ` : '\nTÜM WORKER TESTLERİ GEÇTİ');
process.exit(fail ? 1 : 0);

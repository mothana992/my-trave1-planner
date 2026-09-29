const COOKIE = '__Host-rahlati';
const SESSION_SECONDS = 60 * 60 * 24 * 14;
const MAX_STATE_BYTES = 1_800_000; // D1 rows are limited to 2,000,000 bytes.
const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const encoder = new TextEncoder();

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}
function fail(message, status = 400) { return json({ error: message }, status); }
function base64(bytes) {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}
function bytes(value) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}
function equal(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
async function digest(value) {
  return base64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' }, key, 256));
}
async function userForRequest(request, env) {
  const cookie = request.headers.get('Cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith(COOKIE + '='));
  const token = cookie?.slice(COOKIE.length + 1);
  if (!token || !/^[A-Za-z0-9+/_=-]{40,}$/.test(token)) return null;
  const hash = await digest(token);
  return env.DB.prepare('SELECT users.id, users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?')
    .bind(hash, Date.now()).first();
}
function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
function validOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}
async function body(request) {
  if (Number(request.headers.get('Content-Length') || 0) > MAX_STATE_BYTES) throw Error('too_large');
  const value = await request.text();
  if (encoder.encode(value).length > MAX_STATE_BYTES) throw Error('too_large');
  return JSON.parse(value);
}
async function attemptsKey(request, username) {
  return digest((request.headers.get('CF-Connecting-IP') || 'unknown') + ':' + username.toLowerCase());
}
async function login(request, env, setup) {
  let data;
  try { data = await body(request); } catch { return fail('Invalid request', 400); }
  const username = String(data.username || '').trim();
  const password = String(data.password || '');
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username) || password.length < 12 || password.length > 256) return fail('Invalid credentials', 400);
  const now = Date.now();
  const key = await attemptsKey(request, username);
  const attempts = await env.DB.prepare('SELECT count, window_start FROM login_attempts WHERE key = ?').bind(key).first();
  if (attempts && now - attempts.window_start < 15 * 60 * 1000 && attempts.count >= 5) return fail('Try again later', 429);
  let user;
  if (setup) {
    if (!env.SETUP_TOKEN || !equal(encoder.encode(String(data.setupToken || '')), encoder.encode(env.SETUP_TOKEN))) return fail('Invalid setup code', 403);
    const existing = await env.DB.prepare('SELECT id FROM users LIMIT 1').first();
    if (existing) return fail('Admin already exists', 409);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await passwordHash(password, salt);
    try {
      const result = await env.DB.prepare('INSERT INTO users (id, username, salt, password_hash, created_at) VALUES (1, ?, ?, ?, ?)')
        .bind(username, base64(salt), base64(hash), now).run();
      user = { id: result.meta.last_row_id, username };
    } catch { return fail('Admin already exists', 409); }
  } else {
    user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
    const salt = user ? bytes(user.salt) : new Uint8Array(16);
    const actual = await passwordHash(password, salt);
    const expected = user ? bytes(user.password_hash) : new Uint8Array(32);
    if (!user || !equal(actual, expected)) {
      await env.DB.prepare('INSERT INTO login_attempts (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN ? - window_start > 900000 THEN 1 ELSE count + 1 END, window_start = CASE WHEN ? - window_start > 900000 THEN ? ELSE window_start END')
        .bind(key, now, now, now, now).run();
      return fail('Invalid credentials', 401);
    }
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key).run();
  const token = base64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await digest(token), user.id, now + SESSION_SECONDS * 1000).run();
  return json({ username }, 200, { 'Set-Cookie': sessionCookie(token) });
}
async function state(request, env, user) {
  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT version, data FROM trip_state WHERE user_id = ?').bind(user.id).first();
    return json({ version: row?.version || 0, data: row ? JSON.parse(row.data) : { trips: [], current: '' } });
  }
  if (request.method !== 'PUT') return fail('Method not allowed', 405);
  let value;
  try { value = await body(request); } catch { return fail('Invalid or oversized data', 413); }
  if (!value || !Array.isArray(value.trips) || typeof value.current !== 'string') return fail('Invalid trip data');
  const version = Number(request.headers.get('If-Match'));
  if (!Number.isSafeInteger(version) || version < 0) return fail('Version required', 428);
  const data = JSON.stringify(value), now = Date.now();
  if (encoder.encode(data).length > MAX_STATE_BYTES) return fail('Trip data too large', 413);
  let result;
  if (version === 0) {
    result = await env.DB.prepare('INSERT OR IGNORE INTO trip_state (user_id, version, data, updated_at) VALUES (?, 1, ?, ?)')
      .bind(user.id, data, now).run();
  } else {
    result = await env.DB.prepare('UPDATE trip_state SET version = version + 1, data = ?, updated_at = ? WHERE user_id = ? AND version = ?')
      .bind(data, now, user.id, version).run();
  }
  if (!result.meta.changes) return fail('State changed on another device', 409);
  return json({ version: version + 1 });
}
async function media(request, env, user, path) {
  if (path === '/api/media' && request.method === 'POST') {
    if (Number(request.headers.get('Content-Length') || 0) > MAX_MEDIA_BYTES) return fail('Image too large', 413);
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length > MAX_MEDIA_BYTES) return fail('Image too large', 413);
    let type = '';
    if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) type = 'image/jpeg';
    else if (bytes.length > 8 && bytes.slice(0, 8).every((v, i) => v === [137, 80, 78, 71, 13, 10, 26, 10][i])) type = 'image/png';
    else if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') type = 'image/webp';
    else if (bytes.length > 5 && String.fromCharCode(...bytes.slice(0, 4)) === '%PDF') type = 'application/pdf';
    else return fail('Unsupported file type', 415);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(v => v.toString(16).padStart(2, '0')).join('');
    await env.MEDIA.put(`${user.id}/${hash}`, bytes, { httpMetadata: { contentType: type } });
    return json({ url: `/api/media/${hash}` });
  }
  const id = path.match(/^\/api\/media\/([a-f0-9]{64})$/)?.[1];
  if (!id || request.method !== 'GET') return fail('Not found', 404);
  const item = await env.MEDIA.get(`${user.id}/${id}`);
  if (!item) return fail('Not found', 404);
  const headers = new Headers({ 'Content-Type': item.httpMetadata?.contentType || 'application/octet-stream',
    'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  return new Response(item.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!env.DB || !env.ASSETS || !env.MEDIA) return fail('Server is not configured', 503);
    if (path.startsWith('/api/') && request.method !== 'GET' && !validOrigin(request)) return fail('Origin mismatch', 403);
    if (path === '/api/status' && request.method === 'GET') {
      const existing = await env.DB.prepare('SELECT id FROM users LIMIT 1').first();
      return json({ setupRequired: !existing });
    }
    if (path === '/api/setup' && request.method === 'POST') return login(request, env, true);
    if (path === '/api/login' && request.method === 'POST') return login(request, env, false);
    if (path === '/login.html' && request.method === 'GET') {
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers); headers.set('Cache-Control', 'no-store');
      return new Response(response.body, { status: response.status, headers });
    }
    const user = await userForRequest(request, env);
    if (!user) {
      if (path.startsWith('/api/')) return fail('Sign in required', 401);
      return Response.redirect(new URL('/login.html', request.url), 302);
    }
    if (path === '/api/logout' && request.method === 'POST') {
      const token = request.headers.get('Cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
      if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await digest(token)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (path === '/api/me' && request.method === 'GET') return json({ username: user.username });
    if (path === '/api/state') return state(request, env, user);
    if (path.startsWith('/api/media')) return media(request, env, user, path);
    if (path.startsWith('/api/')) return fail('Not found', 404);
    if (!['GET', 'HEAD'].includes(request.method)) return fail('Method not allowed', 405);
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');
    return new Response(response.body, { status: response.status, headers });
  },
};

import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

function environment() {
  const users = [], sessions = new Map(), states = new Map(), attempts = new Map();
  const DB = { prepare(sql) {
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() {
        if (sql === 'SELECT id FROM users LIMIT 1') return users[0] || null;
        if (sql.includes('SELECT * FROM users WHERE username')) return users.find(u => u.username === values[0]) || null;
        if (sql.includes('SELECT users.id, users.username FROM sessions')) {
          const row = sessions.get(values[0]);
          return row?.expires_at > values[1] ? users.find(u => u.id === row.user_id) || null : null;
        }
        if (sql.includes('SELECT count, window_start FROM login_attempts')) return attempts.get(values[0]) || null;
        if (sql.includes('SELECT version, data FROM trip_state')) return states.get(values[0]) || null;
        throw Error('Unknown query: ' + sql);
      },
      async run() {
        if (sql.startsWith('INSERT INTO users')) {
          if (users.length) throw Error('Duplicate admin');
          users.push({ id: 1, username: values[0], salt: values[1], password_hash: values[2] });
          return { meta: { changes: 1, last_row_id: 1 } };
        }
        if (sql.startsWith('DELETE FROM login_attempts')) { attempts.delete(values[0]); return { meta: { changes: 1 } }; }
        if (sql.startsWith('INSERT INTO login_attempts')) { const old = attempts.get(values[0]); attempts.set(values[0], { count: old ? old.count + 1 : 1, window_start: values[1] }); return { meta: { changes: 1 } }; }
        if (sql.startsWith('INSERT INTO sessions')) { sessions.set(values[0], { user_id: values[1], expires_at: values[2] }); return { meta: { changes: 1 } }; }
        if (sql.startsWith('DELETE FROM sessions')) { sessions.delete(values[0]); return { meta: { changes: 1 } }; }
        if (sql.startsWith('INSERT OR IGNORE INTO trip_state')) {
          if (states.has(values[0])) return { meta: { changes: 0 } };
          states.set(values[0], { version: 1, data: values[1] }); return { meta: { changes: 1 } };
        }
        if (sql.startsWith('UPDATE trip_state')) {
          const old = states.get(values[2]);
          if (!old || old.version !== values[3]) return { meta: { changes: 0 } };
          states.set(values[2], { version: old.version + 1, data: values[0] }); return { meta: { changes: 1 } };
        }
        throw Error('Unknown mutation: ' + sql);
      },
    };
  } };
  const media = new Map();
  return { DB, ASSETS: { fetch: async () => new Response('PRIVATE_APP') },
    MEDIA: { put: async (key, data, options) => media.set(key, { data, httpMetadata: options.httpMetadata }),
      get: async key => { const item = media.get(key); return item && { body: item.data, httpMetadata: item.httpMetadata }; } },
    SETUP_TOKEN: 'a-long-one-time-setup-code-that-is-secret' };
}
function request(path, method = 'GET', body, cookie, origin = 'https://rahlati.example') {
  return new Request(origin + path, { method, headers: { ...(method !== 'GET' ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

test('assets require login; setup, session, optimistic sync and logout work', async () => {
  const env = environment();
  const anonymous = await worker.fetch(request('/app.js'), env);
  assert.equal(anonymous.status, 302);
  assert.equal(new URL(anonymous.headers.get('Location')).pathname, '/login.html');
  const setupBlocked = await worker.fetch(request('/api/setup', 'POST', { username: 'admin', password: 'very-strong-password', setupToken: 'wrong' }), env);
  assert.equal(setupBlocked.status, 403);
  const created = await worker.fetch(request('/api/setup', 'POST', { username: 'admin', password: 'very-strong-password', setupToken: env.SETUP_TOKEN }), env);
  assert.equal(created.status, 200);
  const cookie = created.headers.get('Set-Cookie').split(';')[0];
  assert.match(created.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Strict/);
  assert.equal((await worker.fetch(request('/app.js', 'GET', undefined, cookie), env)).status, 200);
  assert.equal((await worker.fetch(request('/api/setup', 'POST', { username: 'another', password: 'very-strong-password', setupToken: env.SETUP_TOKEN }), env)).status, 409);
  assert.equal((await worker.fetch(request('/api/login', 'POST', { username: 'admin', password: 'wrong-password-here' }), env)).status, 401);
  const saved = await worker.fetch(new Request('https://rahlati.example/api/state', { method: 'PUT', headers: { Origin: 'https://rahlati.example', Cookie: cookie, 'If-Match': '0' }, body: JSON.stringify({ trips: [{ id: 'trip-1' }], current: 'trip-1' }) }), env);
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).version, 1);
  const loaded = await worker.fetch(request('/api/state', 'GET', undefined, cookie), env);
  assert.deepEqual((await loaded.json()).data.trips, [{ id: 'trip-1' }]);
  const image = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  const upload = await worker.fetch(new Request('https://rahlati.example/api/media', { method: 'POST', headers: { Origin: 'https://rahlati.example', Cookie: cookie }, body: image }), env);
  assert.equal(upload.status, 200);
  const imageURL = (await upload.json()).url;
  assert.equal((await worker.fetch(request(imageURL, 'GET', undefined, cookie), env)).headers.get('Content-Type'), 'image/png');
  assert.equal((await worker.fetch(request(imageURL), env)).status, 401);
  const stale = await worker.fetch(new Request('https://rahlati.example/api/state', { method: 'PUT', headers: { Origin: 'https://rahlati.example', Cookie: cookie, 'If-Match': '0' }, body: JSON.stringify({ trips: [], current: '' }) }), env);
  assert.equal(stale.status, 409);
  const loggedOut = await worker.fetch(request('/api/logout', 'POST', undefined, cookie), env);
  assert.equal(loggedOut.status, 200);
  assert.equal((await worker.fetch(request('/api/state', 'GET', undefined, cookie), env)).status, 401);
});

import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';

// Use only against the disposable CI stack, never a production database.
const request = (path, options = {}) => fetch(`http://127.0.0.1:3000${path}`, {
  ...options, signal: AbortSignal.timeout(5000)
});
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try { ready = (await request('/bbs')).ok; } catch { /* Startup is still in progress. */ }
  if (ready) break;
  await delay(2000);
}
assert.ok(ready, 'BBS startup did not complete');
assert.equal((await request('/admin/login.html')).status, 200);
assert.equal((await request('/api/admin/config')).status, 401, 'Anonymous admin access must fail');
const login = (body) => request('/api/auth/login', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
});
const handle = process.env.SYSOP_HANDLE || 'sysop';
const password = process.env.SYSOP_PASSWORD;
assert.ok(password, 'The disposable stack needs a sysop password');
assert.equal((await login({})).status, 400);
assert.equal((await login({ handle, password: `${password}-incorrect` })).status, 401);
const loggedIn = await login({ handle, password });
assert.equal(loggedIn.status, 200, 'Bootstrapped sysop login');
const setCookie = loggedIn.headers.get('set-cookie') || '';
assert.match(setCookie, /HttpOnly/i);
const headers = { cookie: setCookie.split(';')[0], 'content-type': 'application/json' };
assert.equal((await request('/api/admin/config', { headers })).status, 200);
let boardId;
try {
  const created = await request('/api/admin/boards', {
    method: 'POST', headers,
    body: JSON.stringify({ name: `CI smoke ${Date.now()}`, description: 'Disposable integration test' })
  });
  assert.equal(created.status, 200);
  boardId = (await created.json()).id;
  assert.ok(boardId);
  const boards = await (await request('/api/admin/boards', { headers })).json();
  assert.ok(boards.some((board) => board.id === boardId), 'Read after database write');
} finally {
  if (boardId) assert.equal((await request(`/api/admin/boards/${encodeURIComponent(boardId)}`, {
    method: 'DELETE', headers
  })).status, 200);
}
await new Promise((resolve, reject) => {
  const socket = new WebSocket('ws://127.0.0.1:3000/ws/bbs');
  const timer = setTimeout(() => { socket.close(); reject(new Error('WebSocket timeout')); }, 10000);
  socket.addEventListener('open', () => { clearTimeout(timer); socket.close(); resolve(); }, { once: true });
  socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('WebSocket failed')); }, { once: true });
});
assert.equal((await request('/api/auth/logout', { method: 'POST', headers })).status, 200);
assert.equal((await request('/api/admin/config', { headers })).status, 401, 'Revoked session denied');
const started = performance.now();
for (let index = 0; index < 20; index++) {
  const page = await request('/bbs');
  assert.equal(page.status, 200);
  await page.text();
}
console.log(JSON.stringify({
  check: 'container-integration', status: 'passed', requests: 20,
  meanPageMilliseconds: Number(((performance.now() - started) / 20).toFixed(2)),
  note: 'Smoke timing only; not a production load benchmark'
}));

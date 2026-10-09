import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { setImmediate } from 'node:timers';
import axios, { AxiosError } from 'axios';

// Exercise the production module with real Axios interceptors and a recording
// adapter. Only Vite environment syntax and ESM exports are adapted for Node.
function loadClient(adapter, options = {}) {
  const calls = [], events = [], delays = [], scheduled = [], storage = new Map();
  const source = readFileSync(new URL('../src/services/api.js', import.meta.url), 'utf8');
  const names = [...source.matchAll(/export const (\w+)/g)].map(match => match[1]);
  const transformed = source
    .replace("import axios from 'axios';", '')
    .replaceAll('import.meta.env', 'environment')
    .replaceAll('export const ', 'const ')
    .replace('export default api;', '')
    + `\nglobalThis.client = { api, ${names.join(', ')} };`;
  const instrumentedAxios = {
    create(options) {
      return axios.create({ ...options, adapter: async config => {
        calls.push({ url: config.url, method: config.method, params: config.params,
          headers: config.headers.toJSON(), data: config.data });
        return adapter(config);
      } });
    },
    isCancel: axios.isCancel,
  };
  const context = vm.createContext({ axios: instrumentedAxios,
    environment: { VITE_API_BASE_URL: 'https://backend.test/api', PROD: false },
    console, Date, Error, RegExp, Promise,
    setTimeout(fn, delay) { delays.push(delay); if (options.holdTimers) scheduled.push(fn); else queueMicrotask(fn); },
    localStorage: { setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    window: { dispatchEvent: event => events.push(event) },
    Event: class { constructor(type) { this.type = type; } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  });
  vm.runInContext(transformed, context, { filename: 'services/api.js' });
  return { ...context.client, calls, events, delays, scheduled, storage };
}
const success = (config, data = {}, status = 200) => ({ config, data, status, statusText: 'OK', headers: {} });
test('login can reuse a warm browser CSRF token while invalidating prior session requests', async () => {
  const client = loadClient(config => success(config, config.url === '/csrf-token' ? { csrfToken: 'warm-token' } : { user: { id: 1 } }));
  await client.fetchCsrfToken();
  client.invalidateAuthSession({ preserveCsrf: true });
  await client.api.post('/auth/google', { credential: 'synthetic' });
  assert.equal(client.calls.filter(call => call.url === '/csrf-token').length, 1);
  assert.equal(client.calls.at(-1).headers['X-CSRF-Token'], 'warm-token');
  client.invalidateAuthSession();
  assert.equal(client.getCsrfToken(), null, 'logout still clears cached CSRF');
});
test('username OTP and confirmation use purpose-specific endpoints and preserve saved user', async () => {
  const client = loadClient(async config => success(config, config.url.endsWith('csrf-token') ? { csrfToken: 'token' } : config.url.endsWith('send-otp') ? { message: 'Sent', cooldownSeconds: 60 } : { user: { id: 1, username: 'new.user' } }));
  await client.fetchCsrfToken();
  await client.authAPI.sendUsernameOtp('new.user');
  const result = await client.authAPI.changeUsername('new.user', '123456');
  assert.equal(result.user.username, 'new.user');
  const requests = client.calls.filter(call => call.url.includes('/auth/username'));
  assert.equal(requests[0].url, '/auth/username/send-otp');
  assert.equal(requests[0].method, 'post');
  assert.deepEqual(JSON.parse(requests[0].data), { username: 'new.user' });
  assert.equal(requests[1].method, 'put');
  assert.deepEqual(JSON.parse(requests[1].data), { username: 'new.user', otp: '123456' });
});
test('username OTP failures retain configuration codes and do not replay sends', async () => {
  const client = loadClient(async config => failed(config, 503, { error: 'Email credentials are invalid.', code: 'EMAIL_INVALID_KEY' }));
  await assert.rejects(client.authAPI.sendUsernameOtp('new.user'), error => error.status === 503 && error.code === 'EMAIL_INVALID_KEY' && error.details.code === 'EMAIL_INVALID_KEY');
  assert.equal(client.calls.length, 1);
});
function failed(config, status, data = { error: 'Failure' }) {
  throw new AxiosError(data.error, status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK', config, null,
    status ? { config, status, statusText: 'Failure', headers: {}, data } : undefined);
}

test('concurrent protected requests rotate refresh once and replay each once', async () => {
  let refreshed = false, release;
  const gate = new Promise(resolve => { release = resolve; });
  const client = loadClient(async config => {
    if (config.url === '/auth/refresh') {
      await gate; refreshed = true;
      return success(config, { user: { id: 'staff-1', role: 'HOD' } });
    }
    if (!refreshed) return failed(config, 401);
    return success(config, { url: config.url });
  });
  const requests = Promise.all([client.api.get('/dashboard'), client.api.get('/notifications')]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(client.calls.filter(call => call.url === '/auth/refresh').length, 1);
  release();
  const results = await requests;
  assert.equal(results.length, 2);
  for (const path of ['/dashboard', '/notifications']) assert.equal(client.calls.filter(call => call.url === path).length, 2);
  assert.equal(client.events.filter(event => event.type === 'auth:refreshed').length, 1);
  assert.equal(JSON.parse(client.storage.get('user')).id, 'staff-1');
});

test('ambiguous mutation network failures never retry', async () => {
  const client = loadClient(config => failed(config));
  await assert.rejects(client.api.post('/faculty-forms', { amount: 100 }), error => error.isApiError && error.code === 'ERR_NETWORK');
  assert.equal(client.calls.length, 1);
  assert.deepEqual(client.delays, []);
});

test('GET network failures retry twice then retain typed failure', async () => {
  const client = loadClient(config => failed(config));
  await assert.rejects(client.api.get('/dashboard'), error => error.isApiError && error.error.includes('Network error'));
  assert.equal(client.calls.length, 3);
  assert.deepEqual(client.delays, [1000, 2000]);
});

test('backend HTTP failures retain status and response data without retries', async () => {
  const client = loadClient(config => failed(config, 403, { error: 'Department access denied', reason: 'scope' }));
  await assert.rejects(client.dashboardAPI.list(), error => error.status === 403 && error.reason === 'scope' && error.response.data.error === 'Department access denied');
  assert.equal(client.calls.length, 1);
});

test('CSRF fetches share one request and token reaches subsequent mutation', async () => {
  const client = loadClient(config => success(config, config.url === '/csrf-token' ? { csrfToken: 'csrf-value' } : { ok: true }));
  const tokens = await Promise.all([client.fetchCsrfToken(), client.fetchCsrfToken()]);
  assert.deepEqual(tokens, ['csrf-value', 'csrf-value']);
  await client.notificationAPI.read('notice-1');
  assert.equal(client.calls.filter(call => call.url === '/csrf-token').length, 1);
  assert.equal(client.calls.at(-1).headers['X-CSRF-Token'], 'csrf-value');
});

test('transient refresh failure preserves signed-in user and never expires session', async () => {
  const client = loadClient(config => failed(config, config.url === '/auth/refresh' ? 503 : 401));
  client.storage.set('user', '{"id":"existing"}');
  await assert.rejects(client.api.get('/dashboard'), error => error.status === 503);
  assert.equal(client.storage.has('user'), true);
  assert.equal(client.events.some(event => event.type === 'auth:expired'), false);
  assert.equal(client.calls.length, 2);
});

test('invalid refresh expires session without recursively refreshing', async () => {
  const client = loadClient(config => failed(config, 401));
  client.storage.set('user', '{"id":"existing"}');
  await assert.rejects(client.api.get('/dashboard'), error => error.status === 401);
  assert.equal(client.calls.filter(call => call.url === '/auth/refresh').length, 1);
  assert.equal(client.storage.has('user'), false);
  assert.equal(client.events.filter(event => event.type === 'auth:expired').length, 1);
});

test('owned history and dashboard retain server pagination, summaries and query filters', async () => {
  const payload = { forms: [{ _id: 'item-21' }], pagination: { page: 2, limit: 20, total: 45, totalPages: 3 }, summary: { total: 45, pending: 5 } };
  const client = loadClient(config => success(config, payload));
  const faculty = await client.facultyFormsAPI.listMine({ page: 2, limit: 20 });
  const student = await client.studentFormsAPI.listMine({ page: 2, limit: 20 });
  const dashboard = await client.dashboardAPI.list({ page: 2, limit: 20, status: 'pending', search: 'Ada' });
  assert.equal(faculty.pagination.total, 45);
  assert.equal(student.summary.pending, 5);
  assert.equal(dashboard.forms[0]._id, 'item-21');
  assert.deepEqual(client.calls[0].params, { page: 2, limit: 20 });
  assert.deepEqual(client.calls[1].params, { page: 2, limit: 20 });
  assert.deepEqual(client.calls[2].params, { page: 2, limit: 20, status: 'pending', search: 'Ada' });
});

test('notifications use persistent list/read/read-all endpoints', async () => {
  const client = loadClient(config => success(config, config.url === '/notifications' ? { notifications: [{ _id: 'n1', unread: true }], unreadCount: 1 } : { ok: true }));
  const listed = await client.notificationAPI.list({ page: 1, limit: 20 });
  await client.notificationAPI.read('n1');
  await client.notificationAPI.readAll();
  assert.equal(listed.notifications[0]._id, 'n1');
  assert.deepEqual(client.calls.map(({ url, method }) => ({ url, method })), [
    { url: '/notifications', method: 'get' },
    { url: '/notifications/n1/read', method: 'put' },
    { url: '/notifications/read-all', method: 'put' },
  ]);
});


test('logout invalidation blocks an in-flight refresh from restoring or replaying a session', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const client = loadClient(async config => {
    if (config.url === '/auth/refresh') {
      await gate;
      return success(config, { user: { id: 'old-session' } });
    }
    return failed(config, 401);
  });
  const pending = client.api.get('/dashboard');
  const rejected = assert.rejects(pending, error => error.code === 'ERR_SESSION_CHANGED');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(client.calls.filter(call => call.url === '/auth/refresh').length, 1);
  client.invalidateAuthSession();
  client.storage.set('user', '{"id":"new-session"}');
  release();
  await rejected;
  assert.equal(JSON.parse(client.storage.get('user')).id, 'new-session');
  assert.equal(client.calls.filter(call => call.url === '/dashboard').length, 1);
  assert.equal(client.events.some(event => event.type === 'auth:refreshed' || event.type === 'auth:expired'), false);
});

test('session invalidation during GET retry backoff prevents another adapter request', async () => {
  const client = loadClient(config => failed(config), { holdTimers: true });
  const pending = client.api.get('/dashboard');
  const rejected = assert.rejects(pending, error => error.code === 'ERR_SESSION_CHANGED');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(client.calls.length, 1);
  assert.deepEqual(client.delays, [1000]);
  client.invalidateAuthSession();
  assert.equal(client.scheduled.length, 1);
  client.scheduled.shift()();
  await rejected;
  assert.equal(client.calls.length, 1);
});

test('late login and logout responses from an old session epoch are rejected', async () => {
  for (const operation of ['login', 'logout']) {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const client = loadClient(async config => {
      await gate;
      return success(config, { user: { id: 'old-session' } });
    });
    const pending = operation === 'login' ? client.authAPI.login('person', 'secret') : client.api.post('/auth/logout');
    const rejected = assert.rejects(pending, error => error.code === 'ERR_SESSION_CHANGED');
    await new Promise(resolve => setImmediate(resolve));
    client.invalidateAuthSession();
    client.storage.set('user', '{"id":"new-session"}');
    release();
    await rejected;
    assert.equal(JSON.parse(client.storage.get('user')).id, 'new-session');
    assert.equal(client.calls.length, 1);
    assert.equal(client.events.length, 0);
  }
});

test('late CSRF response cannot restore a token after session invalidation', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const client = loadClient(async config => { await gate; return success(config, { csrfToken: 'old-token' }); });
  const pending = client.fetchCsrfToken();
  const rejected = assert.rejects(pending, error => error.code === 'ERR_SESSION_CHANGED');
  await new Promise(resolve => setImmediate(resolve));
  client.invalidateAuthSession();
  release();
  await rejected;
  assert.equal(client.getCsrfToken(), null);
});

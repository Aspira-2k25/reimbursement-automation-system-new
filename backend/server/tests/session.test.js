const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const base = path.resolve(__dirname, '..');
const local = createRequire(path.join(base, 'server.js'));
const jwt = local('jsonwebtoken');
const secret = 'session-regression-test-secret-never-production';
function load(file, stubs) {
  const module = { exports: {} };
  const fileRequire = createRequire(path.join(base, file));
  vm.runInNewContext(fs.readFileSync(path.join(base, file), 'utf8'), {
    require: name => Object.hasOwn(stubs, name) ? stubs[name] : fileRequire(name), module,
    process: { env: { JWT_SECRET: secret, NODE_ENV: 'test' } }, Date, Buffer,
    console: { error() {}, warn() {}, log() {} },
  }, { filename: file });
  return module.exports;
}
function response() {
  return { code: 200, cookies: {}, status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }, cookie(key, value, options) { this.cookies[key] = { value, options }; }, clearCookie() {} };
}
function controller(prisma = {}, database = {}, payload = {}) {
  return load('controllers/authController.js', {
    '../config/prisma': prisma, '../utils/database': database,
    '../utils/logger': { logActivity() {} }, '../utils/tokenBlacklist': { async addToBlacklist() { return true; } },
    'google-auth-library': { OAuth2Client: class { async verifyIdToken() { return { getPayload: () => payload }; } } },
  });
}
test('inactive Google staff cannot receive either session cookie', async () => {
  let issued = false;
  const c = controller({ refreshToken: { async create() { issued = true; } } },
    { async getStaffByEmail() { return { id: 7, role: 'HOD', is_active: false }; } },
    { email: 'inactive@apsit.edu.in', email_verified: true });
  const res = response(); await c.googleLogin({ body: { credential: 'mock-verified' } }, res);
  assert.equal(res.code, 403); assert.equal(issued, false); assert.deepEqual(res.cookies, {});
});
test('department profile edit is forbidden before persistence', async () => {
  let persisted = false;
  const c = controller({}, { async updateStaffProfile() { persisted = true; } });
  const res = response(); await c.updateProfile({ user: { userId: 7 }, body: { department: 'Civil Engineering' } }, res);
  assert.equal(res.code, 403); assert.equal(persisted, false);
});
test('Google student profile does not perform integer staff lookup', async () => {
  const c = controller({}, { async getStaffProfile() { assert.fail('integer lookup for email identity'); } });
  const res = response(); await c.getProfile({ user: { userId: 'student@apsit.edu.in', email: 'student@apsit.edu.in', name: 'Student', role: 'Student' } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.user.id, 'student@apsit.edu.in'); assert.equal(res.body.user.name, 'Student');
});
for (const count of [1, 0]) test(`refresh conditional consumption count ${count} controls issuance`, async () => {
  let created = 0, consumed = 0, transaction = false;
  const prisma = { staff: { async findUnique(query) { assert.equal(query.where.email, 'student@apsit.edu.in'); return null; } },
    refreshToken: {
      async findUnique() { return { id: 1, userId: 'student@apsit.edu.in', familyId: 'family', expiresAt: new Date(Date.now() + 60000) }; },
      async updateMany(query) { if (transaction) { consumed++; assert.equal(query.where.revokedAt, null); assert.ok(query.where.expiresAt.gt); } return { count }; },
      async create() { assert.equal(transaction, true); created++; },
    }, async $transaction(fn) { transaction = true; try { return await fn(this); } finally { transaction = false; } } };
  const c = controller(prisma), res = response();
  const previous = jwt.sign({ userId: 'student@apsit.edu.in', email: 'student@apsit.edu.in', name: 'Student Name', department: 'IT', role: 'Student' }, secret);
  await c.refreshToken({ cookies: { refresh_token: 'raw', auth_token: previous } }, res);
  assert.equal(consumed, 1); assert.equal(created, count); assert.equal(res.code, count ? 200 : 401);
  if (count) {
    assert.equal(res.body.user.name, 'Student Name'); assert.equal(res.body.user.department, 'IT');
    const decoded = jwt.verify(res.cookies.auth_token.value, secret); assert.ok(decoded.sessionIssuedAt); assert.equal(decoded.familyId, 'family');
    assert.ok(Math.abs(res.cookies.auth_token.options.maxAge - (decoded.exp * 1000 - Date.now())) < 1000);
  } else assert.deepEqual(res.cookies, {});
});
test('password reset commits one-use token, revocation cutoff and every refresh identity together', async () => {
  const calls = [], user = { id: 7, email: 'staff@apsit.edu.in', is_active: true };
  let inside = false;
  const prisma = { passwordResetToken: {
    async findUnique() { return { id: 2, email: user.email, expiry_time: new Date(Date.now() + 60000) }; },
    async delete() { assert.equal(inside, true); calls.push('consume'); } },
    staff: { async findUnique() { return user; }, async update(query) {
      assert.equal(inside, true); assert.ok(query.data.sessions_revoked_at); assert.notEqual(query.data.password, 'new-password'); calls.push('password'); } },
    refreshToken: { async updateMany(query) { assert.equal(inside, true);
      assert.equal(query.where.userId.in.join(','), '7,staff@apsit.edu.in'); assert.equal(query.where.revokedAt, null); calls.push('revoke'); } },
    async $transaction(fn) { inside = true; try { return await fn(this); } finally { inside = false; } } };
  const c = load('controllers/passwordController.js', { '../config/prisma': prisma,
    '../utils/logger': { logActivity() {} }, '../utils/emailService': {} });
  const res = response(); await c.resetPassword({ body: { token: 'reset-token', newPassword: 'new-password', confirmPassword: 'new-password' }, get() {} }, res);
  assert.equal(res.code, 200); assert.deepEqual(calls, ['consume', 'password', 'revoke']);
});
for (const scenario of ['inactive', 'stale', 'current', 'unavailable']) test(`authoritative access verification: ${scenario}`, async () => {
  const now = Date.now();
  const c = load('middleware/auth.js', { '../config/prisma': { staff: { async findUnique() {
    if (scenario === 'unavailable') throw new Error('database offline');
    return { id: 7, role: 'Faculty', department: 'IT', is_active: scenario !== 'inactive',
      sessions_revoked_at: scenario === 'stale' ? new Date(now) : null };
  } } }, '../utils/tokenBlacklist': { async isBlacklisted() { return false; } } });
  const token = jwt.sign({ userId: 7, role: 'Admin', department: 'Civil Engineering', sessionIssuedAt: now - 1000 }, secret);
  const req = { headers: { authorization: `Bearer ${token}` } }, res = response(); let next = false;
  await c.verifyToken(req, res, () => { next = true; });
  assert.equal(next, scenario === 'current'); assert.equal(res.code, scenario === 'current' ? 200 : scenario === 'unavailable' ? 503 : 401);
  if (next) { assert.equal(req.user.role, 'Faculty'); assert.equal(req.user.department, 'IT'); }
});
test('self-service email edits cannot redirect username verification', async () => {
  let persisted = false;
  const c = controller({}, { async updateStaffProfile() { persisted = true; } });
  const res = response();
  await c.updateProfile({ user: { userId: 7, email: 'staff@apsit.edu.in' }, body: { email: 'attacker@apsit.edu.in', name: 'Staff' } }, res);
  assert.equal(res.code, 403); assert.equal(persisted, false);
});
test('a name update cannot silently rewrite the registered email', async () => {
  const c = controller({}, { async updateStaffProfile(id, fields) { assert.equal(id, 7); assert.deepEqual({ ...fields }, { name: 'Saved name' }); return { id, name: fields.name }; } });
  const res = response();
  await c.updateProfile({ user: { userId: 7, email: 'staff@apsit.edu.in' }, body: { email: 'staff@apsit.edu.in', name: 'Saved name' } }, res);
  assert.equal(res.code, 200);
});
for (const state of ['active', 'revoked', 'unavailable']) test(`access cookie verifies its refresh family: ${state}`, async () => {
  const middleware = load('middleware/auth.js', {
    '../utils/tokenBlacklist': { async isBlacklisted() { return false; } },
    '../config/prisma': { refreshToken: { async findFirst(query) {
      assert.equal(query.where.familyId, 'family'); assert.equal(query.where.userId, '7');
      assert.equal(query.where.revokedAt, null);
      if (state === 'unavailable') throw new Error('database unavailable');
      return state === 'active' ? { id: 1 } : null;
    } }, staff: { async findUnique() { return { id: 7, role: 'Faculty', department: 'IT', is_active: true }; } } },
  });
  const token = jwt.sign({ userId: 7, role: 'Faculty', familyId: 'family', sessionIssuedAt: Date.now() }, secret);
  let next = false; const res = response();
  await middleware.verifyToken({ headers: { authorization: `Bearer ${token}` } }, res, () => { next = true; });
  assert.equal(next, state === 'active');
  assert.equal(res.code, state === 'active' ? 200 : state === 'revoked' ? 401 : 503);
});
for (const [count, actor, allowed] of [[1, 9, false], [2, 7, false], [2, 9, true]]) test(`admin deactivation count=${count}, actor=${actor}`, async () => {
  let changed = false, revoked = false;
  const prisma = { staff: { async findUnique() { return { id: 7, role: 'Admin', is_active: true, email: 'admin@apsit.edu.in' }; },
    async count() { return count; }, async update(query) { changed = true; assert.ok(query.data.sessions_revoked_at); return { id: 7 }; } },
    refreshToken: { async updateMany() { revoked = true; } },
    async $transaction(fn, options) { assert.equal(options.isolationLevel, 'Serializable'); return fn(this); } };
  const c = controller(prisma), res = response(); await c.deleteFaculty({ params: { id: '7' }, user: { userId: actor } }, res);
  assert.equal(res.code, allowed ? 200 : 409); assert.equal(changed, allowed); assert.equal(revoked, allowed);
});

test('reactivation invalidates legacy sessions and old numeric/email refresh identities atomically', async () => {
  const inactive = { id: 7, username: 'staff', email: 'old@apsit.edu.in', is_active: false, role: 'Faculty', sessions_revoked_at: new Date('2020-01-01') };
  let inTransaction = false, cutoff, revoked;
  const prisma = { staff: {
    async findFirst(query) { return query.where.is_active === false && query.where.username ? inactive : null; },
    async findUnique() { assert.equal(inTransaction, true); return inactive; },
    async update(query) { assert.equal(inTransaction, true); cutoff = query.data.sessions_revoked_at;
      assert.ok(cutoff.getTime() > inactive.sessions_revoked_at.getTime()); assert.equal(query.data.is_active, true); return { id: 7, is_active: true }; } },
    refreshToken: { async updateMany(query) { assert.equal(inTransaction, true); revoked = query.where.userId.in.join(','); } },
    async $transaction(fn, options) { assert.equal(options.isolationLevel, 'Serializable'); inTransaction = true;
      try { return await fn(this); } finally { inTransaction = false; } } };
  const c = controller(prisma), res = response();
  await c.createFaculty({ user: { userId: 9 }, body: { username: 'staff', name: 'Staff', email: 'new@apsit.edu.in', password: 'strong-new-password' } }, res);
  assert.equal(res.code, 201); assert.equal(revoked, '7,old@apsit.edu.in'); assert.ok(cutoff);
});
for (const failure of [null, 'refresh', 'blacklist']) test(`logout entire-family revocation ${failure || 'succeeds'}`, async () => {
  let revokedFamily, logged = false, cleared = 0;
  const c = load('controllers/authController.js', {
    '../config/prisma': { async $transaction(fn, options) { assert.equal(options.isolationLevel, 'Serializable'); return fn(this); }, refreshToken: { async findUnique(query) { assert.ok(query.where.tokenHash); return { familyId: 'whole-family' }; },
      async updateMany(query) { if (failure === 'refresh') throw new Error('revocation database offline'); revokedFamily = query.where.familyId; } } },
    '../utils/database': {}, '../utils/logger': { logActivity() { logged = true; } },
    '../utils/tokenBlacklist': { async addToBlacklist() { if (failure === 'blacklist') throw new Error('blacklist offline'); return true; } },
  });
  const res = response(); res.clearCookie = () => { cleared++; };
  const token = jwt.sign({ userId: 7, role: 'Faculty' }, secret, { expiresIn: '15m' });
  await c.logout({ headers: { authorization: `Bearer ${token}` }, cookies: { refresh_token: 'raw-refresh' }, get() {} }, res);
  assert.equal(res.code, failure ? 503 : 200); assert.equal(logged, !failure); assert.equal(cleared, 2);
  if (!failure) assert.equal(revokedFamily, 'whole-family');
});
for (const google of [false, true]) test(`${google ? 'Google' : 'password'} login access token belongs to issued refresh family`, async () => {
  let issuedFamily;
  const staff = { id: 7, username: 'staff', name: 'Staff', email: 'staff@apsit.edu.in', role: 'Faculty', department: 'IT', is_active: true };
  const c = controller({ refreshToken: { async create(query) { issuedFamily = query.data.familyId; assert.equal(query.data.userId, '7'); } } },
    { async updateLastLogin() {}, async getStaffByEmail() { return staff; } }, { email: staff.email, name: staff.name, email_verified: true });
  const res = response();
  if (google) await c.googleLogin({ body: { credential: 'verified-mock' }, get() {} }, res);
  else await c.login({ user: staff, get() {} }, res);
  assert.equal(res.code, 200); assert.ok(issuedFamily);
  assert.equal(jwt.verify(res.cookies.auth_token.value, secret).familyId, issuedFamily);
});

test('logout retries serializable conflicts and revokes the full family on retry', async () => {
  let attempts = 0, revoked;
  const prisma = { async $transaction(fn, options) {
    assert.equal(options.isolationLevel, 'Serializable'); attempts++;
    if (attempts === 1) throw Object.assign(new Error('serialization conflict'), { code: 'P2034' });
    return fn(this);
  }, refreshToken: { async findUnique() { return { familyId: 'family', revokedAt: new Date() }; },
    async updateMany(query) { revoked = query.where; } } };
  const c = controller(prisma), res = response();
  await c.logout({ headers: {}, cookies: { refresh_token: 'old-rotated-token' } }, res);
  assert.equal(res.code, 200); assert.equal(attempts, 2); assert.equal(revoked.familyId, 'family');
  assert.equal(revoked.revokedAt, undefined);
});
test('logout stops after three serialization conflicts and never claims success', async () => {
  let attempts = 0;
  const c = controller({ async $transaction() { attempts++; throw Object.assign(new Error('conflict'), { code: 'P2034' }); } });
  const res = response(); await c.logout({ headers: {}, cookies: { refresh_token: 'raw' } }, res);
  assert.equal(res.code, 503); assert.equal(attempts, 3);
});

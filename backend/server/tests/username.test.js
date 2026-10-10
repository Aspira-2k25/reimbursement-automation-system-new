const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
function fixture(options = {}) {
  const staff = { id: 7, username: 'old.user', email: 'staff@apsit.edu.in', name: 'Actual Name', role: 'Faculty', department: 'IT', is_active: true };
  let updates = 0, issues = 0, consumed = 0, transaction = false;
  const model = {
    async findUnique() { return { ...staff }; },
    async findFirst({ where }) { assert.equal(where.username.mode, 'insensitive'); assert.equal(where.id.not, 7); return options.duplicate ? { id: 8 } : null; },
    async update({ where, data }) { assert.equal(transaction, true); assert.equal(where.id, 7); assert.deepEqual(Object.keys(data), ['username']); if (options.uniqueConflict) throw Object.assign(new Error('unique'), { code: 'P2002' }); updates++; Object.assign(staff, data); return { ...staff }; },
  };
  const prisma = { staff: model };
  const otp = {
    async issue(value) { issues++; assert.equal(value.email, staff.email); assert.equal(value.purpose, 'username'); assert.equal(value.targetUsername, 'new.user'); return options.issueResult || { message: 'Sent', cooldownSeconds: 60 }; },
    async transaction(fn) { transaction = true; const snapshot = { ...staff }; try { return await fn(prisma); } catch (error) { Object.assign(staff, snapshot); throw error; } finally { transaction = false; } },
    async consume(tx, value) { assert.equal(transaction, true); assert.equal(tx, prisma); consumed++; assert.equal(value.email, staff.email); assert.equal(value.purpose, 'username'); return value.targetUsername !== 'new.user' || value.otp !== '123456' ? { status: 400, error: 'Wrong code or target' } : null; },
    failure(error, res) { return res.status(503).json({ error: error.message }); },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/usernameController.js'), 'utf8'), { module, console, require(name) { if (name === '../config/prisma') return prisma; if (name === '../utils/otpService') return otp; throw new Error(name); } });
  const req = role => ({ user: { userId: 7, role }, body: { username: ' new.user ', otp: '123456' } });
  const res = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  return { controller: module.exports, staff, prisma, req, res, get updates() { return updates; }, get issues() { return issues; }, get consumed() { return consumed; } };
}
for (const role of ['Faculty','HOD','Coordinator','Accounts','Principal']) test(role + ' can request a target-bound username OTP', async () => {
  const f = fixture(), res = f.res(); await f.controller.sendOtp(f.req(role), res); assert.equal(res.code, 200); assert.equal(f.issues, 1);
});
for (const role of ['Student','Admin']) test(role + ' cannot request or perform username change', async () => {
  const f = fixture(); for (const action of ['sendOtp','change']) { const res = f.res(); await f.controller[action](f.req(role), res); assert.equal(res.code, 403); }
  assert.equal(f.updates, 0); assert.equal(f.issues, 0);
});
test('inactive staff cannot request codes or modify username', async () => { const f = fixture(); f.staff.is_active = false; for (const action of ['sendOtp','change']) { const res = f.res(); await f.controller[action](f.req('Faculty'), res); assert.equal(res.code, 403); } assert.equal(f.updates, 0); });
for (const username of ['ab', '.abc', 'name with spaces', 'x'.repeat(101), null]) test('invalid username is rejected before email and persistence: ' + username, async () => {
  const f = fixture(), req = f.req('Faculty'); req.body.username = username; const res = f.res(); await f.controller.sendOtp(req, res); assert.equal(res.code, 400); assert.equal(f.issues, 0); assert.equal(f.updates, 0);
});
test('case-insensitive duplicate username is rejected for send and change', async () => {
  const f = fixture({ duplicate: true }); for (const action of ['sendOtp','change']) { const res = f.res(); await f.controller[action](f.req('Faculty'), res); assert.equal(res.code, 409); } assert.equal(f.issues, 0); assert.equal(f.consumed, 0); assert.equal(f.updates, 0);
});
for (const invalid of [{ username: 'different.user' }, { otp: '999999' }]) test('incorrect target or code cannot update staff', async () => {
  const f = fixture(), req = f.req('Faculty'); Object.assign(req.body, invalid); const res = f.res(); await f.controller.change(req, res); assert.equal(res.code, 400); assert.equal(f.updates, 0); assert.equal(f.staff.username, 'old.user');
});
test('successful update is atomic and preserves staff identity; existing login query sees new username', async () => {
  const f = fixture(), original = { ...f.staff }, res = f.res(); await f.controller.change(f.req('Faculty'), res); assert.equal(res.code, 200); assert.equal(f.updates, 1); assert.equal(f.consumed, 1); assert.equal(res.body.user.username, 'new.user');
  for (const field of ['id','email','name','role','department']) assert.equal(f.staff[field], original[field]);
  const module = { exports: {} }, source = path.join(__dirname, '../utils/database.js'), local = createRequire(source);
  vm.runInNewContext(fs.readFileSync(source,'utf8'), { module, console, process, require(name) { if (name === '../config/database') return { async query(sql, values) { assert.match(sql, /FROM staff/); assert.match(sql, /WHERE username = \$1/); return { rows: values[0] === f.staff.username ? [{ ...f.staff }] : [] }; } }; return local(name); } });
  assert.equal(await module.exports.getStaffByUsername('old.user'), null); const account = await module.exports.getStaffByUsername('new.user'); assert.equal(account.id, original.id); assert.equal(account.username, 'new.user');
});
test('database unique race returns 409 and preserves previous username', async () => {
  const f = fixture({ uniqueConflict: true }), res = f.res(); await f.controller.change(f.req('Faculty'), res); assert.equal(res.code, 409); assert.equal(f.staff.username, 'old.user'); assert.equal(f.updates, 0);
});
test('OTP delivery error status and retry instructions survive controller', async () => {
  const f = fixture({ issueResult: { status: 429, retryAfter: 42, error: 'Wait' } }), res = f.res(); await f.controller.sendOtp(f.req('Faculty'), res); assert.equal(res.code, 429); assert.equal(res.body.retryAfter, 42);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
function fixture(delivery = { success: true }) {
  let now = 1760000000000, serial = 0, conflicts = 0, sends = 0;
  let transactionQueue = Promise.resolve();
  const records = new Map();
  const key = q => JSON.stringify([q.email, q.purpose]);
  class Clock extends Date { constructor(value) { super(value === undefined ? now : value); } static now() { return now; } }
  const model = {
    async findUnique({ where }) { return records.get(key(where.email_purpose)) || null; },
    async upsert({ where, create, update }) { const k = key(where.email_purpose), old = records.get(k); const value = old ? { ...old, ...update } : { id: ++serial, attempts: 0, created_at: new Clock(), ...create }; records.set(k, value); return value; },
    async update({ where, data }) { const r = [...records.values()].find(r => r.id === where.id); r.attempts += data.attempts.increment; return r; },
    async delete({ where }) { const pair = [...records].find(([,r]) => r.id === where.id); if (pair) records.delete(pair[0]); },
    async deleteMany({ where }) { for (const [k,r] of records) if (r.id === where.id && r.otp === where.otp) records.delete(k); },
  };
  const prisma = { accountOtpChallenge: model, async $transaction(fn, options) { assert.equal(options.isolationLevel, 'Serializable'); const previous = transactionQueue; let release; transactionQueue = new Promise(resolve => { release = resolve; }); await previous; try { if (conflicts-- > 0) throw Object.assign(new Error('conflict'), { code: 'P2034' }); return await fn(this); } finally { release(); } } };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../utils/otpService.js'), 'utf8'), { module, Buffer, Date: Clock, process: { env: { JWT_SECRET: 'test-only-otp-secret' } }, console: { error() {} }, require(name) {
    if (name === 'crypto') return { ...crypto, randomInt: () => 123456 };
    if (name === '../config/prisma') return prisma;
    if (name === './emailService') return { async sendOtpEmail(email, otp, purpose) { sends++; assert.equal(otp, '123456'); assert.ok(email); assert.ok(purpose); if (delivery instanceof Error) throw delivery; return delivery; } };
    throw new Error(name);
  } });
  return { service: module.exports, prisma, records, get sends() { return sends; }, advance(ms) { now += ms; }, conflict(n) { conflicts = n; } };
}
const action = { email: 'staff@apsit.edu.in', purpose: 'username', targetUsername: 'new.user', otp: '123456' };
test('OTP persistence hashes plaintext and binds purpose and target; expiry is five minutes', async () => {
  const f = fixture(), result = await f.service.issue(action), record = [...f.records.values()][0];
  assert.equal(result.cooldownSeconds, 60); assert.equal(result.expirySeconds, 300);
  assert.match(record.otp, /^[a-f0-9]{64}$/); assert.notEqual(record.otp, action.otp);
  assert.equal(record.expiry_time - record.created_at, 300000);
  await f.service.issue({ ...action, purpose: 'password', targetUsername: null });
  const password = [...f.records.values()].find(r => r.purpose === 'password'); assert.notEqual(password.otp, record.otp);
  assert.equal((await f.service.consume(f.prisma, { ...action, purpose: 'password' })).status, 400);
  assert.equal((await f.service.consume(f.prisma, { ...action, targetUsername: 'changed.user' })).status, 400);
  assert.equal(f.records.size, 2);
});
test('resend cooldown blocks email for sixty seconds and resets code attempts after expiry', async () => {
  const f = fixture(); await f.service.issue(action); f.advance(59000);
  const blocked = await f.service.issue(action); assert.equal(blocked.status, 429); assert.equal(blocked.retryAfter, 1); assert.equal(f.sends, 1);
  await f.service.consume(f.prisma, { ...action, otp: '999999' }); f.advance(1000);
  assert.equal((await f.service.issue(action)).cooldownSeconds, 60); assert.equal(f.sends, 2); assert.equal([...f.records.values()][0].attempts, 0);
});
test('five failed OTP attempts persist and prevent correct-code bypass', async () => {
  const f = fixture(); await f.service.issue(action);
  for (let attempt = 1; attempt <= 5; attempt++) { const result = await f.service.transaction(tx => f.service.consume(tx, { ...action, otp: '999999' })); assert.equal(result.status, 400); assert.equal([...f.records.values()][0].attempts, attempt); }
  assert.equal((await f.service.transaction(tx => f.service.consume(tx, action))).status, 429); assert.equal(f.records.size, 1);
});
test('successful OTP consumption deletes code and cannot be replayed', async () => {
  const f = fixture(); await f.service.issue(action); assert.equal(await f.service.transaction(tx => f.service.consume(tx, action)), null); assert.equal(f.records.size, 0);
  assert.equal((await f.service.consume(f.prisma, action)).status, 400);
});
test('OTP expires exactly at five-minute boundary', async () => { const f = fixture(); await f.service.issue(action); f.advance(300000); assert.equal((await f.service.consume(f.prisma, action)).status, 400); });
for (const delivery of [{ success: false, code: 'EMAIL_CONFIGURATION_ERROR', error: 'Email provider is not configured.' }, { success: false }, new Error('provider offline')]) test('failed email delivery removes unusable OTP and returns actionable 503', async () => {
  const f = fixture(delivery), result = await f.service.issue(action); assert.equal(result.status, 503); assert.ok(result.error); assert.ok(result.code); assert.equal(f.records.size, 0);
  if (delivery.code) { assert.equal(result.code, delivery.code); assert.equal(result.error, delivery.error); }
});
test('Serializable conflicts retry twice then succeed; exhaustion propagates', async () => {
  const f = fixture(); f.conflict(2); let work = 0; assert.equal(await f.service.transaction(async () => ++work), 1); assert.equal(work, 1);
  f.conflict(3); await assert.rejects(f.service.transaction(async () => assert.fail('conflicting transaction must not execute')), { code: 'P2034' });
});
test('missing migration is distinguishable from service failure', () => {
  const f = fixture(), res = { status(value) { this.code = value; return this; }, json(value) { this.body = value; return this; } };
  f.service.failure({ code: 'P2022' }, res); assert.equal(res.code, 503); assert.equal(res.body.code, 'DATABASE_MIGRATION_REQUIRED');
});

test('concurrent resend requests produce one delivery under Serializable execution', async () => {
  const f = fixture(); const results = await Promise.all([f.service.issue(action), f.service.issue(action)]);
  assert.equal(results.filter(result => result.status === 429).length, 1); assert.equal(results.filter(result => result.cooldownSeconds === 60).length, 1); assert.equal(f.sends, 1); assert.equal(f.records.size, 1);
});

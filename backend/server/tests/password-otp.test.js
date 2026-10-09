const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const filename = path.join(__dirname, '../controllers/passwordController.js');
const local = createRequire(filename);
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
function fixture(options = {}) {
  const calls = [], staff = { id: 7, email: 'actual@apsit.edu.in', password: 'old-hash', is_active: true, ...options.staff };
  const tx = {
    staff: {
      async findUnique() { calls.push('transaction-read'); return { ...staff, ...options.current }; },
      async update(query) { calls.push(['update', query]); },
    },
    refreshToken: { async updateMany(query) { calls.push(['revoke', query]); } },
  };
  const otpService = {
    async issue(query) { calls.push(['issue', query]); if(options.issueThrow) throw options.issueThrow; return options.issueResult || { status: 200, message: 'Code sent' }; },
    async transaction(callback) { calls.push('transaction-start'); if (options.transactionThrow) throw options.transactionThrow; const result = await callback(tx); calls.push('transaction-end'); return result; },
    async consume(transaction, query) { assert.equal(transaction, tx); calls.push(['consume', query]); return options.consumeError || null; },
    failure(error, res) { calls.push(['failure', error.code]); return res.status(503).json({ error: 'Verification unavailable', code: error.code }); },
  };
  const module = { exports: {} };
  const stubs = {
    bcryptjs: { async compare(value, hash) { calls.push(['compare', value, hash]); return options.passwordValid !== false; }, async hash() { calls.push('hash'); return 'new-hash'; } },
    '../config/prisma': { staff: { async findUnique(query) { calls.push(['staff', query]); return options.missingStaff ? null : staff; } } },
    '../utils/otpService': otpService, '../utils/logger': { logActivity() { calls.push('log'); } },
    '../utils/emailService': { async sendPasswordResetEmail() { throw Error('Unexpected email'); } },
  };
  vm.runInNewContext(fs.readFileSync(filename,'utf8'), {
    module, require: name => stubs[name] || local(name), process: { env: {} }, Date,
    console: { error() {}, log() {}, warn() {} },
  });
  return { controller: module.exports, calls };
}
const request = overrides => ({ user: { userId: '7', email: 'stale@apsit.edu.in', role: 'Faculty' }, body: { oldPassword: 'old-password', newPassword: 'new-password', confirmPassword: 'new-password', otp: '123456' }, get() { return 'test-agent'; }, ...overrides });
const called = (calls, name) => calls.filter(call => Array.isArray(call) && call[0] === name);
test('password OTP uses numeric active staff and authoritative stored email/purpose', async () => {
  const { controller, calls } = fixture(), res = response();
  await controller.sendOtp(request(), res);
  assert.equal(res.code,200);
  assert.equal(called(calls,'staff')[0][1].where.id,7);
  assert.equal(called(calls,'issue')[0][1].email,'actual@apsit.edu.in');
  assert.equal(called(calls,'issue')[0][1].purpose,'password');
});
for(const result of [{status:429,code:'OTP_COOLDOWN',error:'Wait'}, {status:503,code:'EMAIL_INVALID_KEY',error:'Unavailable'}]) test(`OTP issue preserves ${result.status} actionable response`, async () => {
  const {controller}=fixture({issueResult:result}), res=response(); await controller.sendOtp(request(),res);
  assert.equal(res.code,result.status); assert.equal(res.body.code,result.code);
});
test('OTP database migration error delegates safe failure mapper', async () => {
  const {controller,calls}=fixture({issueThrow:Object.assign(Error('private db detail'),{code:'P2022'})}),res=response();
  await controller.sendOtp(request(),res); assert.equal(res.code,503); assert.equal(res.body.code,'P2022'); assert.equal(called(calls,'failure').length,1);
});
for(const user of [{userId:'student@apsit.edu.in',email:'student@apsit.edu.in'}, {userId:0,email:'x@apsit.edu.in'}]) test('Google student cannot request staff password OTP', async()=>{
 const {controller,calls}=fixture(),res=response(); await controller.sendOtp(request({user}),res); assert.equal(res.code,403); assert.equal(called(calls,'issue').length,0);
});
test('inactive staff cannot request OTP',async()=>{
 const {controller,calls}=fixture({staff:{is_active:false}}),res=response();await controller.sendOtp(request(),res);assert.equal(res.code,403);assert.equal(called(calls,'issue').length,0);
});
test('wrong current password rejects before hashing/OTP consumption/write',async()=>{
 const {controller,calls}=fixture({passwordValid:false}),res=response();await controller.changePassword(request(),res);assert.equal(res.code,400);assert.equal(called(calls,'consume').length,0);assert.equal(called(calls,'update').length,0);assert.ok(!calls.includes('hash'));
});
for(const otp of ['', '12345', '1234567', 'abcdef']) test(`missing or malformed OTP ${JSON.stringify(otp)} rejects without persistence`,async()=>{
 const {controller,calls}=fixture(),res=response();const req=request();req.body.otp=otp;await controller.changePassword(req,res);assert.equal(res.code,400);assert.equal(called(calls,'consume').length,0);assert.equal(called(calls,'update').length,0);
});
test('OTP consume error returns its status without staff update/revocation',async()=>{
 const {controller,calls}=fixture({consumeError:{status:400,code:'OTP_INVALID',error:'Invalid code'}}),res=response();await controller.changePassword(request(),res);assert.equal(res.code,400);assert.equal(res.body.code,'OTP_INVALID');assert.equal(called(calls,'update').length,0);assert.equal(called(calls,'revoke').length,0);
});
test('password transaction migration failure returns safe unavailable response', async () => {
  const { controller, calls } = fixture({ transactionThrow: Object.assign(Error('private schema detail'), { code: 'P2022' }) }), res = response();
  await controller.changePassword(request(), res);
  assert.equal(res.code, 503); assert.equal(res.body.code, 'P2022');
  assert.equal(called(calls, 'failure').length, 1); assert.equal(called(calls, 'consume').length, 0);
  assert.ok(!JSON.stringify(res.body).includes('private schema detail'));
});
for(const current of [{password:'changed-hash'},{email:'changed@apsit.edu.in'},{is_active:false}]) test('account change inside transaction rejects before consuming OTP',async()=>{
 const {controller,calls}=fixture({current}),res=response();await controller.changePassword(request(),res);assert.equal(res.code,409);assert.equal(called(calls,'consume').length,0);assert.equal(called(calls,'update').length,0);
});
test('valid password change consumes correct-purpose OTP then updates/cuts off/revokes in same transaction',async()=>{
 const {controller,calls}=fixture(),res=response();await controller.changePassword(request(),res);assert.equal(res.code,200);
 const consume=called(calls,'consume')[0][1];assert.equal(consume.email,'actual@apsit.edu.in');assert.equal(consume.purpose,'password');assert.equal(consume.otp,'123456');
 const update=called(calls,'update')[0][1];assert.equal(update.where.id,7);assert.equal(update.data.password,'new-hash');assert.ok(update.data.sessions_revoked_at instanceof Date);
 const revoke=called(calls,'revoke')[0][1];assert.deepEqual(Array.from(revoke.where.userId.in),['7','actual@apsit.edu.in']);assert.equal(revoke.where.revokedAt,null);assert.ok(revoke.data.revokedAt instanceof Date);
 const index=name=>calls.findIndex(call=>Array.isArray(call)&&call[0]===name);
 assert.ok(calls.indexOf('transaction-start')<index('consume'));assert.ok(index('consume')<index('update'));assert.ok(index('update')<index('revoke'));assert.ok(index('revoke')<calls.indexOf('transaction-end'));
});

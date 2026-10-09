const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const filename = path.join(__dirname, '../utils/emailService.js');
const realRequire = createRequire(filename);
function load(response, env = { RESEND_API_KEY: 're_mockkey', RESEND_FROM_EMAIL: 'sender@example.test' }) {
  const module = { exports: {} }, sent = [], logs = [];
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, process: { env }, console: { warn(...args) { logs.push(args); }, error(...args) { logs.push(args); } },
    require(name) { return name === 'resend' ? { Resend: class {
      emails = { send: async payload => { sent.push(payload); if (response instanceof Error) throw response; return response; } };
    } } : realRequire(name); },
  });
  return { ...module.exports, sent, logs };
}
for (const env of [{}, { RESEND_API_KEY: 're_mockkey' }, { RESEND_API_KEY: 're_mockkey', RESEND_FROM_EMAIL: 'bad\r\nheader' }]) {
  test('missing or malformed email configuration blocks sending', async () => {
    const service = load({}, env);
    const result = await service.sendEmail('recipient@example.test', 'subject', 'body');
    assert.equal(result.code, 'EMAIL_NOT_CONFIGURED');
    assert.equal(service.sent.length, 0);
    assert.equal(service.isSmtpConfigured(), false);
  });
}
test('malformed API key is reported safely before sending', async () => {
  const service = load({}, { RESEND_API_KEY: 'secret key', RESEND_FROM_EMAIL: 'sender@example.test' });
  const result = await service.sendEmail('recipient@example.test', 'subject', 'body');
  assert.equal(result.code, 'EMAIL_INVALID_KEY'); assert.equal(service.sent.length, 0);
  assert.ok(!JSON.stringify(result).includes('secret key'));
});
for (const [error, code] of [
  [{ name: 'invalid_api_key', message: 'API key is invalid' }, 'EMAIL_INVALID_KEY'],
  [{ name: 'validation_error', message: 'The example.test domain is not verified' }, 'EMAIL_SENDER_UNVERIFIED'],
  [{ name: 'rate_limit_exceeded', statusCode: 429 }, 'EMAIL_RATE_LIMITED'],
  [{ name: 'application_error', message: 'private raw provider detail' }, 'EMAIL_DELIVERY_FAILED'],
]) test(`provider rejects safely as ${code}`, async () => {
  const service = load({ error });
  const result = await service.sendEmail('recipient@example.test', 'subject', 'body');
  assert.equal(result.code, code); assert.equal(result.success, false);
  assert.ok(!JSON.stringify(result).includes(error.message || 'private raw provider detail'));
});
test('provider outage is safe and does not expose email content or exception', async () => {
  const service = load(new Error('outage secret otp 123456'));
  const result = await service.sendOtpEmail('recipient@example.test', '123456');
  assert.equal(result.code, 'EMAIL_DELIVERY_FAILED');
  assert.ok(!JSON.stringify([result, service.logs]).includes('123456'));
});
test('missing message ID cannot be reported as delivery success', async () => {
  const service = load({ data: {} });
  assert.equal((await service.sendEmail('recipient@example.test', 'subject', 'body')).success, false);
});
test('successful OTP delivery preserves password default and labels username purpose', async () => {
  const service = load({ data: { id: 'mock-message' } });
  assert.equal((await service.sendOtpEmail('recipient@example.test', '123456')).messageId, 'mock-message');
  await service.sendOtpEmail('recipient@example.test', '654321', 'username');
  assert.match(service.sent[0].subject, /Password Change/);
  assert.match(service.sent[1].subject, /Username Change/);
  assert.match(service.sent[1].html, /username change/);
  assert.doesNotMatch(service.sent[1].html, /password change/i);
});

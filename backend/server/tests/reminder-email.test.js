const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const he = require('he');
function load() {
  const queries = [], sent = [], module = { exports: {} };
  const pool = { async query(sql) {
    queries.push(sql);
    return { rows: sql.includes('FROM staff') ? [
      { email: 'faculty@example.test', role: 'Faculty', is_active: true },
      { email: 'inactive@example.test', role: 'Faculty', is_active: false },
      { email: 'coordinator@example.test', role: 'Coordinator', is_active: true },
      { email: 'hod@example.test', role: 'HOD', is_active: true },
    ] : [{ email: 'newstudent@example.test' }] };
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../utils/reminderEmail'), 'utf8'), {
    module, setTimeout: resolve => resolve(),
    require(name) {
      if (name.includes('config/database')) return pool;
      if (name.includes('models/StudentForm')) return { distinct: async () => ['student@example.test', 'STUDENT@example.test', 'inactive@example.test', 'bad'] };
      if (name === 'he') return he;
      if (name === './emailService') return { sendEmail: async (...args) => { sent.push(args); return { success: args[0] !== 'fail@example.test' }; } };
      throw new Error(name);
    },
  });
  return { ...module.exports, queries, sent };
}
test('reminder audience selects active staff and known students, deduplicates, and excludes inactive staff', async () => {
  const service = load();
  assert.deepEqual(Array.from(await service.reminderRecipients([])).sort(), ['coordinator@example.test', 'faculty@example.test', 'newstudent@example.test', 'student@example.test']);
});
test('faculty-only reminder never queries student recipients', async () => {
  const service = load();
  assert.deepEqual(Array.from(await service.reminderRecipients(['Faculty'])), ['faculty@example.test']);
  assert.equal(service.queries.length, 1);
});
test('reminder email escapes content, hides other recipients and reports partial failure', async () => {
  const service = load();
  const result = await service.sendReminderEmails(['one@example.test', 'fail@example.test'], { message: '<script>bad</script>\nNext line', updatedBy: 'HOD <Name>', updatedByRole: 'HOD' });
  assert.equal(result.sent, 1); assert.equal(result.failed, 1);
  assert.ok(!service.sent[0][2].includes('<script>'));
  assert.ok(he.decode(service.sent[0][2]).includes('<script>bad</script>'));
  assert.ok(service.sent[0][2].includes('<br>'));
  assert.ok(!service.sent[0][2].includes('fail@example.test'));
});

function routeHarness(previous, configured = true) {
  let handler, saved = 0, deliveries = 0;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../routes/announcementRoutes'), 'utf8'), {
    module, process: { env: { VERCEL: '1' } }, console,
    require(name) {
      if (name === 'express') return { Router: () => ({ get() {}, put(...args) { handler = args.at(-1); } }) };
      if (name.includes('middleware/auth')) return { verifyToken() {}, requireRole() {} };
      if (name.includes('models/SystemAnnouncement')) return {
        findOne: () => ({ sort: () => ({ lean: async () => previous }) }),
        findOneAndUpdate: async (_, data) => { saved++; return data; },
      };
      if (name.includes('utils/emailService')) return { isSmtpConfigured: () => configured };
      if (name.includes('utils/reminderEmail')) return {
        audienceRoles: ['Student', 'Faculty', 'Coordinator'],
        reminderRecipients: async () => ['user@example.test'],
        sendReminderEmails: async () => { deliveries++; return { sent: 1, failed: 0 }; },
      };
      throw new Error(name);
    },
  });
  return { async save(body) {
    let status = 200, result;
    await handler({ body, user: { role: 'HOD', name: 'Test HOD' } }, { status(code) { status = code; return this; }, json(data) { result = data; } });
    return { status, result, saved, deliveries };
  } };
}
test('new active reminder sends email; unchanged saves and hiding do not resend', async () => {
  const body = { message: 'Submit soon', isActive: true, targetRoles: ['Faculty'] };
  assert.equal((await routeHarness(null).save(body)).deliveries, 1);
  assert.equal((await routeHarness(body).save(body)).deliveries, 0);
  assert.equal((await routeHarness(body).save({ ...body, isActive: false })).deliveries, 0);
  assert.equal((await routeHarness({ ...body, isActive: false }).save(body)).deliveries, 1);
});
test('invalid audience and missing mail configuration fail before saving or sending', async () => {
  let result = await routeHarness(null).save({ message: 'Test', targetRoles: ['Admin'] });
  assert.equal(result.status, 400); assert.equal(result.saved, 0);
  result = await routeHarness(null, false).save({ message: 'Test' });
  assert.equal(result.status, 503); assert.equal(result.saved, 0); assert.equal(result.deliveries, 0);
});

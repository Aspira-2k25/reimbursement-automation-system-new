const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.join(__dirname, '..');
function load(file, stubs, env = {}, DateClass = Date) {
  const filename = path.join(root, file), requireLocal = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, require: name => stubs[name] || requireLocal(name),
    process: { env, on() {} }, Date: DateClass, URL, console: { error() {}, log() {}, warn() {} } });
  return module.exports;
}
for (const mode of ['require', 'verify-ca', 'verify-full']) test(`explicit ${mode} TLS remains verified outside production`, () => {
  let config;
  load('config/database.js', { pg: { Pool: class { constructor(options) { config = options; } on() {} } },
    fs: { readFileSync(file) { assert.equal(file, '/provider.pem'); return 'PROVIDER CA'; } } },
  { NODE_ENV: 'development', DATABASE_URL: `postgresql://test:test@db.test/database?sslmode=${mode}&sslrootcert=/provider.pem` });
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.ca, 'PROVIDER CA');
  assert.equal(new URL(config.connectionString).searchParams.has('sslmode'), false);
});
test('production refuses sslmode=disable rather than turning off certificate validation', () => {
  let config;
  load('config/database.js', { pg: { Pool: class { constructor(options) { config = options; } on() {} } } },
    { NODE_ENV: 'production', DATABASE_URL: 'postgresql://test:test@db.test/db?sslmode=disable' });
  assert.equal(config.ssl.rejectUnauthorized, true);
});
test('concurrent student reservations never exceed daily cap and failed requests release their slot', async () => {
  let count;
  const queries = [];
  const quota = { async updateOne(query, update) {
    if (update.$setOnInsert && count === undefined) count = update.$setOnInsert.count;
    if (update.$inc) count += update.$inc.count;
  }, async findOneAndUpdate() { if (count >= 3) return null; count++; return { count }; } };
  const middleware = load('middleware/submissionQuota.js', { '../models/DailyQuota': quota,
    '../models/StudentForm': { async countDocuments(query) { queries.push(query); return 0; } } });
  const requests = Array.from({ length: 8 }, () => {
    const req = { user: { userId: 7 }, submissionSaved: false };
    const res = { code: 200, once(_event, callback) { this.finish = callback; }, status(code) { this.code = code; return this; }, json() {} };
    return { req, res, accepted: false };
  });
  await Promise.all(requests.map(item => middleware(item.req, item.res, error => { assert.equal(error, undefined); item.accepted = true; })));
  assert.equal(requests.filter(item => item.accepted).length, 3);
  assert.equal(requests.filter(item => item.res.code === 429).length, 5);
  assert.equal(queries[0].createdAt.$gte.toISOString().slice(11), '18:30:00.000Z');
  requests[0].res.finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(count, 2);
  const committed = requests[1]; committed.req.submissionSaved = true; committed.res.finish();
  await new Promise(resolve => setImmediate(resolve)); assert.equal(count, 2);
});

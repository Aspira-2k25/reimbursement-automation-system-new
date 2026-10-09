const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
function load(file, stubs = {}) {
  const filename = path.join(root, file), local = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { require: key => Object.hasOwn(stubs, key) ? stubs[key] : local(key),
    module, process: { env: {} }, Date, Buffer, console: { error() {}, warn() {}, log() {} } }, { filename });
  return module.exports;
}
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
const policy = require('../utils/formPolicy');
const validBody = { name: 'Applicant', email: 'applicant@apsit.edu.in', courseName: 'NPTEL', amount: '100', marks: '75', accountName: 'Applicant', accountNumber: '123456789', ifscCode: 'TEST0000001' };
test('unsupported reimbursement categories are rejected for submission and edits', () => {
  for (const type of ['FDP', 'Conference', 'Workshop', 'Travel', ['NPTEL']]) {
    const body = { ...validBody, reimbursementType: type };
    assert.match(policy.validateFields(body, { submission: true }), /Only NPTEL/);
    assert.match(policy.validateFields(body), /Only NPTEL/);
  }
  assert.equal(policy.validateFields({ ...validBody, reimbursementType: 'NPTEL' }, { submission: true }), null);
});
test('NPTEL submissions, edits and both models enforce the INR 1500 boundary', () => {
  assert.equal(policy.MAX_AMOUNT, 1500);
  for (const amount of ['1500', '1500.01']) {
    const accepted = amount === '1500';
    for (const student of [false, true]) {
      const body = { ...validBody, amount, studentId: 'ST01', division: 'A' };
      const req = { user: { role: student ? 'Student' : 'Faculty', email: body.email }, body };
      let next = false;
      policy.validateSubmission(student)(req, response(), () => { next = true; });
      assert.equal(next, accepted);
      next = false;
      policy.validateEdit(req, response(), () => { next = true; });
      assert.equal(next, accepted);
      const Model = require(student ? '../models/StudentForm' : '../models/Form');
      const form = new Model({ ...body, applicationId: 'NPT-BOUNDARY-001', userId: student ? body.email : '7' });
      assert.equal(Boolean(form.validateSync()?.errors.amount), !accepted);
    }
  }
});
test('Student cannot submit a faculty form; applicant type cannot bypass HOD review', () => {
  for (const [role, body] of [['Student', validBody], ['Faculty', { ...validBody, applicantType: 'HOD' }]]) {
    const res = response(); let next = false;
    policy.validateSubmission(false)({ user: { role, email: 'applicant@apsit.edu.in' }, body: { ...body } }, res, () => { next = true; });
    assert.equal(res.code, 403); assert.equal(next, false);
  }
});
test('submission derives email/applicant type from session and rejects server-controlled fields', () => {
  const req = { user: { role: 'Faculty', email: 'authoritative@apsit.edu.in' }, body: { ...validBody, email: 'forged@apsit.edu.in' } };
  let next = false; policy.validateSubmission(false)(req, response(), () => { next = true; });
  assert.equal(next, true); assert.equal(req.applicantType, 'Faculty'); assert.equal(req.body.email, 'authoritative@apsit.edu.in');
  for (const field of ['status', 'userId', 'documents', 'applicationId', 'reviewedBy']) {
    const res = response(); let accepted = false;
    policy.validateSubmission(false)({ user: req.user, body: { ...validBody, [field]: 'forged' } }, res, () => { accepted = true; });
    assert.equal(res.code, 400); assert.equal(accepted, false);
  }
});
test('real Form validators reject invalid amounts and marks without database access', () => {
  const Form = require('../models/Form');
  for (const fields of [{ amount: -1 }, { amount: 0 }, { amount: 1.001 }, { amount: policy.MAX_AMOUNT + 1 }, { marks: -1 }, { marks: 101 }]) {
    const form = new Form({ ...validBody, applicationId: 'F-IT-NPT-TEST-001', userId: '7', ...fields });
    assert.ok(form.validateSync(), JSON.stringify(fields));
  }
  const valid = new Form({ ...validBody, applicationId: 'F-IT-NPT-TEST-002', userId: '7', amount: 100.25, marks: 100 });
  assert.equal(valid.validateSync(), undefined);
});
test('client-supplied document identifiers and malformed edit fields are rejected', () => {
  for (const body of [{ documents: [{ publicId: 'victim' }] }, { name: { $ne: null } }, { amount: [1] }, { amount: 'Infinity' }]) {
    const res = response(); let next = false; policy.validateEdit({ body }, res, () => { next = true; });
    assert.equal(res.code, 400); assert.equal(next, false);
  }
});
function fixture(student = false, overrides = {}, behavior = {}) {
  const form = { _id: '64f000000000000000000001', applicationId: 'TEST-001', userId: '7',
    applicantType: 'Faculty', status: student ? 'Pending' : 'Under HOD', department: 'IT', updatedAt: new Date('2026-01-01'),
    documents: [{ publicId: 'original-evidence', kind: 'nptelResult' }], ...overrides };
  const effects = { uploads: 0, deletes: [], notifications: 0, updates: [], queries: [] };
  function model(data) { Object.assign(this, data); this.save = async () => {
    if (behavior.saveFailure) throw new Error('database write failed'); effects.saved = true;
  }; }
  Object.assign(model, { async findOne() { return form; }, async findById() { return form; },
    async findOneAndUpdate(query, update) { effects.updates.push(query); effects.updatedDocuments = update.$set.documents; return behavior.updateSuccess ? { ...form, ...update.$set } : null; },
    find(query) { effects.queries.push(query); return { sort() { return this; }, skip() { return this; }, limit() { return this; }, select() { return this; }, async lean() { return []; } }; },
    async countDocuments() { return 0; } });
  const middleware = () => (req, res, next) => next();
  const stubs = { '../models/Form': model, '../models/StudentForm': model,
    '../middleware/auth': { verifyToken: middleware(), requireRole: middleware },
    '../middleware/multer': { fields: middleware, validateUploadedFiles: middleware() },
    '../middleware/submissionQuota': middleware(),
    '../utils/cloudinary': { async uploadFile(file, options) {
      effects.uploads++; const result = { public_id: effects.uploads === 1 ? 'new-evidence' : `new-evidence-${effects.uploads}`, secure_url: 'signed' };
      options.tracking.push(result); return result;
    }, async uploadBatch(promises) { return Promise.all(promises); },
      async rollbackUploads(results) { for (const result of results) effects.deletes.push(result.public_id); },
      toDocument(result, kind) { return { publicId: result.public_id, kind }; }, async deleteDocument(doc) { effects.deletes.push(doc.publicId); }, serializeDocuments(docs) { return docs; } },
    '../utils/applicationIdGenerator': { async generateApplicationId() { return 'NEW'; } },
    '../utils/notificationService': new Proxy({}, { get() { return async () => { effects.notifications++; }; } }), '../utils/database': {} };
  const router = load(student ? 'routes/StudentFormRoutes.js' : 'routes/formRoutes.js', stubs);
  return { form, effects, stack(method, route) { return router.stack.find(layer => layer.route?.path === route && layer.route.methods[method]).route.stack; }, handler(method, route) { return router.stack.find(layer => layer.route?.path === route && layer.route.methods[method]).route.stack.at(-1).handle; } };
}
function request(role = 'Faculty', userId = 7, body = {}) { return { params: { id: 'TEST-001' }, user: { role, userId, email: 'applicant@apsit.edu.in', department: 'IT' }, body, query: {}, get() {} }; }
test('Approved owner file replacement returns 403 without cloud mutation', async () => {
  const fixtureData = fixture(false, { status: 'Approved' }), res = response(), req = request('Faculty', 7, { name: 'Changed' });
  req.files = { nptelResult: [{ buffer: Buffer.from('file') }] }; await fixtureData.handler('put', '/:id')(req, res);
  assert.equal(res.code, 403); assert.equal(fixtureData.effects.uploads, 0); assert.equal(fixtureData.effects.deletes.length, 0); assert.equal(fixtureData.effects.updates.length, 0);
});
test('Coordinator cannot review someone else faculty application', async () => {
  const f = fixture(), res = response(); await f.handler('put', '/:id')(request('Coordinator', 8, { status: 'Under Principal' }), res);
  assert.equal(res.code, 403); assert.equal(f.effects.updates.length, 0); assert.equal(f.effects.notifications, 0);
});
test('Faculty rejected list contains authoritative owner predicate', async () => {
  const f = fixture(), res = response(); await f.handler('get', '/rejected')(request('Faculty', 7), res);
  assert.equal(res.code, 200); const query = f.effects.queries[0];
  const encoded = JSON.stringify(query); assert.match(encoded, /"userId":"7"/);
});
test('non-owner student document update is denied before upload', async () => {
  const f = fixture(true), res = response(), req = request('Student', 'other@apsit.edu.in'); req.files = { idCard: [{ buffer: Buffer.from('file') }] };
  await f.handler('post', '/:id/documents')(req, res); assert.equal(res.code, 403); assert.equal(f.effects.uploads, 0); assert.equal(f.effects.deletes.length, 0);
});
for (const student of [false, true]) test(`${student ? 'student' : 'faculty'} stale review conflict performs no notifications or original cleanup`, async () => {
  const f = fixture(student, { status: 'Under HOD' }), res = response();
  await f.handler('put', '/:id')(request('HOD', 8, { status: 'Under Principal' }), res);
  assert.equal(res.code, 409); assert.equal(f.effects.notifications, 0); assert.equal(f.effects.deletes.length, 0);
  assert.equal(f.effects.updates[0].status, 'Under HOD'); assert.equal(f.effects.updates[0].updatedAt.getTime(), f.form.updatedAt.getTime());
});
test('stale faculty owner replacement cleans only new upload, never original evidence', async () => {
  const f = fixture(), res = response(), req = request('Faculty', 7, { name: 'Changed' }); req.files = { nptelResult: [{ buffer: Buffer.from('new') }] };
  await f.handler('put', '/:id')(req, res); assert.equal(res.code, 409); assert.equal(f.effects.uploads, 1);
  assert.deepEqual(f.effects.deletes, ['new-evidence']); assert.equal(f.effects.notifications, 0);
});

test('real faculty submission middleware stack denies Student before cloud or save', async () => {
  const f = fixture(), res = response(), req = request('Student', 'student@apsit.edu.in', { ...validBody });
  for (const layer of f.stack('post', '/submit')) {
    let next = false; await layer.handle(req, res, () => { next = true; });
    if (!next) break;
  }
  assert.equal(res.code, 403); assert.equal(f.effects.uploads, 0); assert.equal(f.effects.updates.length, 0);
});

for (const student of [false, true]) {
  test(`${student ? 'student' : 'faculty'} ambiguous legacy attachment replacement fails before upload`, async () => {
    const f = fixture(student, { documents: [{ publicId: 'ambiguous-old' }] }), res = response(), req = request(student ? 'Student' : 'Faculty', 7, { name: 'Updated' });
    req.files = { nptelResult: [{ buffer: Buffer.from('new') }] };
    await f.handler(student ? 'post' : 'put', student ? '/:id/documents' : '/:id')(req, res);
    assert.equal(res.code, 409); assert.equal(f.effects.uploads, 0); assert.equal(f.effects.deletes.length, 0);
  });
  test(`${student ? 'student' : 'faculty'} adding result preserves lone labelled ID document`, async () => {
    const f = fixture(student, { documents: [{ publicId: 'original-id', kind: 'idCard' }] }, { updateSuccess: true });
    const req = request(student ? 'Student' : 'Faculty', 7, { name: 'Updated' }), res = response(); req.files = { nptelResult: [{ buffer: Buffer.from('result') }] };
    await f.handler(student ? 'post' : 'put', student ? '/:id/documents' : '/:id')(req, res);
    assert.equal(res.code, 200); assert.equal(f.effects.updatedDocuments[0].publicId, 'original-id');
    assert.equal(f.effects.updatedDocuments[1].kind, 'nptelResult'); assert.equal(f.effects.deletes.length, 0);
  });
  test(`${student ? 'student' : 'faculty'} failed application save rolls back every staged upload`, async () => {
    const f = fixture(student, {}, { saveFailure: true }), req = request(student ? 'Student' : 'Faculty', 7, { ...validBody, studentId: 'ST001', division: 'A' }), res = response();
    req.applicantType = student ? 'Student' : 'Faculty'; req.files = { nptelResult: [{ buffer: Buffer.from('result') }], idCard: [{ buffer: Buffer.from('id') }] };
    await f.handler('post', '/submit')(req, res); assert.equal(res.code, 500); assert.equal(f.effects.uploads, 2);
    assert.deepEqual(f.effects.deletes.sort(), ['new-evidence', 'new-evidence-2']); assert.equal(f.effects.notifications, 0);
  });
  test(`${student ? 'student' : 'faculty'} history reviewers receive only their own records`, async () => {
    for (const role of ['Coordinator', 'HOD', 'Principal', 'Accounts']) {
      const f = fixture(student), res = response(); await f.handler('get', '/history')(request(role, 9), res);
      assert.equal(res.code, 200); assert.equal(JSON.stringify(f.effects.queries[0]), '{"userId":"9"}');
    }
  });
}
test('student document stale write cleans staged upload and preserves original', async () => {
  const f = fixture(true), req = request('Student', 7), res = response(); req.files = { nptelResult: [{ buffer: Buffer.from('new') }] };
  await f.handler('post', '/:id/documents')(req, res); assert.equal(res.code, 409);
  assert.deepEqual(f.effects.deletes, ['new-evidence']); assert.equal(f.effects.notifications, 0);
  assert.equal(f.effects.updates[0].userId, '7'); assert.equal(f.effects.updates[0].status, 'Pending');
});

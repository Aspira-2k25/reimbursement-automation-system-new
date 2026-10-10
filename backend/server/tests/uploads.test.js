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
for (const scenario of ['other-owner', 'referenced', 'unreferenced', 'invalid-id']) test(`generic document deletion: ${scenario}`, async () => {
  let deletes = 0, queries = 0;
  const stubs = { '../models/Attachment': { async findOne(query) { queries++; assert.equal(query.ownerId, '7'); return scenario === 'other-owner' ? null : { publicId: 'owned-file', ownerId: '7' }; } },
    '../models/Form': { async exists() { return scenario === 'referenced'; } }, '../models/StudentForm': { async exists() { return false; } },
    '../utils/cloudinary': { async deleteDocument() { deletes++; } },
    '../middleware/auth': { verifyToken() {} }, '../middleware/multer': { validateUploadedFiles() {} } };
  const router = load('routes/uploadRoutes.js', stubs), handler = router.stack.find(layer => layer.route?.methods.delete).route.stack.at(-1).handle;
  const res = response(); await handler({ params: { publicId: scenario === 'invalid-id' ? '../victim' : 'owned-file' }, user: { userId: 7 } }, res);
  assert.equal(res.code, scenario === 'other-owner' ? 403 : scenario === 'referenced' ? 409 : scenario === 'invalid-id' ? 400 : 200);
  assert.equal(deletes, scenario === 'unreferenced' ? 1 : 0); if (scenario === 'invalid-id') assert.equal(queries, 0);
});
function cloudFixture(failure = false) {
  const calls = { uploads: [], destroys: [], attachments: [] };
  const cloud = { config() {}, uploader: {
    async upload(data, options) { calls.uploads.push({ data, options }); return { public_id: 'server-generated', resource_type: 'image', format: 'pdf', secure_url: 'unsafe-public' }; },
    async destroy(id, options) { calls.destroys.push({ id, options }); } },
    utils: { private_download_url(id, format, options) { assert.equal(options.type, 'authenticated'); assert.ok(options.expires_at > Date.now() / 1000); return `signed:${id}:${format}`; } } };
  const helper = load('utils/cloudinary.js', { cloudinary: { v2: cloud }, '../models/Attachment': {
    async create(data) { if (failure) throw new Error('ownership persistence failed'); calls.attachments.push(data); },
    async findOne(query) { return calls.attachments.find(item => item.publicId === query.publicId); }, async deleteOne() {} } });
  return { helper, calls };
}
test('upload helper enforces authenticated delivery and persists owner before exposing signed URL', async () => {
  const { helper, calls } = cloudFixture();
  const result = await helper.uploadFile({ buffer: Buffer.from('%PDF-1.4'), mimetype: 'application/pdf' }, { ownerId: 7, type: 'upload', overwrite: true });
  assert.equal(calls.uploads[0].options.type, 'authenticated'); assert.equal(calls.uploads[0].options.overwrite, false);
  assert.equal(calls.uploads[0].options.unique_filename, true); assert.equal(calls.uploads[0].options.ownerId, undefined);
  assert.equal(calls.attachments[0].ownerId, '7'); assert.equal(calls.attachments[0].publicId, 'server-generated');
  assert.equal(result.secure_url, 'signed:server-generated:pdf'); assert.equal(helper.toDocument(result).deliveryType, 'authenticated');
});
test('upload rejects missing owner without cloud effects', async () => {
  const { helper, calls } = cloudFixture(); await assert.rejects(helper.uploadFile({ buffer: Buffer.from('file') }), /owner is required/);
  assert.equal(calls.uploads.length, 0); assert.equal(calls.attachments.length, 0);
});
test('ownership persistence failure destroys new authenticated object and fails upload', async () => {
  const { helper, calls } = cloudFixture(true);
  await assert.rejects(helper.uploadFile({ buffer: Buffer.from('file') }, { ownerId: '7' }), /ownership persistence failed/);
  assert.equal(calls.destroys.length, 1); assert.equal(calls.destroys[0].id, 'server-generated'); assert.equal(calls.destroys[0].options.type, 'authenticated');
});
test('file content validation accepts PDF magic and rejects MIME mismatch/plain text', async () => {
  const upload = require('../middleware/multer');
  for (const [buffer, mimetype, expected] of [
    [Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n'), 'application/pdf', 200],
    [Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n'), 'image/jpeg', 400],
    [Buffer.from('plain text pretending to be a PDF document'), 'application/pdf', 400],
  ]) {
    const res = response(); let next = false;
    await upload.validateUploadedFiles({ file: { buffer, mimetype, originalname: 'document.pdf' } }, res, () => { next = true; });
    assert.equal(res.code, expected); assert.equal(next, expected === 200);
  }
});
test('multipart parser rejects unexpected upload field without accepting file', async () => {
  const upload = require('../middleware/multer'), { Readable } = require('node:stream');
  const boundary = 'regression-boundary';
  const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="unexpected"; filename="document.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\r\n--${boundary}--\r\n`);
  const req = Readable.from([body]); req.headers = { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': String(body.length) }; req.method = 'POST';
  const error = await new Promise(resolve => upload.fields([{ name: 'idCard', maxCount: 1 }])(req, {}, resolve));
  assert.equal(error.code, 'LIMIT_UNEXPECTED_FILE'); assert.equal(req.files?.idCard, undefined);
});
test('multipart header extension mismatch is rejected', async () => {
  const upload = require('../middleware/multer'), { Readable } = require('node:stream'); const boundary = 'extension-boundary';
  const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="idCard"; filename="document.jpg"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\r\n--${boundary}--\r\n`);
  const req = Readable.from([body]); req.headers = { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': String(body.length) }; req.method = 'POST';
  const error = await new Promise(resolve => upload.fields([{ name: 'idCard', maxCount: 1 }])(req, {}, resolve));
  assert.match(error.message, /does not match content type/);
});
test('one failed upload rolls back successful siblings once, including handler cleanup', async () => {
  const { helper, calls } = cloudFixture();
  const tracked = [];
  const successful = helper.uploadFile({ buffer: Buffer.from('file') }, { ownerId: 7, tracking: tracked });
  await assert.rejects(helper.uploadBatch([successful, Promise.reject(new Error('sibling failed'))]), /sibling failed/);
  await helper.rollbackUploads(tracked);
  assert.equal(calls.destroys.length, 1);
  assert.equal(calls.destroys[0].id, 'server-generated');
});
test('document cleanup refuses another owner and unregistered legacy identifiers', async () => {
  const { helper, calls } = cloudFixture();
  const result = await helper.uploadFile({ buffer: Buffer.from('file') }, { ownerId: 7 });
  await assert.rejects(helper.deleteDocument(helper.toDocument(result), 99), /ownership mismatch/);
  await helper.deleteDocument({ publicId: 'unregistered-victim', deliveryType: 'upload' }, 7);
  assert.equal(calls.destroys.length, 0);
});

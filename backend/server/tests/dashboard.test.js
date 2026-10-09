const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const file = path.resolve(__dirname, '../routes/dashboardRoutes.js');
const local = createRequire(file);
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
const faculty = [
  { _id: 'f1', name: 'Visible faculty', department: 'IT', status: 'Under HOD', amount: 100, createdAt: new Date('2026-01-02'), documents: ['private'], accountNumber: 'bank' },
  { _id: 'f2', name: 'Other department', department: 'Civil Engineering', status: 'Approved', amount: 900, createdAt: new Date('2026-01-03') },
  { _id: 'f3', name: 'Not yet visible', department: 'IT', status: 'Pending', amount: 800, createdAt: new Date('2026-01-03') },
];
const students = [
  { _id: 's1', name: 'Visible student', department: 'Information Technology', status: 'Approved', amount: 200, createdAt: new Date('2026-01-04'), documents: ['private'], accountNumber: 'bank' },
  { _id: 's2', name: 'Other student', department: 'Civil Engineering', status: 'Reimbursed', amount: 700, createdAt: new Date('2026-01-05') },
  { _id: 's3', name: 'Rejected by Principal', department: 'IT', status: 'Rejected', rejectedBy: 'Principal', amount: 600, createdAt: new Date('2026-01-05') },
];
// In-memory fixture adapter evaluates emitted ACL/filter and projection stages. No database connection occurs.
function matches(row, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$and') return expected.every(clause => matches(row, clause));
    if (key === '$or') return expected.some(clause => matches(row, clause));
    const value = row[key];
    if (expected && typeof expected.test === 'function') return expected.test(String(value));
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      return Object.entries(expected).every(([operator, operand]) => {
        if (operator === '$in') return operand.includes(value);
        if (operator === '$regex') return operand.test(String(value));
        if (operator === '$gte') return value >= operand;
        if (operator === '$lte') return value <= operand;
        assert.fail(`Unsupported fixture filter ${operator}`);
      });
    }
    return value === expected;
  });
}
function expression(value, row) {
  if (typeof value === 'string' && value.startsWith('$')) return row[value.slice(1)];
  if (Array.isArray(value)) return value.map(item => expression(item, row));
  if (!value || typeof value !== 'object') return value;
  if (value.$ifNull) { const [left, right] = expression(value.$ifNull, row); return left ?? right; }
  if (value.$in) { const [item, values] = expression(value.$in, row); return values.includes(item); }
  if (value.$eq) { const [left, right] = expression(value.$eq, row); return left === right; }
  if (value.$cond) return expression(value.$cond[expression(value.$cond[0], row) ? 1 : 2], row);
  assert.fail('Unsupported fixture expression');
}
function groupedSummary(rows, pipeline) {
  if (!rows.length) return [];
  const group = pipeline.find(stage => stage.$group).$group;
  return [Object.fromEntries(Object.entries(group).map(([field, aggregate]) => {
    if (field === '_id') return [field, null];
    assert.ok(aggregate.$sum !== undefined);
    return [field, rows.reduce((total, row) => total + expression(aggregate.$sum, row), 0)];
  }))];
}
function stages(input, pipeline) {
  let rows = input.map(row => ({ ...row }));
  for (const stage of pipeline) {
    if (stage.$match) rows = rows.filter(row => matches(row, stage.$match));
    else if (stage.$project) rows = rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => stage.$project[key] !== 0)));
    else if (stage.$set) rows = rows.map(row => ({ ...row,
      ...Object.fromEntries(Object.entries(stage.$set).map(([key, value]) => [key, expression(value, row)])) }));
    else if (stage.$unionWith) rows.push(...stages(students, stage.$unionWith.pipeline));
    else if (stage.$facet) {
      const forms = [...rows].sort((a, b) => b.createdAt - a.createdAt);
      const skip = stage.$facet.forms?.find(part => part.$skip !== undefined)?.$skip || 0;
      const limit = stage.$facet.forms?.find(part => part.$limit !== undefined)?.$limit || forms.length;
      return [{ forms: forms.slice(skip, skip + limit), summary: groupedSummary(rows, stage.$facet.summary), byStatus: [], byDepartment: [], byCategory: [], monthly: [] }];
    } else assert.fail('Unsupported fixture aggregate stage');
  }
  return rows;
}
function routerFixture(failure = false) {
  const observed = [];
  function model(rows) { return { collection: { name: 'studentforms' }, aggregate(pipeline) {
    observed.push(pipeline); return { async option(options) {
      assert.equal(options.maxTimeMS, 10000); if (failure) throw new Error('storage unavailable'); return stages(rows, pipeline);
    } };
  } }; }
  const stubs = { '../models/Form': model(faculty), '../models/StudentForm': model(students),
    '../middleware/auth': { verifyToken() {}, requireRole() { return () => {}; } } };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { require: name => Object.hasOwn(stubs, name) ? stubs[name] : local(name), module, Date, console });
  return { observed, handler(route = '/') { return module.exports.stack.find(layer => layer.route?.path === route).route.stack.at(-1).handle; } };
}
test('HOD ACL filters faculty and student collections before combined summaries', async () => {
  const fixture = routerFixture(), res = response();
  await fixture.handler()({ user: { role: 'HOD', department: 'IT' }, query: {} }, res);
  assert.equal(res.code, 200); assert.equal(res.body.forms.map(row => row._id).sort().join(','), 'f1,s1');
  assert.equal(res.body.summary.total, 2); assert.equal(res.body.summary.totalAmount, 300);
  assert.equal(res.body.summary.pending, 1); assert.equal(res.body.summary.approved, 1);
  const union = fixture.observed[0].find(stage => stage.$unionWith).$unionWith;
  assert.ok(union.pipeline[0].$match); assert.ok(fixture.observed[0][0].$match);
  for (const row of res.body.forms) { assert.equal(row.documents, undefined); assert.equal(row.accountNumber, undefined); }
});
test('student applicant filter applies after collection normalization without exposing other faculty', async () => {
  const fixture = routerFixture(), res = response();
  await fixture.handler()({ user: { role: 'HOD', department: 'IT' }, query: { applicantType: 'Student' } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.forms.map(row => row._id).join(','), 's1');
  assert.equal(res.body.summary.total, 1);
});
test('HOD approved history does not include applications still awaiting HOD review', async () => {
  const fixture = routerFixture(), res = response();
  await fixture.handler()({ user: { role: 'HOD', department: 'IT' }, query: { status: 'approved-history' } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.forms.map(row => row._id).join(','), 's1');
});
test('department filter affects both Accounts collections and filtered totals', async () => {
  const fixture = routerFixture(), res = response();
  await fixture.handler()({ user: { role: 'Accounts' }, query: { department: 'IT', status: 'approved' } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.forms.length, 1); assert.equal(res.body.forms[0]._id, 's1');
  assert.equal(res.body.summary.totalAmount, 200); assert.equal(res.body.forms[0].accountNumber, 'bank');
  assert.equal(res.body.forms[0].documents, undefined);
});
test('pagination bounds returned rows without changing filtered summary', async () => {
  const fixture = routerFixture(), res = response();
  await fixture.handler()({ user: { role: 'HOD', department: 'IT' }, query: { page: '2', limit: '1' } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.forms.length, 1); assert.equal(res.body.forms[0]._id, 'f1');
  assert.equal(res.body.summary.total, 2); assert.equal(res.body.pagination.total, 2);
  const large = response(); await fixture.handler()({ user: { role: 'Accounts' }, query: { limit: '10000' } }, large);
  const facet = fixture.observed.at(-1).at(-1).$facet; assert.equal(facet.forms.find(stage => stage.$limit).$limit, 100);
});
for (const query of [{ search: { $ne: '' } }, { status: ['Approved'] }, { startDate: '2026-02-30' },
  { startDate: '2026-03-01', endDate: '2026-02-01' }, { page: '1.5' }, { page: '99999999999', limit: '100' }, { department: 'unknown' }]) {
  test(`invalid dashboard query is rejected before aggregate: ${JSON.stringify(query)}`, async () => {
    const fixture = routerFixture(), res = response(); await fixture.handler()({ user: { role: 'HOD', department: 'IT' }, query }, res);
    assert.equal(res.code, 400); assert.equal(fixture.observed.length, 0);
  });
}
test('HOD cannot request another department or operate without department assignment', async () => {
  for (const req of [{ user: { role: 'HOD', department: 'IT' }, query: { department: 'Civil Engineering' } },
    { user: { role: 'HOD' }, query: {} }]) {
    const fixture = routerFixture(), res = response(); await fixture.handler()(req, res);
    assert.equal(res.code, 403); assert.equal(fixture.observed.length, 0);
  }
});
test('analytics preserves the same filtered scope and unavailable storage returns 503', async () => {
  const fixture = routerFixture(), res = response();
  await fixture.handler('/analytics')({ user: { role: 'HOD', department: 'IT' }, query: { status: 'approved' } }, res);
  assert.equal(res.body.summary.total, 1); assert.equal(res.body.summary.totalAmount, 200);
  const offline = response(); await routerFixture(true).handler()({ user: { role: 'Accounts' }, query: {} }, offline);
  assert.equal(offline.code, 503); assert.match(offline.body.error, /unavailable/);
});

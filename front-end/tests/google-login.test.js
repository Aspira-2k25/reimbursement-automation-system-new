import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { dashboardPath } from '../src/utils/dashboardPath.js';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');

function callback() {
  const source = readFileSync(new URL('../src/Pages/Login/Login.jsx', import.meta.url), 'utf8');
  let expression;
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXAttribute' && node.name.name === 'onSuccess') expression = node.value.expression;
    for (const [key, value] of Object.entries(node)) {
      if (['loc','start','end','extra'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(parse(source, { sourceType: 'module', plugins: ['jsx'] }));
  assert.ok(expression, 'Google success callback must exist');
  return source.slice(expression.start, expression.end);
}
// Run the real callback with a controlled backend promise. Missing window/timers
// intentionally prevent a hard-reload fallback from silently passing.
function handler(loginWithGoogle) {
  const loading = [], errors = [], navigations = [], signInPending = { current: false };
  const fn = vm.runInNewContext(`(${callback()})`, {
    loginWithGoogle, dashboardPath, signInPending,
    setIsLoading: value => loading.push(value), setError: value => errors.push(value),
    navigate: (path, options) => navigations.push({ path, replace: options.replace }),
  });
  return { fn, loading, errors, navigations, signInPending };
}
test('Google approval shows progress immediately, waits for verification, and blocks duplicate callbacks', async () => {
  let resolve, calls = 0;
  const gate = new Promise(done => { resolve = done; });
  const state = handler(async credential => { assert.equal(credential, 'synthetic'); calls++; return gate; });
  const pending = state.fn({ credential: 'synthetic' });
  assert.deepEqual(state.loading, [true]);
  assert.equal(state.navigations.length, 0);
  await state.fn({ credential: 'duplicate' });
  assert.equal(calls, 1);
  resolve({ user: { role: 'Faculty' } }); await pending;
  assert.deepEqual(state.navigations, [{ path: '/dashboard/faculty', replace: true }]);
  assert.deepEqual(state.loading, [true, false]);
  assert.equal(state.signInPending.current, false);
});
for (const role of ['Student','Faculty','Coordinator','HOD','Principal','Accounts','Admin']) {
  test(`verified Google ${role} opens its dashboard without a document reload`, async () => {
    const state = handler(async () => ({ user: { role } }));
    await state.fn({ credential: 'synthetic' });
    assert.deepEqual(state.navigations, [{ path: dashboardPath(role), replace: true }]);
    assert.deepEqual(state.errors, ['']);
  });
}
test('rejected Google verification stays on login and restores retry controls', async () => {
  const state = handler(async () => { throw new Error('Inactive account'); });
  await state.fn({ credential: 'synthetic' });
  assert.equal(state.navigations.length, 0);
  assert.equal(state.errors.at(-1), 'Inactive account');
  assert.equal(state.loading.at(-1), false);
  assert.equal(state.signInPending.current, false);
});

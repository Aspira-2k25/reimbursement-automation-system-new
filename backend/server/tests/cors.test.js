const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const cors = require('cors');
const { csrfTokenHandler } = require('../middleware/csrf');

// Exercise the actual server policy without starting database or email services.
const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const policy = source.slice(source.indexOf('const isProd ='), source.indexOf('// Apply CORS'));

function options(env) {
  return vm.runInNewContext(`${policy}\ncorsOptions;`, {
    process: { env }, URL, console: { warn() {} },
  });
}

test('production CSRF responses and preflight allow the APSIT frontend', async () => {
  const app = express();
  app.use(cors(options({ NODE_ENV: 'production' })));
  app.get('/api/csrf-token', csrfTokenHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/csrf-token`;
    const origin = 'https://reimburse.apsit.edu.in';
    const response = await fetch(url, { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.match(response.headers.get('set-cookie'), /_csrf=/);
    assert.match((await response.json()).csrfToken, /^[a-f0-9]{64}$/);
    const preflight = await fetch(url, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'X-CSRF-Token' },
    });
    assert.equal(preflight.status, 200);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.match(preflight.headers.get('access-control-allow-headers'), /X-CSRF-Token/i);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('production still rejects unrelated origins and allows configured frontends', () => {
  const config = options({ NODE_ENV: 'production', FRONTEND_URL: 'https://example.com',
    FRONTEND_URL_PREVIEW: 'https://preview.example.com' });
  for (const origin of ['https://example.com', 'https://preview.example.com', undefined]) {
    config.origin(origin, (error, allowed) => {
      assert.equal(error, null);
      assert.equal(allowed, true);
    });
  }
  for (const origin of ['https://evil.example', 'https://reimburse.apsit.edu.in.evil.example',
    'http://localhost:5173']) {
    config.origin(origin, error => assert.equal(error.message, 'Not allowed by CORS'));
  }
});

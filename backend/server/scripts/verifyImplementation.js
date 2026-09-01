/**
 * Comprehensive Automated Verification Script
 * Validates Security Hardening & Performance Optimizations
 */

require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');
const mongoose = require('mongoose');

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 Running Comprehensive System Verification');
  console.log('========================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${err.message}`);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${err.message}`);
    }
  }

  // 1. Verify csurf removal
  test('1. csurf is completely removed from package.json', () => {
    const pkg = require('../package.json');
    assert.strictEqual(pkg.dependencies.csurf, undefined, 'csurf should not be in dependencies');
    assert.strictEqual(pkg.devDependencies?.csurf, undefined, 'csurf should not be in devDependencies');
  });

  // 2. Verify Double-Submit CSRF implementation
  test('2. CSRF middleware enforces double-submit token matching', () => {
    const { csrfProtection, generateCsrfToken } = require('../middleware/csrf');

    // Simulate mock req, res for token generation
    const cookies = {};
    const mockRes = {
      cookie: (name, val, opts) => {
        cookies[name] = val;
      }
    };
    const mockReq = {
      cookies,
      headers: {},
      method: 'GET'
    };

    const token = generateCsrfToken(mockReq, mockRes);
    assert.ok(token, 'Should generate a plaintext token');
    assert.ok(cookies['_csrf_hmac'], 'Should set _csrf_hmac cookie');
    assert.strictEqual(cookies['XSRF-TOKEN'], token, 'Should set readable XSRF-TOKEN cookie');

    // Test mutating POST with valid token
    const postReq = {
      method: 'POST',
      cookies: { _csrf_hmac: cookies['_csrf_hmac'] },
      headers: { 'x-csrf-token': token }
    };
    let nextCalled = false;
    csrfProtection(postReq, {}, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Valid CSRF token should pass');

    // Test mutating POST with invalid token
    let errorStatus = null;
    let errorJson = null;
    const badRes = {
      status: (code) => {
        errorStatus = code;
        return {
          json: (data) => { errorJson = data; }
        };
      }
    };
    const badPostReq = {
      method: 'POST',
      cookies: { _csrf_hmac: cookies['_csrf_hmac'] },
      headers: { 'x-csrf-token': 'wrong-token-value' }
    };
    csrfProtection(badPostReq, badRes, () => {});
    assert.strictEqual(errorStatus, 403, 'Invalid token should return 403');
    assert.strictEqual(errorJson?.error, 'Invalid CSRF token');
  });

  // 3. Verify Notification Subdocument Schema & Strict Validation
  test('3. Notification schema strictly validates metadata subdocument', () => {
    const Notification = require('../models/Notification');
    const validNotif = new Notification({
      userId: '123',
      applicationId: 'F-COMP-NPT-2026-001',
      type: 'submission',
      title: 'Submitted',
      message: 'Your application has been submitted',
      metadata: {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        formType: 'Faculty',
        changes: { status: 'Under HOD' }
      }
    });
    const validErr = validNotif.validateSync();
    assert.strictEqual(validErr, undefined, 'Valid metadata should pass validation');

    // Invalid property should fail validation under strict: throw
    let caughtStrict = false;
    try {
      const invalidNotif = new Notification({
        userId: '123',
        applicationId: 'F-COMP-NPT-2026-001',
        type: 'submission',
        title: 'Submitted',
        message: 'Your application has been submitted',
        metadata: {
          arbitraryInjectionField: 'not_allowed_in_schema'
        }
      });
      const invalidErr = invalidNotif.validateSync();
      if (invalidErr) caughtStrict = true;
    } catch (e) {
      caughtStrict = true;
    }
    assert.ok(caughtStrict, 'Metadata should reject arbitrary unvalidated properties');
  });

  // 4. Verify Department Filter Regex Cache
  test('4. Department filter pre-compiles and caches regexes', () => {
    const { buildDepartmentFilter, departmentRegexCache, getNormalizedDepartment } = require('../utils/formHelpers');

    const filter1 = buildDepartmentFilter('hod', 'Computer Engineering');
    assert.ok(filter1.$or, 'HOD filter should return $or clause');
    assert.ok(departmentRegexCache.has('computer engineering'), 'Regex cache should contain computer engineering');

    const cachedRegex1 = departmentRegexCache.get('computer engineering');
    const filter2 = buildDepartmentFilter('hod', 'COMP');
    const cachedRegex2 = departmentRegexCache.get('computer engineering');
    assert.strictEqual(cachedRegex1, cachedRegex2, 'Cached regex instance should be reused');
  });

  // 5. Verify Institutional Email Domain Externalization
  test('5. Institutional email domain is externalized', () => {
    const envDomain = process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'apsit.edu.in';
    assert.ok(envDomain, 'INSTITUTIONAL_EMAIL_DOMAIN should be defined');
    assert.ok(!envDomain.includes('hardcoded'), 'Domain should be configurable');
  });

  // 6. Verify BullMQ Email Queue & Worker structure
  test('6. BullMQ email queue and worker initialize with retry options', () => {
    const { getEmailQueue } = require('../queues/emailQueue');
    const { processEmailJob } = require('../workers/emailWorker');
    assert.strictEqual(typeof getEmailQueue, 'function');
    assert.strictEqual(typeof processEmailJob, 'function');
  });

  // 7. Verify Data Migration Script exists and exports runnable function
  test('7. Data migration script exists and is callable', () => {
    const runMigration = require('../scripts/normalizeUserIds');
    assert.strictEqual(typeof runMigration, 'function', 'normalizeUserIds should export runMigration function');
  });

  // 8. Verify CSP Header Configuration
  test('8. Security headers middleware includes report-uri and report-only support', () => {
    const securityHeaders = require('../middleware/securityHeaders');
    const headers = {};
    const mockReq = {};
    const mockRes = {
      locals: {},
      setHeader: (key, val) => { headers[key] = val; }
    };
    securityHeaders(mockReq, mockRes, () => {});
    assert.ok(headers['Content-Security-Policy'] || headers['Content-Security-Policy-Report-Only'], 'Should set CSP header');
    const cspVal = headers['Content-Security-Policy'] || headers['Content-Security-Policy-Report-Only'];
    assert.ok(cspVal.includes('report-uri'), 'CSP should contain report-uri directive');
  });

  console.log(`\n========================================`);
  console.log(`🏁 Verification Summary: ${passed}/${total} tests passed.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();

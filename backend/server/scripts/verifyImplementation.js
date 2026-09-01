/**
 * verifyImplementation.js
 * Verification script checking that all security hardening and performance requirements are fulfilled.
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
  }
}

async function runVerification() {
  console.log('=== Running Security Hardening Verification ===\n');

  const serverDir = path.join(__dirname, '..');

  // 1. Check csurf removal
  const packageJson = JSON.parse(fs.readFileSync(path.join(serverDir, 'package.json'), 'utf8'));
  assert(!packageJson.dependencies.csurf, 'package.json does NOT contain csurf');
  assert(Boolean(packageJson.dependencies.bullmq), 'package.json contains bullmq');
  assert(Boolean(packageJson.dependencies.ioredis), 'package.json contains ioredis');

  // 2. Check csrf.js implementation
  const csrfCode = fs.readFileSync(path.join(serverDir, 'middleware', 'csrf.js'), 'utf8');
  assert(!csrfCode.includes("require('csurf')"), 'csrf.js does NOT import csurf');
  assert(csrfCode.includes('crypto.timingSafeEqual'), 'csrf.js uses crypto.timingSafeEqual for timing safety');
  assert(csrfCode.includes('csrfTokenHandler'), 'csrf.js exports csrfTokenHandler');

  // 3. Check prisma schema
  const schemaCode = fs.readFileSync(path.join(serverDir, 'prisma', 'schema.prisma'), 'utf8');
  assert(schemaCode.includes('failed_login_attempts'), 'schema.prisma includes failed_login_attempts');
  assert(schemaCode.includes('locked_until'), 'schema.prisma includes locked_until');
  assert(schemaCode.includes('model RefreshToken'), 'schema.prisma defines RefreshToken model');

  // 4. Check validation.js lockout logic
  const validationCode = fs.readFileSync(path.join(serverDir, 'middleware', 'validation.js'), 'utf8');
  assert(validationCode.includes('locked_until'), 'validation.js checks locked_until');
  assert(validationCode.includes('failed_login_attempts'), 'validation.js updates failed_login_attempts');

  // 5. Check authController.js refresh token and email domain
  const authCode = fs.readFileSync(path.join(serverDir, 'controllers', 'authController.js'), 'utf8');
  assert(authCode.includes('refreshToken'), 'authController exports refreshToken');
  assert(authCode.includes('issueRefreshToken'), 'authController has issueRefreshToken function');
  assert(authCode.includes('INSTITUTIONAL_EMAIL_DOMAIN'), 'authController uses dynamic INSTITUTIONAL_EMAIL_DOMAIN');

  // 6. Check formRoutes.js and StudentFormRoutes.js projections
  const formRoutesCode = fs.readFileSync(path.join(serverDir, 'routes', 'formRoutes.js'), 'utf8');
  assert(formRoutesCode.includes(".select('-documents')"), 'formRoutes.js uses field projections to exclude documents in lists');
  assert(!formRoutesCode.includes('$or: [\n        { userId: userIdStr }'), 'formRoutes.js /mine does NOT use redundant $or userId queries');

  const studentFormRoutesCode = fs.readFileSync(path.join(serverDir, 'routes', 'StudentFormRoutes.js'), 'utf8');
  assert(studentFormRoutesCode.includes(".select('-documents')"), 'StudentFormRoutes.js uses field projections to exclude documents in lists');

  // 7. Check Notification model & queue integration
  const notifModelCode = fs.readFileSync(path.join(serverDir, 'models', 'Notification.js'), 'utf8');
  assert(notifModelCode.includes("'reimbursed'"), 'Notification model type enum includes reimbursed');

  const notifServiceCode = fs.readFileSync(path.join(serverDir, 'utils', 'notificationService.js'), 'utf8');
  assert(notifServiceCode.includes('addEmailJob'), 'notificationService integrates addEmailJob');

  console.log(`\n=== Summary: ${passCount} Passed, ${failCount} Failed ===`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runVerification();

/**
 * Double-Submit Cookie CSRF Protection Middleware
 * 
 * Replaces unmaintained `csurf` with a stateless, cryptographic double-submit cookie pattern:
 * 1. An HMAC hash of a random token is stored in a secure, httpOnly cookie `_csrf_hmac`.
 * 2. The client fetches the plaintext token via GET /api/csrf-token (or XSRF-TOKEN cookie).
 * 3. On mutating requests (POST, PUT, PATCH, DELETE), the client supplies the token in the `X-CSRF-Token` header.
 * 4. The server computes the HMAC of the received header token using the secret and timing-safely compares it against the cookie.
 */

const crypto = require('crypto');

const isProd = process.env.NODE_ENV === 'production';
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'csrf-protection-secret-fallback-key-32chars';
const COOKIE_NAME = '_csrf_hmac';

/**
 * Generate HMAC digest of token
 */
function createTokenHash(token) {
  return crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('hex');
}

/**
 * Cookie options for the httpOnly hash cookie
 */
function getCsrfCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  };
}

/**
 * Generate a new random token, set the hash cookie, and return plaintext token
 */
function generateCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = createTokenHash(token);

  res.cookie(COOKIE_NAME, hash, getCsrfCookieOptions());

  // Also set non-httpOnly readable cookie for clients that support standard XSRF-TOKEN reading
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
  });

  return token;
}

/**
 * Express middleware for verifying CSRF tokens on mutating requests
 */
function csrfProtection(req, res, next) {
  // Attach helper to request/response for generating new tokens
  req.csrfToken = () => generateCsrfToken(req, res);

  // Safe HTTP methods do not mutate state — skip verification
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method.toUpperCase())) {
    return next();
  }

  // Exempt specific endpoints if needed (e.g. CSP report endpoint)
  if (req.path === '/api/csp-report' || req.originalUrl?.includes('/api/csp-report')) {
    return next();
  }

  const cookieHash = req.cookies?.[COOKIE_NAME];
  const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];

  if (!cookieHash || !headerToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'Form submission failed security validation. Please refresh the page and try again.',
      code: 'EBADCSRFTOKEN'
    });
  }

  try {
    const computedHash = createTokenHash(headerToken);

    // Constant-time buffer comparison to prevent timing attacks
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(cookieHash, 'hex');

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({
        error: 'Invalid CSRF token',
        message: 'Form submission failed security validation. Please refresh the page and try again.',
        code: 'EBADCSRFTOKEN'
      });
    }

    next();
  } catch (err) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'Form submission failed security validation. Please refresh the page and try again.',
      code: 'EBADCSRFTOKEN'
    });
  }
}

module.exports = {
  csrfProtection,
  generateCsrfToken
};

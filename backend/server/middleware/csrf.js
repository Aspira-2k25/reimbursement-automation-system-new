/**
 * Custom Double-Submit Cookie CSRF Protection
 * Replaces the deprecated `csurf` package with a stateless HMAC-based approach.
 *
 * How it works:
 * 1. GET /api/csrf-token → generates a random token, stores HMAC(token) in httpOnly cookie, returns plaintext token
 * 2. Client sends the plaintext token in X-CSRF-Token header on mutating requests
 * 3. Middleware recomputes HMAC(header-token) and compares to cookie using timing-safe comparison
 */
const crypto = require('crypto');

const isProd = process.env.NODE_ENV === 'production';
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'csrf-protection-secret-fallback-key-32chars';
const CSRF_TOKEN_BYTES = 32;
const COOKIE_NAME = '_csrf';
const HEADER_NAME = 'x-csrf-token';

// Safe HTTP methods that don't require CSRF validation
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Routes exempt from CSRF checks (webhooks, CSP reports, etc.)
const EXEMPT_PATHS = new Set(['/api/csp-report']);

/**
 * Compute HMAC-SHA256 of a token using the server secret
 */
function computeHmac(token) {
  return crypto.createHmac('sha256', CSRF_SECRET).update(token).digest('hex');
}

/**
 * Cookie options for the CSRF cookie
 */
function getCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  };
}

/**
 * Generate a new CSRF token and set the corresponding HMAC cookie.
 * Returns the plaintext token to send to the client.
 */
function generateToken(res) {
  const token = crypto.randomBytes(CSRF_TOKEN_BYTES).toString('hex');
  const hmac = computeHmac(token);
  res.cookie(COOKIE_NAME, hmac, getCookieOptions());
  return token;
}

/**
 * CSRF protection middleware.
 * - Skips safe methods (GET, HEAD, OPTIONS)
 * - Skips exempt paths (webhooks, CSP reports)
 * - Validates X-CSRF-Token header against _csrf cookie HMAC
 */
function csrfProtection(req, res, next) {
  // Skip safe methods
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Skip exempt paths
  if (EXEMPT_PATHS.has(req.path)) {
    return next();
  }

  const cookieHmac = req.cookies?.[COOKIE_NAME];
  const headerToken = req.headers?.[HEADER_NAME] || req.body?._csrf;

  if (!cookieHmac || !headerToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'Missing CSRF token. Please refresh the page and try again.',
    });
  }

  // Recompute HMAC from the header token and compare with cookie
  const expectedHmac = computeHmac(headerToken);

  // Use timing-safe comparison to prevent timing attacks
  try {
    const cookieBuf = Buffer.from(cookieHmac, 'hex');
    const expectedBuf = Buffer.from(expectedHmac, 'hex');

    if (cookieBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(cookieBuf, expectedBuf)) {
      return res.status(403).json({
        error: 'Invalid CSRF token',
        message: 'Form submission failed security validation. Please refresh the page and try again.',
      });
    }
  } catch (err) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'Form submission failed security validation. Please refresh the page and try again.',
    });
  }

  next();
}

/**
 * Express handler for GET /api/csrf-token
 * Generates a new token pair and returns the plaintext token to the client.
 */
function csrfTokenHandler(req, res) {
  const token = generateToken(res);
  res.json({ csrfToken: token });
}

module.exports = { csrfProtection, csrfTokenHandler, generateToken };

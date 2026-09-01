/**
 * Custom Security Headers Middleware
 * Sets HTTP security headers to protect against common attacks
 * No external dependencies required
 */

const crypto = require('crypto');

const securityHeaders = (req, res, next) => {
    // Generate nonce for this request
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.nonce = nonce;

    // Prevent clickjacking - disallow embedding in iframes
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter in browsers (legacy, CSP is primary defense)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Control referrer information sent with requests
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Restrict permissions/features the browser can use
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Content Security Policy with nonce-based script execution and reporting
    const reportUri = process.env.CSP_REPORT_URI || '/api/csp-report';
    const isReportOnly = process.env.CSP_REPORT_ONLY === 'true';

    const cspDirectives = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://apis.google.com`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://*.vercel.app http://localhost:*",
        "frame-src https://accounts.google.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
        `report-uri ${reportUri}`
    ].join('; ');

    // Use Report-Only or Enforced CSP header based on environment config
    const cspHeaderName = isReportOnly
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy';

    res.setHeader(cspHeaderName, cspDirectives);

    // Additional security headers
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Force HTTPS in production (Strict Transport Security)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
};

module.exports = securityHeaders;

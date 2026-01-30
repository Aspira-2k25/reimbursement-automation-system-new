/**
 * Custom Security Headers Middleware
 * Sets HTTP security headers to protect against common attacks
 * No external dependencies required
 */

const securityHeaders = (req, res, next) => {
    // Prevent clickjacking - disallow embedding in iframes
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter in browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Control referrer information sent with requests
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Restrict permissions/features the browser can use
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Content Security Policy - allows your app to work while blocking common attacks
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://*.vercel.app http://localhost:*",
        "frame-src https://accounts.google.com",
        "object-src 'none'",
        "base-uri 'self'"
    ].join('; '));

    // Force HTTPS in production (Strict Transport Security)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
};

module.exports = securityHeaders;

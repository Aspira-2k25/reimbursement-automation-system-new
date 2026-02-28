const csrf = require('csurf');

// Centralized CSRF protection middleware.
// Uses a cookie-based secret; the client must send the token in a header/body.
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
});

module.exports = { csrfProtection };


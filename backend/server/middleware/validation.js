const validationMiddleware = {
  // Validate login input
  validateLogin: (req, res, next) => {
    const { username, password } = req.body;

    const errors = [];

    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
    }

    if (!password || password.trim().length === 0) {
      errors.push('Password is required');
    }

    if (password && password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Sanitize inputs
    req.body.username = username.trim();
    req.body.password = password.trim();

    next();
  },

  // Validate registration input (staff schema)
  validateRegister: (req, res, next) => {
    const { username, name, password, email } = req.body;

    const errors = [];

    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
    }

    if (!name || name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!password || password.trim().length === 0) {
      errors.push('Password is required');
    }

    if (password && password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (email && !isValidEmail(email)) {
      errors.push('Invalid email format');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Sanitize inputs
    req.body.username = username.trim();
    req.body.name = name.trim();
    req.body.password = password.trim();
    if (email) req.body.email = email.trim();

    next();
  },

  // Email validation helper
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};

// Helper function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = validationMiddleware;
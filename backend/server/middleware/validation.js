const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const validationMiddleware = {
  // Validate login input with strict database checks
  validateLogin: async (req, res, next) => {
    try {
      const { username, email, password } = req.body;

      const errors = [];

      // 1. Basic format validation
      if (!username || username.trim().length === 0) {
        errors.push('Username is required');
      }

      if (!email || email.trim().length === 0) {
        errors.push('Email is required');
      }

      if (!password || password.trim().length === 0) {
        errors.push('Password is required');
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }

      // 2. Database checks using Prisma
      // Find user by username
      const user = await prisma.staff.findUnique({
        where: { username: username.trim() },
        select: {
          id: true,
          username: true,
          name: true,
          department: true,
          role: true,
          email: true,
          password: true,
          is_active: true
        }
      });

      // Generic error for security
      const invalidCredentialsError = {
        error: 'Validation failed',
        details: ['Invalid credentials']
      };

      if (!user) {
        return res.status(401).json(invalidCredentialsError);
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      // Strict Check: Verify email matches exactly
      if (!user.email || user.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(401).json(invalidCredentialsError);
      }

      // Compare provided password with stored hash
      // Security: Only accept bcrypt hashed passwords
      if (!user.password || (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$'))) {
        console.error('Invalid password format in database for user:', user.username);
        return res.status(401).json(invalidCredentialsError);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json(invalidCredentialsError);
      }

      // authentication successful - attach user to request for controller
      req.user = user;

      // Sanitize inputs for consistency (optional, as we already have the user obj)
      req.body.username = username.trim();
      req.body.email = email.trim().toLowerCase();

      next();

    } catch (error) {
      console.error('Validation error:', error);
      return res.status(500).json({ error: 'Internal validation error' });
    }
  },

  // Validate registration input (staff schema)
  validateRegister: (req, res, next) => {
    const { username, name, password, email, role, department } = req.body;

    const errors = [];

    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
    } else if (username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
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

    // Validate role if provided
    if (role && !['Faculty', 'HOD', 'coordinator', 'Principal', 'Student','Accounts'].includes(role)) {
      errors.push('Invalid role. Must be one of: Faculty, HOD, coordinator, Principal, Student, Accounts');
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
    if (email) req.body.email = email.trim().toLowerCase();
    if (department) req.body.department = department.trim();
    if (role) req.body.role = role.trim();

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
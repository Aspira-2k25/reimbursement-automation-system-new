const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');

const isProd = process.env.NODE_ENV === 'production';
const isBcryptHash = (value) => typeof value === 'string' && /^\$2[aby]\$/.test(value);

// Account lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const validationMiddleware = {
  // Validate login input with strict database checks and account lockout
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
      // Find user by username (include lockout fields)
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
          is_active: true,
          failed_login_attempts: true,
          locked_until: true
        }
      });

      // Generic error for security (prevents user enumeration)
      const invalidCredentialsError = {
        error: 'Validation failed',
        details: ['Invalid credentials']
      };

      if (!user) {
        logFailedLogin(req, 'User not found', username);
        return res.status(401).json(invalidCredentialsError);
      }

      // Check if user is active
      if (!user.is_active) {
        logFailedLogin(req, 'Account deactivated', user.username);
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      // ── Account Lockout Check ──
      // If locked_until is set and still in the future, reject immediately
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingMs = new Date(user.locked_until).getTime() - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        return res.status(401).json({
          error: 'Validation failed',
          details: [`Account is temporarily locked. Try again in ${remainingMin} minute(s).`]
        });
      }

      // Strict Check: Verify email matches exactly
      if (!user.email || user.email.toLowerCase() !== email.toLowerCase()) {
        // Increment failed attempts for email mismatch
        await incrementFailedAttempts(user.id, user.failed_login_attempts);
        return res.status(401).json(invalidCredentialsError);
      }

      // Compare provided password with stored hash
      // Security: Only accept bcrypt hashed passwords in production
      // For development: also allow plain text passwords
      let isPasswordValid = false;
      if (isBcryptHash(user.password)) {
        // Bcrypt hashed password
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else if (!isProd) {
        // Allow plain-text only in non-production for legacy local/dev accounts
        isPasswordValid = (password === user.password);
        console.warn(`⚠️ Plain text password used for user: ${user.username}. Hash passwords before production.`);
      } else {
        // In production, never accept non-hashed passwords
        console.error(`Blocked non-hashed password login for user: ${user.username}`);
      }

      if (!isPasswordValid) {
        // ── Failed Login: increment counter and possibly lock ──
        await incrementFailedAttempts(user.id, user.failed_login_attempts);
        return res.status(401).json(invalidCredentialsError);
      }

      // ── Successful Login: reset lockout counters ──
      if (user.failed_login_attempts > 0 || user.locked_until) {
        await prisma.staff.update({
          where: { id: user.id },
          data: {
            failed_login_attempts: 0,
            locked_until: null
          }
        });
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

    if (!password || password.length === 0) {
      errors.push('Password is required');
    }

    if (password && password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (password && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (password && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    if (password && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (email && !isValidEmail(email)) {
      errors.push('Invalid email format');
    }

    // Validate role if provided
    if (role && !['Faculty', 'HOD', 'coordinator', 'Principal', 'Student', 'Accounts'].includes(role)) {
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
    // Password is NOT trimmed — preserve exactly as entered
    if (email) req.body.email = email.trim().toLowerCase();
    if (department) req.body.department = department.trim();
    if (role) req.body.role = role.trim();

    next();
  },
};

/**
 * Increment failed login attempts and lock the account if threshold is reached.
 */
async function incrementFailedAttempts(userId, currentAttempts) {
  const newAttempts = (currentAttempts || 0) + 1;
  const updateData = { failed_login_attempts: newAttempts };

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS);
    console.warn(`⚠️ Account locked for user ID ${userId} after ${newAttempts} failed attempts.`);
  }

  await prisma.staff.update({
    where: { id: userId },
    data: updateData
  });
}

// Helper function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = validationMiddleware;
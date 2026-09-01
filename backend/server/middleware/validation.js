const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');

const isProd = process.env.NODE_ENV === 'production';
const isBcryptHash = (value) => typeof value === 'string' && /^\$2[aby]\$/.test(value);

/**
 * Helper: log a failed login attempt to MongoDB (fire-and-forget).
 * Never throws or blocks the response.
 */
function logFailedLogin(req, reason, username) {
  logger.logActivity({
    action: 'login_failed',
    message: `Login failed: ${reason}`,
    userId: null,
    userName: username || 'Unknown',
    role: null,
    department: null,
    level: 'WARN',
    status: 'failure',
    details: { reason },
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
    method: req.method,
    endpoint: req.originalUrl || req.path
  });
}

const validationMiddleware = {
  // Validate login input with strict database checks & failed-login lockout
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

      // Generic error for security (does not reveal whether user exists, email matches, or account is locked)
      const genericAuthError = {
        error: 'Invalid credentials or account locked'
      };

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
          is_active: true,
          failed_login_attempts: true,
          locked_until: true
        }
      });

      if (!user) {
        logFailedLogin(req, 'User not found', username);
        return res.status(401).json(genericAuthError);
      }

      // Check if account is currently locked out
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        logFailedLogin(req, 'Account locked out', user.username);
        return res.status(401).json(genericAuthError);
      }

      // Check if user is active
      if (!user.is_active) {
        logFailedLogin(req, 'Account deactivated', user.username);
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      // Strict Check: Verify email matches exactly
      const emailMatches = user.email && user.email.toLowerCase() === email.toLowerCase().trim();

      // Helper function to handle failed authentication attempts and record lockout
      const handleFailedAuth = async (reason) => {
        const nextAttempts = (user.failed_login_attempts || 0) + 1;
        const updateData = { failed_login_attempts: nextAttempts };

        if (nextAttempts >= 5) {
          // Lock account for 15 minutes
          updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000);
        }

        try {
          await prisma.staff.update({
            where: { id: user.id },
            data: updateData
          });
        } catch (dbErr) {
          console.error('Failed to update login attempts:', dbErr);
        }

        logFailedLogin(req, reason, user.username);
        return res.status(401).json(genericAuthError);
      };

      if (!emailMatches) {
        return await handleFailedAuth('Email mismatch');
      }

      // Compare provided password with stored hash
      let isPasswordValid = false;
      if (isBcryptHash(user.password)) {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else if (!isProd) {
        // Allow plain-text only in non-production for legacy local/dev accounts
        isPasswordValid = (password === user.password);
        console.warn(`⚠️ Plain text password used for user: ${user.username}. Hash passwords before production.`);
      } else {
        console.error(`Blocked non-hashed password login for user: ${user.username}`);
      }

      if (!isPasswordValid) {
        return await handleFailedAuth('Invalid password');
      }

      // Authentication successful - attach user to request for controller
      req.user = user;

      // Sanitize inputs for consistency
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

// Helper function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = validationMiddleware;
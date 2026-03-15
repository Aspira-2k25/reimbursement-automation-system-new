const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const dbUtils = require('../utils/database');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { addToBlacklist } = require('../utils/tokenBlacklist');
const { getNormalizedDepartment } = require('../utils/formHelpers');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isProd = process.env.NODE_ENV === 'production';

const buildAuthCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: maxAgeMs,
  path: '/'
});

const authController = {
  // Login function
  login: async (req, res, next) => {
    try {
      // User is already authenticated and attached by validationMiddleware
      const user = req.user;

      if (!user) {
        // Should not happen if middleware works correctly
        return res.status(500).json({ error: 'Authentication failed internally' });
      }

      // Update last login time
      await dbUtils.updateLastLogin(user.id);

      // Generate JWT token with short expiry
      const token = jwt.sign(
        { userId: user.id, username: user.username, name: user.name, role: user.role, email: user.email, department: user.department },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Set httpOnly cookie for security (centralized options)
      res.cookie('auth_token', token, buildAuthCookieOptions(15 * 60 * 1000)); // 15 minutes

      // Log the login activity
      logger.info('User logged in', {
        user: user.name || user.username || user.email || 'Unknown',
        role: user.role,
        department: user.department || ''
      });

      // Return user data (without sensitive information or token)
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          department: user.department,
          role: user.role,
          email: user.email
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Google login - verify credential and map to role via DB
  googleLogin: async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: 'Missing Google credential' });
      }

      // Verify the Google ID token using official library with audience check
      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID, // Verify token is for our app
        });
      } catch (verifyError) {
        console.error('Google token verification failed:', verifyError);
        return res.status(401).json({ error: 'Invalid Google token' });
      }

      const payload = ticket.getPayload();
      const email = payload?.email;
      const name = payload?.name || 'Google User';
      const emailVerified = payload?.email_verified;

      if (!email) {
        return res.status(400).json({ error: 'Google token missing email' });
      }

      // Verify email is confirmed by Google
      if (!emailVerified) {
        return res.status(400).json({ error: 'Email not verified by Google' });
      }

      // Validate email domain - only allow apsit.edu.in domain
      const allowedDomain = 'apsit.edu.in';
      if (!email.toLowerCase().endsWith(`@${allowedDomain}`)) {
        return res.status(403).json({
          error: 'Please sign in with your institutional email.'
        });
      }

      // Look up staff by email to determine role; default to Student
      const staff = await dbUtils.getStaffByEmail(email);
      const role = staff?.role || 'Student';
      // Use staff ID if found, otherwise use email as userId for Google users
      const userId = staff?.id || email;

      const token = jwt.sign(
        { userId, email, role, name, department: staff?.department || null },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Set httpOnly cookie for security (consistent with regular login)
      res.cookie('auth_token', token, buildAuthCookieOptions(15 * 60 * 1000)); // 15 minutes

      // Log the Google login activity
      logger.info('User logged in via Google', {
        user: staff?.name || name || email,
        role: role,
        department: staff?.department || ''
      });

      return res.json({ user: { id: userId, email, name, role, department: staff?.department || null } });
    } catch (error) {
      console.error('Google login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Register function - Create new user via API (Postman)
  register: async (req, res) => {
    try {
      const { username, name, department, role, email, password, employee_id } = req.body;

      // Basic validation
      if (!username || !name || !password) {
        return res.status(400).json({
          error: 'Username, name, and password are required'
        });
      }

      // Validate email format if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format'
        });
      }

      // Check if user already exists by username
      const existingUserByUsername = await prisma.staff.findUnique({
        where: { username: username }
      });
      if (existingUserByUsername) {
        return res.status(409).json({
          error: 'User with this username already exists'
        });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingUserByEmail = await prisma.staff.findUnique({
          where: { email: email }
        });
        if (existingUserByEmail) {
          return res.status(409).json({
            error: 'User with this email already exists'
          });
        }
      }

      // Hash password before storing
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user using Prisma
      const newUser = await prisma.staff.create({
        data: {
          username: username.trim(),
          name: name.trim(),
          password: hashedPassword, // Store hashed password, not plain text
          email: email ? email.trim() : null,
          department: department ? getNormalizedDepartment(department) : null,
          role: role || 'Faculty',
          employee_id: employee_id || null,
          is_active: true,
        },
        select: {
          id: true,
          username: true,
          name: true,
          department: true,
          role: true,
          email: true,
          employee_id: true,
          is_active: true,
          created_at: true,
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username, role: newUser.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Set httpOnly cookie (consistent with login)
      res.cookie('auth_token', token, buildAuthCookieOptions(24 * 60 * 60 * 1000)); // 24 hours

      res.status(201).json({
        message: 'User created successfully',
        // Token NOT in response body - only in httpOnly cookie
        user: newUser
      });

    } catch (error) {
      console.error('Register error:', error);

      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        return res.status(409).json({
          error: `User with this ${field} already exists`
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const userId = req.user?.userId; // From JWT middleware

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await dbUtils.getStaffProfile(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });

    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update user profile (limited fields)
  updateProfile: async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { name, department, email } = req.body || {};

      // Basic validation
      if (email !== undefined && email !== null) {
        const emailStr = String(email).trim();
        if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
          return res.status(400).json({ error: 'Invalid email address' });
        }
      }

      const updated = await dbUtils.updateStaffProfile(userId, {
        name,
        department: department ? getNormalizedDepartment(department) : undefined,
        email
      });

      if (!updated) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      return res.json({ message: 'Profile updated', user: updated });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Logout function — blacklist the token so it can't be reused
  logout: async (req, res) => {
    try {
      // Extract the raw token from the Authorization header or httpOnly cookie
      const authHeader = req.headers.authorization;
      const token = (authHeader && authHeader.split(' ')[1]) || (req.cookies && req.cookies.auth_token);

      if (token) {
        // Decode to find expiry so we only store until it naturally expires
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          const remainingTTL = decoded.exp - Math.floor(Date.now() / 1000);
          if (remainingTTL > 0) {
            await addToBlacklist(token, remainingTTL);
          }
        }
      }

      // Clear the httpOnly cookie as well (same options as when setting)
      const clearOpts = buildAuthCookieOptions(0);
      res.clearCookie('auth_token', clearOpts);

      // Log the logout activity if we could decode the token
      if (token) {
        try {
          const decoded = jwt.decode(token);
          if (decoded && decoded.userId) {
            logger.info('User logged out', {
              user: decoded.name || decoded.username || decoded.email || 'Unknown',
              role: decoded.role || 'Unknown',
              department: decoded.department || ''
            });
          }
        } catch (e) {
          // ignore parsing errors
        }
      }


      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// List all staff (used by non-admin endpoints)
authController.getAllStaff = async (req, res) => {
  try {
    const staff = await dbUtils.getAllStaff();
    res.json({ staff });
  } catch (error) {
    console.error('getAllStaff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List staff by department
authController.getStaffByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const staff = await dbUtils.getStaffByDepartment(department);
    res.json({ staff });
  } catch (error) {
    console.error('getStaffByDepartment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user endpoint (for admin/user creation via Postman)
// Similar to register but doesn't auto-login the user
authController.createUser = async (req, res) => {
  try {
    const { username, name, department, role, email, password, employee_id } = req.body;

    // Basic validation
    if (!username || !name || !password) {
      return res.status(400).json({
        error: 'Username, name, and password are required'
      });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Check if user already exists by username
    const existingUserByUsername = await prisma.staff.findUnique({
      where: { username: username }
    });
    if (existingUserByUsername) {
      return res.status(409).json({
        error: 'User with this username already exists'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingUserByEmail = await prisma.staff.findUnique({
        where: { email: email }
      });
      if (existingUserByEmail) {
        return res.status(409).json({
          error: 'User with this email already exists'
        });
      }
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user using Prisma
    const newUser = await prisma.staff.create({
      data: {
        username: username.trim(),
        name: name.trim(),
        password: hashedPassword,
        email: email ? email.trim() : null,
        department: department ? getNormalizedDepartment(department) : null,
        role: role || 'Faculty',
        employee_id: employee_id || null,
        is_active: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        department: true,
        role: true,
        email: true,
        employee_id: true,
        is_active: true,
        created_at: true,
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Create user error:', error);

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(409).json({
        error: `User with this ${field} already exists`
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
};

// ==================== ADMIN STAFF MANAGEMENT ====================

// Get all staff members (admin only) — supports optional pagination
authController.getFacultyList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    // If pagination params are provided, use paginated query
    if (page > 0 && limit > 0) {
      const safePage = Math.max(1, page);
      const safeLimit = Math.min(Math.max(1, limit), 100); // cap at 100
      const offset = (safePage - 1) * safeLimit;

      const staff = await prisma.staff.findMany({
        skip: offset,
        take: safeLimit,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          username: true,
          name: true,
          department: true,
          role: true,
          email: true,
          employee_id: true,
          is_active: true,
          created_at: true,
          last_login: true,
        },
      });
      const total = await prisma.staff.count();

      return res.json({
        staff,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit),
        },
      });
    }

    // Default: return all (backward compatible)
    const staff = await dbUtils.getAllStaff();
    res.json({ staff });
  } catch (error) {
    console.error('getFacultyList error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single staff member by ID
authController.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Staff ID required' });

    const staff = await dbUtils.getStaffById(id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json({ staff });
  } catch (error) {
    console.error('getStaffById error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update staff member by ID (admin action)
authController.updateStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, department, role, email, employee_id, is_active, password } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Staff ID required' });
    }

    // Basic validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedUsername = typeof username === 'string' ? username.toLowerCase().trim() : undefined;
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : undefined;
    const staffId = parseInt(id);

    // Check if username/email conflict with another record
    if (normalizedUsername) {
      const existing = await prisma.staff.findFirst({
        where: {
          username: normalizedUsername,
          is_active: true,
          NOT: { id: staffId }
        }
      });
      if (existing) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }
    if (normalizedEmail) {
      const existing = await prisma.staff.findFirst({
        where: {
          email: normalizedEmail,
          is_active: true,
          NOT: { id: staffId }
        }
      });
      if (existing) {
        return res.status(409).json({ error: 'Email already taken' });
      }
    }

    const updates = {
      username: normalizedUsername,
      name,
      department: department ? getNormalizedDepartment(department) : undefined,
      role,
      email: normalizedEmail,
      employee_id,
      is_active
    };
    if (password) {
      updates.password = password;
    }

    const updated = await dbUtils.updateStaffById(id, updates);
    if (!updated) {
      return res.status(400).json({ error: 'No fields to update or staff not found' });
    }
    logger.info(`Staff record updated by Admin`, { 
      id, 
      updates: { ...updates, password: updates.password ? '[HIDDEN]' : undefined },
      user: req.user?.username || 'Admin',
      role: 'Admin'
    });
    res.json({ message: 'Staff updated successfully', staff: updated });
  } catch (error) {
    console.error('updateStaffById error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new faculty member (admin action)
authController.createFaculty = async (req, res) => {
  try {
    const { username, name, department, role, email, password, employee_id } = req.body;

    // Basic validation
    if (!username || !name || !password) {
      return res.status(400).json({
        error: 'Username, name, and password are required'
      });
    }

    // Validate email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    // Check if username is used by an active account.
    const existingActiveByUsername = await prisma.staff.findFirst({
      where: { username: normalizedUsername, is_active: true }
    });
    if (existingActiveByUsername) {
      return res.status(409).json({
        error: 'User with this username already exists'
      });
    }

    // Check if email is used by an active account.
    if (normalizedEmail) {
      const existingActiveByEmail = await prisma.staff.findFirst({
        where: { email: normalizedEmail, is_active: true }
      });
      if (existingActiveByEmail) {
        return res.status(409).json({
          error: 'User with this email already exists'
        });
      }
    }

    // Reuse an inactive record if username or email match a deactivated account.
    const inactiveByUsername = await prisma.staff.findFirst({
      where: { username: normalizedUsername, is_active: false }
    });
    const inactiveByEmail = normalizedEmail
      ? await prisma.staff.findFirst({
        where: { email: normalizedEmail, is_active: false }
      })
      : null;

    if (inactiveByUsername && inactiveByEmail && inactiveByUsername.id !== inactiveByEmail.id) {
      return res.status(409).json({
        error: 'Username and email belong to different inactive accounts. Use one identity and retry.'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const reactivationTarget = inactiveByUsername || inactiveByEmail;

    if (reactivationTarget) {
      const reactivatedStaff = await prisma.staff.update({
        where: { id: reactivationTarget.id },
        data: {
          username: normalizedUsername,
          name: name.trim(),
          password: hashedPassword,
          email: normalizedEmail,
          department: department ? getNormalizedDepartment(department) : null,
          role: role || 'Faculty',
          employee_id: employee_id || null,
          is_active: true,
        },
        select: {
          id: true,
          username: true,
          name: true,
          department: true,
          role: true,
          email: true,
          employee_id: true,
          is_active: true,
          created_at: true,
        }
      });

      logger.info('Inactive staff reactivated by Admin', {
        id: reactivatedStaff.id,
        username: reactivatedStaff.username,
        user: req.user?.username || 'Admin',
        role: 'Admin'
      });

      return res.status(201).json({
        message: 'Staff member reactivated successfully',
        staff: reactivatedStaff
      });
    }

    // Create new faculty
    const newFaculty = await prisma.staff.create({
      data: {
        username: normalizedUsername,
        name: name.trim(),
        password: hashedPassword,
        email: normalizedEmail,
        department: department ? getNormalizedDepartment(department) : null,
        role: role || 'Faculty',
        employee_id: employee_id || null,
        is_active: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        department: true,
        role: true,
        email: true,
        employee_id: true,
        is_active: true,
        created_at: true,
      }
    });

    logger.info(`New staff created by Admin`, { 
      id: newFaculty.id, 
      username: newFaculty.username,
      user: req.user?.username || 'Admin',
      role: 'Admin' 
    });
    res.status(201).json({
      message: 'Faculty member created successfully',
      staff: newFaculty
    });

  } catch (error) {
    console.error('createFaculty error:', error);

    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(409).json({
        error: `User with this ${field} already exists`
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete faculty member by ID (soft delete)
authController.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Staff ID required' });
    }

    // Soft delete - mark as inactive so history is preserved.
    const updated = await dbUtils.updateStaffById(id, { is_active: false });
    if (!updated) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    logger.info(`Staff deleted by Admin`, { 
      id,
      user: req.user?.username || 'Admin',
      role: 'Admin' 
    });

    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('deleteFaculty error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = authController;
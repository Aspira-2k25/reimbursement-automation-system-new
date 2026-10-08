const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const dbUtils = require('../utils/database');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { addToBlacklist } = require('../utils/tokenBlacklist');
const { getNormalizedDepartment } = require('../utils/formHelpers');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isProd = process.env.NODE_ENV === 'production';

// Externalized institutional email domain
const INSTITUTIONAL_EMAIL_DOMAIN = process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'apsit.edu.in';

// Refresh token configuration
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_BYTES = 64;

const buildAuthCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: maxAgeMs,
  path: '/'
});

/**
 * Generate an opaque refresh token, hash it, and store in DB.
 * Returns the plaintext token (to be set as a cookie).
 */
async function issueRefreshToken(userId, familyId = null) {
  const rawToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const family = familyId || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: String(userId),
      familyId: family,
      expiresAt,
    }
  });

  return { rawToken, familyId: family, expiresAt };
}

/**
 * Set both auth_token and refresh_token cookies on the response.
 */
function setAuthCookies(res, accessToken, refreshToken, refreshExpiresAt) {
  res.cookie('auth_token', accessToken, buildAuthCookieOptions(15 * 60 * 1000)); // 15 minutes
  const refreshMaxAge = refreshExpiresAt.getTime() - Date.now();
  res.cookie('refresh_token', refreshToken, buildAuthCookieOptions(refreshMaxAge));
}

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

      // Update last login time (fire-and-forget — don't block the response)
      dbUtils.updateLastLogin(user.id).catch(err => console.error('updateLastLogin failed:', err));

      // Generate JWT token with short expiry
      const token = jwt.sign(
        { userId: user.id, username: user.username, name: user.name, role: user.role, email: user.email, department: user.department },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Issue refresh token (new family)
      const { rawToken: refreshToken, familyId, expiresAt: refreshExpiresAt } = await issueRefreshToken(user.id);

      // Set both cookies
      setAuthCookies(res, token, refreshToken, refreshExpiresAt);

      // Log the login activity (persisted to MongoDB)
      logger.logActivity({
        action: 'login',
        message: 'User logged in',
        userId: String(user.id),
        userName: user.name || user.username || user.email || 'Unknown',
        role: user.role,
        department: user.department || '',
        status: 'success',
        ipAddress: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.get('user-agent') || null
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

      // Validate email domain - only allow institutional domain
      if (!email.toLowerCase().endsWith(`@${INSTITUTIONAL_EMAIL_DOMAIN}`)) {
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

      // Issue refresh token (new family)
      const { rawToken: refreshToken, familyId, expiresAt: refreshExpiresAt } = await issueRefreshToken(userId);

      // Set both cookies
      setAuthCookies(res, token, refreshToken, refreshExpiresAt);

      // Log the Google login activity (persisted to MongoDB)
      logger.logActivity({
        action: 'login',
        message: 'User logged in via Google',
        userId: String(userId),
        userName: staff?.name || name || email,
        role: role,
        department: staff?.department || '',
        status: 'success',
        ipAddress: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.get('user-agent') || null
      });

      return res.json({ user: { id: userId, email, name, role, department: staff?.department || null } });
    } catch (error) {
      console.error('Google login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Refresh token rotation
  refreshToken: async (req, res) => {
    try {
      const rawToken = req.cookies?.refresh_token;

      if (!rawToken) {
        return res.status(401).json({ error: 'No refresh token provided' });
      }

      // Hash the incoming token to look it up in DB
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash }
      });

      if (!storedToken) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // ── Reuse Detection ──
      // If this token has already been revoked, it means someone is replaying it.
      // Revoke ALL tokens in the family to protect the user.
      if (storedToken.revokedAt) {
        console.warn(`⚠️ Refresh token reuse detected for family ${storedToken.familyId}. Revoking entire family.`);
        await prisma.refreshToken.updateMany({
          where: { familyId: storedToken.familyId },
          data: { revokedAt: new Date() }
        });
        // Clear cookies
        res.clearCookie('auth_token', buildAuthCookieOptions(0));
        res.clearCookie('refresh_token', buildAuthCookieOptions(0));
        return res.status(401).json({ error: 'Token reuse detected. Please log in again.' });
      }

      // Check expiry
      if (new Date(storedToken.expiresAt) < new Date()) {
        return res.status(401).json({ error: 'Refresh token expired' });
      }

      // ── Revoke the old token ──
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() }
      });

      // Look up user to build a fresh JWT
      const staff = await prisma.staff.findUnique({
        where: { id: parseInt(storedToken.userId) || undefined },
        select: { id: true, username: true, name: true, role: true, email: true, department: true, is_active: true }
      });

      // If userId was an email (Google user), staff may be null
      let jwtPayload;
      if (staff && staff.is_active) {
        jwtPayload = { userId: staff.id, username: staff.username, name: staff.name, role: staff.role, email: staff.email, department: staff.department };
      } else {
        // Fallback for Google-only users stored with email as userId
        jwtPayload = { userId: storedToken.userId, email: storedToken.userId, role: 'Student', name: 'User' };
      }

      // Issue new access token
      const newAccessToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
      });

      // Issue new refresh token in the SAME family
      const { rawToken: newRefreshToken, expiresAt: newRefreshExpiresAt } = await issueRefreshToken(storedToken.userId, storedToken.familyId);

      // Set new cookies
      setAuthCookies(res, newAccessToken, newRefreshToken, newRefreshExpiresAt);

      return res.json({ message: 'Token refreshed successfully' });
    } catch (error) {
      console.error('Refresh token error:', error);
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

  // Logout function — blacklist the token and revoke refresh token
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

      // Revoke the refresh token if present
      const refreshRaw = req.cookies?.refresh_token;
      if (refreshRaw) {
        const refreshHash = crypto.createHash('sha256').update(refreshRaw).digest('hex');
        try {
          await prisma.refreshToken.updateMany({
            where: { tokenHash: refreshHash, revokedAt: null },
            data: { revokedAt: new Date() }
          });
        } catch (e) {
          console.error('Error revoking refresh token on logout:', e);
        }
      }

      // Clear both cookies
      const clearOpts = buildAuthCookieOptions(0);
      res.clearCookie('auth_token', clearOpts);
      res.clearCookie('refresh_token', clearOpts);

      // Log the logout activity if we could decode the token
      if (token) {
        try {
          const decoded = jwt.decode(token);
          if (decoded && decoded.userId) {
            logger.logActivity({
              action: 'logout',
              message: 'User logged out',
              userId: String(decoded.userId),
              userName: decoded.name || decoded.username || decoded.email || 'Unknown',
              role: decoded.role || 'Unknown',
              department: decoded.department || '',
              status: 'success',
              ipAddress: req.ip || req.connection?.remoteAddress || null,
              userAgent: req.get('user-agent') || null
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
    logger.logActivity({
      action: 'update',
      message: 'Staff record updated by Admin',
      userId: String(req.user?.userId || 'admin'),
      userName: req.user?.name || req.user?.username || 'Admin',
      role: 'Admin',
      department: req.user?.department || '',
      status: 'success',
      details: { targetId: id, fields: Object.keys(updates).filter(k => k !== 'password') }
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

      logger.logActivity({
        action: 'update',
        message: 'Inactive staff reactivated by Admin',
        userId: String(req.user?.userId || 'admin'),
        userName: req.user?.name || req.user?.username || 'Admin',
        role: 'Admin',
        department: req.user?.department || '',
        status: 'success',
        details: { reactivatedId: reactivatedStaff.id, username: reactivatedStaff.username }
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

    logger.logActivity({
      action: 'update',
      message: 'New staff created by Admin',
      userId: String(req.user?.userId || 'admin'),
      userName: req.user?.name || req.user?.username || 'Admin',
      role: 'Admin',
      department: req.user?.department || '',
      status: 'success',
      details: { newStaffId: newFaculty.id, username: newFaculty.username }
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

    logger.logActivity({
      action: 'delete',
      message: 'Staff member deactivated by Admin',
      userId: String(req.user?.userId || 'admin'),
      userName: req.user?.name || req.user?.username || 'Admin',
      role: 'Admin',
      department: req.user?.department || '',
      status: 'success',
      details: { deactivatedId: id }
    });

    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('deleteFaculty error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = authController;
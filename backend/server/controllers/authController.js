const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const dbUtils = require('../utils/database');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { addToBlacklist } = require('../utils/tokenBlacklist');
const { getNormalizedDepartment } = require('../utils/formHelpers');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isProd = process.env.NODE_ENV === 'production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'refresh-token-secret-distinct-key-64chars-minimum';

const buildAuthCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: maxAgeMs,
  path: '/'
});

/**
 * Hash opaque refresh token using distinct refresh secret
 */
function hashRefreshToken(token) {
  return crypto.createHmac('sha256', REFRESH_TOKEN_SECRET).update(token).digest('hex');
}

/**
 * Issue a matched Access Token (15m JWT) and Refresh Token (7d opaque token) pair.
 * Maintains familyId for reuse detection.
 */
async function issueTokenPair(user, existingFamilyId = null) {
  const userIdStr = String(user.id || user.userId || user.email);

  const accessToken = jwt.sign(
    {
      userId: user.id || user.userId || userIdStr,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      department: user.department
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const familyId = existingFamilyId || uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: userIdStr,
      familyId,
      expiresAt
    }
  });

  return { accessToken, refreshToken: rawRefreshToken, familyId };
}

const authController = {
  // Login function
  login: async (req, res, next) => {
    try {
      // User is already authenticated and checked by validationMiddleware
      const user = req.user;

      if (!user) {
        return res.status(500).json({ error: 'Authentication failed internally' });
      }

      // Reset failed attempts, clear lockout, and update last login time in Prisma
      try {
        await prisma.staff.update({
          where: { id: user.id },
          data: {
            failed_login_attempts: 0,
            locked_until: null,
            last_login: new Date()
          }
        });
      } catch (err) {
        console.error('Failed to reset login attempts on success:', err);
      }

      // Generate Access Token (15m) and Refresh Token (7d)
      const { accessToken, refreshToken } = await issueTokenPair(user);

      // Set httpOnly cookies for both tokens
      res.cookie('auth_token', accessToken, buildAuthCookieOptions(15 * 60 * 1000));
      res.cookie('refresh_token', refreshToken, buildAuthCookieOptions(7 * 24 * 60 * 60 * 1000));

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

      // Return user data (without tokens in body)
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
          audience: process.env.GOOGLE_CLIENT_ID,
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

      if (!emailVerified) {
        return res.status(400).json({ error: 'Email not verified by Google' });
      }

      // Validate email domain against externalized environment variable
      const configuredDomain = (process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'apsit.edu.in').replace(/^@/, '').toLowerCase().trim();
      if (!email.toLowerCase().endsWith(`@${configuredDomain}`)) {
        return res.status(403).json({
          error: 'Please sign in with your institutional email.'
        });
      }

      // Look up staff by email to determine role; default to Student
      const staff = await dbUtils.getStaffByEmail(email);
      const role = staff?.role || 'Student';
      const userId = staff?.id ? String(staff.id) : email;

      const userObj = {
        id: userId,
        userId: userId,
        username: email,
        name: staff?.name || name,
        role: role,
        email: email,
        department: staff?.department || null
      };

      // Generate Access and Refresh Token pair
      const { accessToken, refreshToken } = await issueTokenPair(userObj);

      res.cookie('auth_token', accessToken, buildAuthCookieOptions(15 * 60 * 1000));
      res.cookie('refresh_token', refreshToken, buildAuthCookieOptions(7 * 24 * 60 * 60 * 1000));

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

      return res.json({
        message: 'Login successful',
        user: { id: userId, email, name: userObj.name, role, department: staff?.department || null }
      });
    } catch (error) {
      console.error('Google login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Refresh Token Rotation Endpoint (POST /api/auth/refresh)
  refreshToken: async (req, res) => {
    try {
      const incomingRefreshToken = req.cookies?.refresh_token;

      if (!incomingRefreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      const tokenHash = hashRefreshToken(incomingRefreshToken);

      // Look up refresh token in PostgreSQL
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { tokenHash }
      });

      if (!tokenRecord) {
        // Token not recognized — clear cookies
        res.clearCookie('auth_token', buildAuthCookieOptions(0));
        res.clearCookie('refresh_token', buildAuthCookieOptions(0));
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Check if token was already revoked — Reuse Detection!
      if (tokenRecord.revokedAt !== null) {
        // Severe security event: Revoke entire token family for this user
        console.warn(`⚠️ Refresh token reuse detected for userId: ${tokenRecord.userId}, familyId: ${tokenRecord.familyId}. Revoking entire family.`);
        await prisma.refreshToken.updateMany({
          where: { familyId: tokenRecord.familyId, revokedAt: null },
          data: { revokedAt: new Date() }
        });

        res.clearCookie('auth_token', buildAuthCookieOptions(0));
        res.clearCookie('refresh_token', buildAuthCookieOptions(0));

        logger.logActivity({
          action: 'token_reuse_blocked',
          message: 'Refresh token reuse detected. Revoked all family tokens.',
          userId: tokenRecord.userId,
          level: 'WARN',
          status: 'failure',
          ipAddress: req.ip || null,
          userAgent: req.get('user-agent') || null
        });

        return res.status(401).json({ error: 'Refresh token reuse detected. Please log in again.' });
      }

      // Check if token has expired
      if (new Date(tokenRecord.expiresAt) < new Date()) {
        res.clearCookie('auth_token', buildAuthCookieOptions(0));
        res.clearCookie('refresh_token', buildAuthCookieOptions(0));
        return res.status(401).json({ error: 'Refresh token expired' });
      }

      // Valid token: Rotate token (revoke old one, issue new pair in same family)
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() }
      });

      // Retrieve current user details from staff if applicable
      let user = null;
      const numUserId = parseInt(tokenRecord.userId, 10);
      if (!isNaN(numUserId)) {
        user = await prisma.staff.findUnique({
          where: { id: numUserId },
          select: { id: true, username: true, name: true, department: true, role: true, email: true, is_active: true }
        });
      } else if (tokenRecord.userId.includes('@')) {
        user = await prisma.staff.findUnique({
          where: { email: tokenRecord.userId },
          select: { id: true, username: true, name: true, department: true, role: true, email: true, is_active: true }
        });
      }

      if (user && !user.is_active) {
        res.clearCookie('auth_token', buildAuthCookieOptions(0));
        res.clearCookie('refresh_token', buildAuthCookieOptions(0));
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      const userPayload = user || {
        id: tokenRecord.userId,
        userId: tokenRecord.userId,
        username: tokenRecord.userId,
        role: 'Student'
      };

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await issueTokenPair(userPayload, tokenRecord.familyId);

      // Set new cookies
      res.cookie('auth_token', newAccessToken, buildAuthCookieOptions(15 * 60 * 1000));
      res.cookie('refresh_token', newRefreshToken, buildAuthCookieOptions(7 * 24 * 60 * 60 * 1000));

      res.json({
        message: 'Token refreshed successfully',
        user: {
          id: userPayload.id,
          username: userPayload.username,
          name: userPayload.name,
          department: userPayload.department,
          role: userPayload.role,
          email: userPayload.email
        }
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  },

  // Register function - Create new user via API (Postman)
  register: async (req, res) => {
    try {
      const { username, name, department, role, email, password, employee_id } = req.body;

      if (!username || !name || !password) {
        return res.status(400).json({
          error: 'Username, name, and password are required'
        });
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format'
        });
      }

      const existingUserByUsername = await prisma.staff.findUnique({
        where: { username: username }
      });
      if (existingUserByUsername) {
        return res.status(409).json({
          error: 'User with this username already exists'
        });
      }

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

      const hashedPassword = await bcrypt.hash(password, 10);

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

      const { accessToken, refreshToken } = await issueTokenPair(newUser);

      res.cookie('auth_token', accessToken, buildAuthCookieOptions(15 * 60 * 1000));
      res.cookie('refresh_token', refreshToken, buildAuthCookieOptions(7 * 24 * 60 * 60 * 1000));

      res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });

    } catch (error) {
      console.error('Register error:', error);

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
      const userId = req.user?.userId;

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

  // Logout function — revoke refresh token and blacklist access token
  logout: async (req, res) => {
    try {
      // 1. Revoke refresh token in database if cookie present
      const incomingRefreshToken = req.cookies?.refresh_token;
      if (incomingRefreshToken) {
        try {
          const tokenHash = hashRefreshToken(incomingRefreshToken);
          await prisma.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() }
          });
        } catch (dbErr) {
          console.error('Failed to revoke refresh token in database:', dbErr);
        }
      }

      // 2. Blacklist access token if present
      const authHeader = req.headers.authorization;
      const token = (authHeader && authHeader.split(' ')[1]) || (req.cookies && req.cookies.auth_token);

      if (token) {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          const remainingTTL = decoded.exp - Math.floor(Date.now() / 1000);
          if (remainingTTL > 0) {
            await addToBlacklist(token, remainingTTL);
          }
        }
      }

      // 3. Clear both httpOnly cookies
      const clearOpts = buildAuthCookieOptions(0);
      res.clearCookie('auth_token', clearOpts);
      res.clearCookie('refresh_token', clearOpts);

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
        } catch (e) {}
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

// Create user endpoint (admin action)
authController.createUser = async (req, res) => {
  try {
    const { username, name, department, role, email, password, employee_id } = req.body;

    if (!username || !name || !password) {
      return res.status(400).json({
        error: 'Username, name, and password are required'
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    const existingUserByUsername = await prisma.staff.findUnique({
      where: { username: username }
    });
    if (existingUserByUsername) {
      return res.status(409).json({
        error: 'User with this username already exists'
      });
    }

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

    const hashedPassword = await bcrypt.hash(password, 10);

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

// Get all staff members (admin only)
authController.getFacultyList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    if (page > 0 && limit > 0) {
      const safePage = Math.max(1, page);
      const safeLimit = Math.min(Math.max(1, limit), 100);
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

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedUsername = typeof username === 'string' ? username.toLowerCase().trim() : undefined;
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : undefined;
    const staffId = parseInt(id, 10);

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

    if (!username || !name || !password) {
      return res.status(400).json({
        error: 'Username, name, and password are required'
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    const existingActiveByUsername = await prisma.staff.findFirst({
      where: { username: normalizedUsername, is_active: true }
    });
    if (existingActiveByUsername) {
      return res.status(409).json({
        error: 'User with this username already exists'
      });
    }

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
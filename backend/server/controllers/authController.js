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

const getRequestUserAgent = (req) => {
  if (!req) return null;
  if (typeof req.get === 'function') {
    try { return req.get('user-agent') || null; } catch { /* ignore */ }
  }
  return req.headers?.['user-agent'] || null;
};

const getRequestIp = (req) => {
  if (!req) return null;
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
};

/**
 * Generate an opaque refresh token, hash it, and store in DB.
 * Returns the plaintext token (to be set as a cookie).
 */
async function issueRefreshToken(userId, familyId = null, database = prisma) {
  const rawToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const family = familyId || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await database.refreshToken.create({
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
  res.cookie('auth_token', accessToken, buildAuthCookieOptions(Math.max(0, jwt.decode(accessToken).exp * 1000 - Date.now())));
  const refreshMaxAge = refreshExpiresAt.getTime() - Date.now();
  res.cookie('refresh_token', refreshToken, buildAuthCookieOptions(refreshMaxAge));
}

async function serializableTransaction(operation) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await prisma.$transaction(operation, { isolationLevel: 'Serializable' }); }
    catch (error) { if (error.code !== 'P2034' || attempt === 2) throw error; }
  }
}

// Privilege changes revoke sessions atomically. Serializable isolation protects the final active administrator.
async function updateManagedStaff(staffId, updates, actorId) {
  const data = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));
  if (!Object.keys(data).length) return null;
  if (data.password) {
    if (typeof data.password !== 'string' || data.password.length < 8) {
      const error = new Error('Password must be at least 8 characters long'); error.status = 400; throw error;
    }
    data.password = await bcrypt.hash(data.password, 10);
  }
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.staff.findUnique({ where: { id: staffId } });
    if (!current) return null;
    const removesAdmin = current.role === 'Admin' && current.is_active &&
      ((data.role !== undefined && data.role !== 'Admin') || data.is_active === false);
    if (removesAdmin && (String(staffId) === String(actorId) ||
      await transaction.staff.count({ where: { role: 'Admin', is_active: true } }) <= 1)) {
      const error = new Error('Cannot remove your own or the final active administrator account'); error.status = 409; throw error;
    }
    const revokesSessions = ['password', 'role', 'department', 'email', 'is_active'].some(key => data[key] !== undefined);
    if (revokesSessions) data.sessions_revoked_at = new Date();
    const updated = await transaction.staff.update({ where: { id: staffId }, data,
      select: { id: true, username: true, name: true, department: true, role: true, email: true,
        employee_id: true, is_active: true, created_at: true, last_login: true } });
    if (revokesSessions) {
      await transaction.refreshToken.updateMany({
        where: { userId: { in: [String(staffId), current.email].filter(Boolean) }, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    return updated;
  }, { isolationLevel: 'Serializable' });
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

      const { rawToken: refreshToken, familyId, expiresAt: refreshExpiresAt } = await issueRefreshToken(user.id);

      // Generate JWT token with short expiry
      const token = jwt.sign(
        { sessionIssuedAt: Date.now(), familyId, userId: user.id, username: user.username, name: user.name, role: user.role, email: user.email, department: user.department },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Set both cookies
      setAuthCookies(res, token, refreshToken, refreshExpiresAt);

      // Log the login activity (persisted to MongoDB)
      const actorLabel = `${user.name || user.username} (${user.role}${user.department ? ' · ' + user.department : ''})`;
      logger.logActivity({
        action: 'login',
        message: `${actorLabel} logged in successfully`,
        userId: String(user.id),
        userName: user.name || user.username || user.email || 'Unknown',
        role: user.role,
        department: user.department || '',
        status: 'success',
        details: { method: 'password', username: user.username, email: user.email },
        ipAddress: getRequestIp(req),
        userAgent: getRequestUserAgent(req)
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
      const email = payload?.email?.trim().toLowerCase();
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
      if (staff && !staff.is_active) return res.status(403).json({ error: 'Account is inactive' });
      const role = staff?.role || 'Student';
      // Use staff ID if found, otherwise use email as userId for Google users
      const userId = staff?.id || email;

      const { rawToken: refreshToken, familyId, expiresAt: refreshExpiresAt } = await issueRefreshToken(userId);

      const token = jwt.sign(
        { sessionIssuedAt: Date.now(), familyId, userId, email, role, name, department: staff?.department || null },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Set both cookies
      setAuthCookies(res, token, refreshToken, refreshExpiresAt);

      // Log the Google login activity (persisted to MongoDB)
      const actorName = staff?.name || name || email;
      const deptSuffix = staff?.department ? ` · ${staff.department}` : '';
      logger.logActivity({
        action: 'login',
        message: `${actorName} (${role}${deptSuffix}) logged in via Google Workspace`,
        userId: String(userId),
        userName: actorName,
        role: role,
        department: staff?.department || '',
        status: 'success',
        details: { method: 'google', email },
        ipAddress: getRequestIp(req),
        userAgent: getRequestUserAgent(req)
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

      // Resolve principal before consuming the token. Email principals are Google students.
      const numericId = /^[1-9]\d*$/.test(storedToken.userId) ? Number(storedToken.userId) : null;
      const isStudentEmail = typeof storedToken.userId === 'string' &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storedToken.userId) &&
        storedToken.userId.toLowerCase().endsWith(`@${INSTITUTIONAL_EMAIL_DOMAIN}`);
      if ((!Number.isSafeInteger(numericId) || numericId <= 0) && !isStudentEmail) {
        return res.status(401).json({ error: 'Invalid session identity' });
      }
      const staff = numericId
        ? await prisma.staff.findUnique({ where: { id: numericId } })
        : await prisma.staff.findUnique({ where: { email: storedToken.userId } });
      if ((numericId && !staff) || (staff && !staff.is_active)) {
        await prisma.refreshToken.updateMany({ where: { familyId: storedToken.familyId }, data: { revokedAt: new Date() } });
        res.clearCookie('auth_token', buildAuthCookieOptions(0));
        res.clearCookie('refresh_token', buildAuthCookieOptions(0));
        return res.status(401).json({ error: 'Account is unavailable' });
      }
      let jwtPayload;
      if (staff) {
        jwtPayload = { userId: staff.id, username: staff.username, name: staff.name, role: staff.role, email: staff.email, department: staff.department };
      } else {
        // Preserve display fields only from a signed cookie belonging to the same student.
        let previous;
        try { previous = jwt.verify(req.cookies?.auth_token || '', process.env.JWT_SECRET, { ignoreExpiration: true }); } catch { /* Access cookie can expire before refresh. */ }
        const sameStudent = previous?.userId === storedToken.userId && previous?.role === 'Student';
        jwtPayload = { userId: storedToken.userId, email: storedToken.userId, role: 'Student',
          name: sameStudent ? previous.name : storedToken.userId.split('@')[0],
          department: sameStudent ? previous.department || null : null };
      }
      const newAccessToken = jwt.sign({ ...jwtPayload, familyId: storedToken.familyId, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
      // Consumption and replacement commit together; conditional update prevents double rotation.
      const rotation = await serializableTransaction(async (transaction) => {
        const consumed = await transaction.refreshToken.updateMany({
          where: { id: storedToken.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date() }
        });
        if (consumed.count !== 1) return null;
        return issueRefreshToken(jwtPayload.userId, storedToken.familyId, transaction);
      });
      if (!rotation) {
        await prisma.refreshToken.updateMany({ where: { familyId: storedToken.familyId }, data: { revokedAt: new Date() } });
        res.clearCookie('auth_token', buildAuthCookieOptions(0));
        res.clearCookie('refresh_token', buildAuthCookieOptions(0));
        return res.status(401).json({ error: 'Refresh token already used or expired' });
      }
      const { rawToken: newRefreshToken, expiresAt: newRefreshExpiresAt } = rotation;

      // Set new cookies
      setAuthCookies(res, newAccessToken, newRefreshToken, newRefreshExpiresAt);

      return res.json({ message: 'Token refreshed successfully', user: { id: jwtPayload.userId, ...jwtPayload } });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(503).json({ error: 'Session refresh unavailable. Please retry.' });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const userId = req.user?.userId; // From JWT middleware

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (typeof userId === 'string' && userId.includes('@') && req.user.role === 'Student') {
        return res.json({ user: { id: userId, email: req.user.email, name: req.user.name,
          role: 'Student', department: req.user.department || null } });
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

      if (department !== undefined) return res.status(403).json({ error: 'Only an administrator can change department' });
      if (email !== undefined && (typeof email !== 'string' || email.trim().toLowerCase() !== req.user.email?.toLowerCase())) {
        return res.status(403).json({ error: 'Only an administrator can change the registered verification email.' });
      }
      if (typeof userId === 'string' && userId.includes('@')) {
        return res.status(400).json({ error: 'Google student profiles are managed by Google' });
      }
      // Basic validation
      if (email !== undefined && email !== null) {
        const emailStr = String(email).trim();
        if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
          return res.status(400).json({ error: 'Invalid email address' });
        }
      }

      const updated = await dbUtils.updateStaffProfile(userId, {
        name
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

      // Revoke the whole family, including replacements issued before this logout.
      const refreshRaw = req.cookies?.refresh_token;
      if (refreshRaw) {
        const refreshHash = crypto.createHash('sha256').update(refreshRaw).digest('hex');
        await serializableTransaction(async (transaction) => {
          const stored = await transaction.refreshToken.findUnique({ where: { tokenHash: refreshHash } });
          if (stored) {
            await transaction.refreshToken.updateMany({
              where: { familyId: stored.familyId },
              data: { revokedAt: new Date() }
            });
          }
        });
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
            const actorName = decoded.name || decoded.username || decoded.email || 'User';
            logger.logActivity({
              action: 'logout',
              message: `${actorName} (${decoded.role || 'User'}) logged out`,
              userId: String(decoded.userId),
              userName: actorName,
              role: decoded.role || 'Unknown',
              department: decoded.department || '',
              status: 'success',
              ipAddress: getRequestIp(req),
              userAgent: getRequestUserAgent(req)
            });
          }
        } catch (e) {
          // ignore parsing errors
        }
      }


      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.clearCookie('auth_token', buildAuthCookieOptions(0));
      res.clearCookie('refresh_token', buildAuthCookieOptions(0));
      res.status(503).json({ error: 'Session revocation unavailable. Please retry logout.' });
    }
  }
};

const isCollegeWideRole = (r) => {
  if (!r) return false;
  const roleLower = String(r).toLowerCase();
  return roleLower === 'principal' || roleLower === 'accounts' || roleLower === 'admin';
};

// List all staff (used by non-admin endpoints)
authController.getAllStaff = async (req, res) => {
  try {
    const staff = await dbUtils.getAllStaff();
    const sanitized = staff.map(s => isCollegeWideRole(s.role) ? { ...s, department: null } : s);
    res.json({ staff: sanitized });
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

      const sanitized = staff.map(s => isCollegeWideRole(s.role) ? { ...s, department: null } : s);
      return res.json({
        staff: sanitized,
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
    const sanitized = staff.map(s => isCollegeWideRole(s.role) ? { ...s, department: null } : s);
    res.json({ staff: sanitized });
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
    const staffId = Number(id);
    if (!Number.isSafeInteger(staffId) || staffId <= 0) return res.status(400).json({ error: 'Invalid staff ID' });

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

    let targetRole = role;
    if (!targetRole) {
      const existing = await prisma.staff.findUnique({ where: { id: staffId }, select: { role: true } });
      targetRole = existing?.role;
    }
    const isCollegeWide = isCollegeWideRole(targetRole);
    let resolvedDepartment;
    if (isCollegeWide) {
      resolvedDepartment = null;
    } else if (department !== undefined) {
      resolvedDepartment = department ? getNormalizedDepartment(department) : null;
    }

    const updates = {
      username: normalizedUsername,
      name,
      department: resolvedDepartment,
      role,
      email: normalizedEmail,
      employee_id,
      is_active
    };
    if (password) {
      updates.password = password;
    }

    const updated = await updateManagedStaff(staffId, updates, req.user?.userId);
    if (!updated) {
      return res.status(400).json({ error: 'No fields to update or staff not found' });
    }
    const adminName = req.user?.name || req.user?.username || 'Admin';
    const targetLabel = `${updated.name || updated.username} (@${updated.username}, ${updated.role}${updated.department ? ' · ' + updated.department : ''})`;
    let updateMessage;
    let actionType = 'update_details';

    if (updates.is_active !== undefined) {
      actionType = updates.is_active ? 'activate' : 'deactivate';
      updateMessage = `Admin ${adminName} ${updates.is_active ? 'activated' : 'deactivated'} staff account of ${targetLabel}`;
    } else {
      updateMessage = `Admin ${adminName} updated details for staff ${targetLabel}`;
    }

    logger.logActivity({
      action: updates.is_active === false ? 'deactivate' : updates.is_active === true ? 'activate' : 'update',
      message: updateMessage,
      userId: String(req.user?.userId || 'admin'),
      userName: adminName,
      role: 'Admin',
      department: req.user?.department || '',
      status: 'success',
      details: {
        actionType,
        targetId: staffId,
        targetName: updated.name,
        targetUsername: updated.username,
        targetRole: updated.role,
        targetDepartment: updated.department,
        isActive: updated.is_active,
        fields: Object.keys(updates).filter(k => k !== 'password' && updates[k] !== undefined)
      },
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req)
    });
    res.json({ message: 'Staff updated successfully', staff: updated });
  } catch (error) {
    console.error('updateStaffById error:', error);
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'P2034') return res.status(409).json({ error: 'Concurrent staff change. Please retry.' });
    if (error.code === '23505' || error.code === 'P2002') {
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

    const isCollegeWide = isCollegeWideRole(role);
    const resolvedDepartment = isCollegeWide ? null : (department ? getNormalizedDepartment(department) : null);

    if (reactivationTarget) {
      const reactivatedStaff = await prisma.$transaction(async (transaction) => {
        const current = await transaction.staff.findUnique({ where: { id: reactivationTarget.id } });
        if (!current || current.is_active) {
          const error = new Error('Account changed. Refresh and retry.'); error.status = 409; throw error;
        }
        const reactivated = await transaction.staff.update({
        where: { id: reactivationTarget.id },
        data: {
          username: normalizedUsername,
          name: name.trim(),
          password: hashedPassword,
          email: normalizedEmail,
          department: resolvedDepartment,
          role: role || 'Faculty',
          employee_id: employee_id || null,
          is_active: true,
          sessions_revoked_at: new Date(),
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
        await transaction.refreshToken.updateMany({
          where: { userId: { in: [String(reactivationTarget.id), current.email].filter(Boolean) }, revokedAt: null },
          data: { revokedAt: new Date() }
        });
        return reactivated;
      }, { isolationLevel: 'Serializable' });

      const adminName = req.user?.name || req.user?.username || 'Admin';
      logger.logActivity({
        action: 'activate',
        message: `Admin ${adminName} reactivated inactive staff account for ${reactivatedStaff.name} (@${reactivatedStaff.username}, Role: ${reactivatedStaff.role})`,
        userId: String(req.user?.userId || 'admin'),
        userName: adminName,
        role: 'Admin',
        department: req.user?.department || '',
        status: 'success',
        details: {
          actionType: 'reactivate',
          targetId: reactivatedStaff.id,
          targetName: reactivatedStaff.name,
          targetUsername: reactivatedStaff.username,
          targetRole: reactivatedStaff.role
        },
        ipAddress: getRequestIp(req),
        userAgent: getRequestUserAgent(req)
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
        department: resolvedDepartment,
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

    const adminName = req.user?.name || req.user?.username || 'Admin';
    const deptSuffix = newFaculty.department ? ` · ${newFaculty.department}` : '';
    logger.logActivity({
      action: 'create',
      message: `Admin ${adminName} created new staff account for ${newFaculty.name} (@${newFaculty.username}, Role: ${newFaculty.role}${deptSuffix})`,
      userId: String(req.user?.userId || 'admin'),
      userName: adminName,
      role: 'Admin',
      department: req.user?.department || '',
      status: 'success',
      details: {
        actionType: 'create_staff',
        targetId: newFaculty.id,
        targetName: newFaculty.name,
        targetUsername: newFaculty.username,
        targetRole: newFaculty.role,
        targetDepartment: newFaculty.department,
        email: newFaculty.email
      },
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req)
    });
    res.status(201).json({
      message: 'Faculty member created successfully',
      staff: newFaculty
    });

  } catch (error) {
    console.error('createFaculty error:', error);
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'P2034') return res.status(409).json({ error: 'Concurrent staff change. Please retry.' });

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

// Delete faculty member by ID (supports permanent delete via ?permanent=true, or soft delete/deactivate)
authController.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Staff ID required' });
    }

    const staffId = Number(id);
    if (!Number.isSafeInteger(staffId) || staffId <= 0) return res.status(400).json({ error: 'Invalid staff ID' });

    const isPermanent = req.query?.permanent === 'true' || req.query?.permanent === true || req.body?.permanent === true;

    if (isPermanent) {
      // Permanent deletion from database
      const existing = await prisma.staff.findUnique({ where: { id: staffId } });
      if (!existing) {
        return res.status(404).json({ error: 'Staff member not found' });
      }

      // Safety checks: Cannot delete your own Admin account or the last remaining active Admin
      if (existing.role === 'Admin') {
        if (String(staffId) === String(req.user?.userId)) {
          return res.status(409).json({ error: 'Cannot delete your own administrator account' });
        }
        const activeAdminCount = await prisma.staff.count({ where: { role: 'Admin', is_active: true } });
        if (existing.is_active && activeAdminCount <= 1) {
          return res.status(409).json({ error: 'Cannot delete the final active administrator account' });
        }
      }

      await prisma.$transaction(async (tx) => {
        // Clean up any related tokens or challenges
        await tx.refreshToken.deleteMany({
          where: { userId: { in: [String(staffId), existing.email].filter(Boolean) } }
        });
        if (existing.email) {
          await tx.passwordResetToken.deleteMany({ where: { email: existing.email } }).catch(() => {});
          await tx.otpVerification.deleteMany({ where: { email: existing.email } }).catch(() => {});
          await tx.accountOtpChallenge.deleteMany({ where: { email: existing.email } }).catch(() => {});
        }
        await tx.staff.delete({ where: { id: staffId } });
      }, { isolationLevel: 'Serializable' });

      const adminName = req.user?.name || req.user?.username || 'Admin';
      const targetLabel = `${existing.name || existing.username} (@${existing.username}, ${existing.role}${existing.department ? ' · ' + existing.department : ''})`;
      logger.logActivity({
        action: 'delete',
        message: `Admin ${adminName} permanently deleted staff account of ${targetLabel}`,
        userId: String(req.user?.userId || 'admin'),
        userName: adminName,
        role: 'Admin',
        department: req.user?.department || '',
        status: 'success',
        details: {
          actionType: 'permanent_delete',
          targetId: id,
          targetName: existing.name,
          targetUsername: existing.username,
          targetRole: existing.role,
          targetDepartment: existing.department,
          email: existing.email
        },
        ipAddress: getRequestIp(req),
        userAgent: getRequestUserAgent(req)
      });

      return res.json({ message: 'Staff member permanently deleted successfully' });
    }

    // Default / Backward compatibility: Soft delete - mark as inactive so history is preserved.
    const updated = await updateManagedStaff(staffId, { is_active: false }, req.user?.userId);
    if (!updated) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const adminName = req.user?.name || req.user?.username || 'Admin';
    const targetLabel = `${updated.name || updated.username || id} (@${updated.username || id}, ${updated.role || 'Staff'})`;
    logger.logActivity({
      action: 'delete',
      message: `Admin ${adminName} deactivated staff account of ${targetLabel}`,
      userId: String(req.user?.userId || 'admin'),
      userName: adminName,
      role: 'Admin',
      department: req.user?.department || '',
      status: 'success',
      details: {
        actionType: 'deactivate',
        targetId: id,
        targetName: updated.name,
        targetUsername: updated.username,
        targetRole: updated.role
      },
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req)
    });

    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('deleteFaculty error:', error);
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'P2034') return res.status(409).json({ error: 'Concurrent staff change. Please retry.' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = authController;

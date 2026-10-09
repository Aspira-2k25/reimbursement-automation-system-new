const jwt = require('jsonwebtoken');
const { isBlacklisted } = require('../utils/tokenBlacklist');
const prisma = require('../config/prisma');

// Extract token from Authorization header or httpOnly cookie
const extractToken = (req) => {
  // First try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }

  // Then try httpOnly cookie
  if (req.cookies && req.cookies.auth_token) {
    return req.cookies.auth_token;
  }

  return null;
};

const authMiddleware = {
  // Verify JWT token
  verifyToken: async (req, res, next) => {
    try {
      const token = extractToken(req);

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      // Check if the token has been blacklisted (logged out)
      const blacklisted = await isBlacklisted(token);
      if (blacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
      if (decoded.familyId) {
        const family = await prisma.refreshToken.findFirst({ where: { familyId: decoded.familyId,
          userId: String(decoded.userId), revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
        if (!family) return res.status(401).json({ error: 'Session family has been revoked' });
      }

      const numericId = typeof decoded.userId === 'number' || /^\d+$/.test(String(decoded.userId));
      if (numericId) {
        const staff = await prisma.staff.findUnique({ where: { id: Number(decoded.userId) },
          select: { id: true, name: true, username: true, email: true, role: true, department: true,
            is_active: true, sessions_revoked_at: true } });
        const issued = decoded.sessionIssuedAt || (decoded.iat || 0) * 1000;
        if (!staff?.is_active || (staff.sessions_revoked_at && issued <= new Date(staff.sessions_revoked_at).getTime())) {
          return res.status(401).json({ error: 'Session revoked. Please log in again.' });
        }
        req.user = { ...decoded, ...staff, userId: staff.id };
      } else {
        if (decoded.role !== 'Student' || typeof decoded.userId !== 'string' || decoded.userId !== decoded.email ||
            !decoded.email.toLowerCase().endsWith(`@${process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'apsit.edu.in'}`)) {
          return res.status(401).json({ error: 'Invalid user identity' });
        }
        const staff = await prisma.staff.findUnique({ where: { email: decoded.email }, select: { id: true } });
        if (staff) return res.status(401).json({ error: 'Account changed. Please log in again.' });
        req.user = decoded;
      }
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      return res.status(503).json({ error: 'Authentication service unavailable. Please retry.' });
    }
  },

  // Check if user has specific role
  requireRole: (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Normalize roles for case-insensitive comparison
      const userRole = req.user.role?.toLowerCase();
      const normalizedRoles = roles.map(r => r.toLowerCase());

      if (!normalizedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: roles,
          current: req.user.role
        });
      }

      next();
    };
  },

  // Check if user has any of the specified roles (alternative to requireRole)
  requireAnyRole: (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRole = req.user.role?.toLowerCase();
      const normalizedRoles = roles.map(r => r.toLowerCase());

      if (!normalizedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This action requires one of the following roles: ${roles.join(', ')}`
        });
      }

      next();
    };
  }
};

module.exports = authMiddleware;

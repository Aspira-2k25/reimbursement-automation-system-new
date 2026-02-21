const jwt = require('jsonwebtoken');

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
  verifyToken: (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    try {
      const token = extractToken(req);

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      // Check if the token has been blacklisted (logged out)
      const blacklisted = await isBlacklisted(token);
      if (blacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      return res.status(401).json({ error: 'Authentication failed' });
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
  },

  // Optional authentication (doesn't fail if no token)
  optionalAuth: (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next(); // Continue without authentication
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    try {
      const token = extractToken(req);

      if (!token) {
        return next(); // Continue without authentication
      }

      // Skip blacklisted tokens silently in optional auth
      const blacklisted = await isBlacklisted(token);
      if (blacklisted) {
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      // Token is invalid, but we don't fail the request
      console.error('Optional auth error:', error);
      next();
    }
  },

  // Verify token and extract user without failing (for middleware chains)
  extractUser: async (req, res, next) => {
    try {
      const token = extractToken(req);
      if (!token) return next();

      const blacklisted = await isBlacklisted(token);
      if (blacklisted) return next();

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      next();
    }
  }
};

module.exports = authMiddleware;

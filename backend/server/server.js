// server.js
// Only load dotenv in local development (not in Vercel/serverless)
// Vercel automatically injects environment variables into process.env
// Check multiple conditions to ensure we're not in Vercel
if (!process.env.VERCEL && !process.env.VERCEL_ENV && process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ quiet: true }); // Suppress dotenv logs
}

// ============================================
// Security: Validate critical environment variables
// ============================================
const requiredEnvVars = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Validate Institutional Email Domain
if (!process.env.INSTITUTIONAL_EMAIL_DOMAIN) {
  console.warn('⚠️ INSTITUTIONAL_EMAIL_DOMAIN not set; defaulting to apsit.edu.in');
  process.env.INSTITUTIONAL_EMAIL_DOMAIN = 'apsit.edu.in';
}

// Validate Redis URL for BullMQ
if (!process.env.REDIS_URL) {
  console.warn('⚠️ REDIS_URL not set; BullMQ will default to redis://127.0.0.1:6379');
}

// Validate CSP Report URI
if (!process.env.CSP_REPORT_URI) {
  console.warn('⚠️ CSP_REPORT_URI not set; defaulting to /api/csp-report');
}

// Validate JWT and Refresh Token secret strength & separation
const SECRET_MIN_LENGTH = 64;
const KNOWN_WEAK_SECRETS = [
  'your_super_secret_jwt_key_here',
  'secret',
  'jwt_secret',
  'mysecret',
  'password',
  '123456',
  'change_me',
  'your_64_character_or_longer_random_secret_here_minimum_sixty_four_chars',
  'your_64_character_refresh_token_secret_here_distinct_from_jwt_secret'
];

if (process.env.JWT_SECRET === process.env.REFRESH_TOKEN_SECRET) {
  throw new Error('Security violation: REFRESH_TOKEN_SECRET must be distinct from JWT_SECRET.');
}

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < SECRET_MIN_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${SECRET_MIN_LENGTH} characters.`);
  }
  if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET.length < SECRET_MIN_LENGTH) {
    throw new Error(`REFRESH_TOKEN_SECRET must be at least ${SECRET_MIN_LENGTH} characters.`);
  }

  if (KNOWN_WEAK_SECRETS.includes(process.env.JWT_SECRET.toLowerCase())) {
    throw new Error('JWT_SECRET is a known weak/default value. Generate a secure random string.');
  }
  if (KNOWN_WEAK_SECRETS.includes(process.env.REFRESH_TOKEN_SECRET.toLowerCase())) {
    throw new Error('REFRESH_TOKEN_SECRET is a known weak/default value. Generate a secure random string.');
  }
  console.log('✅ Authentication secret validation passed');
} else {
  // Development mode - warn but allow
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < SECRET_MIN_LENGTH ||
    KNOWN_WEAK_SECRETS.includes(process.env.JWT_SECRET.toLowerCase())) {
    console.warn('⚠️  JWT_SECRET is weak or using default value. This is OK for development only.');
  }
  if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET.length < SECRET_MIN_LENGTH ||
    KNOWN_WEAK_SECRETS.includes(process.env.REFRESH_TOKEN_SECRET.toLowerCase())) {
    console.warn('⚠️  REFRESH_TOKEN_SECRET is weak or using default value. This is OK for development only.');
  }
  console.log('✅ Authentication secrets initialized');
}

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { csrfProtection, generateCsrfToken } = require('./middleware/csrf');
const http = require('http');
const { Server: IOServer } = require('socket.io');

// Database/connectors
const connectMongoDB = require('./config/mongo');
const prisma = require('./config/prisma');
const dbUtils = require('./utils/database');
const logger = require('./utils/logger');
const ActivityLog = require('./models/ActivityLog');

// Queue & Worker
const { closeEmailQueue } = require('./queues/emailQueue');
const { startEmailWorker, closeEmailWorker } = require('./workers/emailWorker');

const notificationRoutes = require('./routes/notificationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const studentFormRoutes = require('./routes/StudentFormRoutes');
const formRoutes = require('./routes/formRoutes');
const authRoutes = require('./routes/auth');
const passwordRoutes = require('./routes/passwordRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const uploadRoute = require('./controllers/routeUpload');
const upload = require('./middleware/multer');
const authMiddleware = require('./middleware/auth');
const securityHeaders = require('./middleware/securityHeaders');
const { requestContext } = require('./middleware/requestContext');
const { validateInputLength, sanitizeInput } = require('./middleware/requestValidator');

const app = express();

// Trust proxies (required for Render, Railway, Heroku, etc.)
app.set('trust proxy', 1);

// Add request ID tracking early in the middleware chain
app.use(requestContext);

// ----------------- CORS (must be first so preflight/OPTIONS gets headers) -----------------
const isProd = process.env.NODE_ENV === 'production';

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [];

    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    if (process.env.FRONTEND_URL_PREVIEW) {
      allowedOrigins.push(process.env.FRONTEND_URL_PREVIEW);
    }

    if (!isProd) {
      allowedOrigins.push(
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5174',
        'http://localhost:5000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5000'
      );
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (!isProd) {
      try {
        const u = new URL(origin);
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
          return callback(null, true);
        }
      } catch (_) { }
    }

    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token', 'X-XSRF-Token'],
  exposedHeaders: ['X-Request-ID'],
  optionsSuccessStatus: 200
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Cookie parser middleware (required for httpOnly cookies and CSRF double-submit)
app.use(cookieParser());

// ----------------- Response Compression -----------------
app.use(compression());

// ----------------- Security Middleware -----------------
app.use(securityHeaders);

// ============================================
// Rate Limiting Configuration
// ============================================

// General API rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  message: {
    error: 'Too many requests',
    message: 'Please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/' && req.method === 'GET'
});
app.use('/api/', limiter);

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many login attempts',
    message: 'Please try again after 15 minutes.',
    retryAfter: 900
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/google', authLimiter);

// Form submission rate limiting
const formSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    error: 'Too many form submissions',
    message: 'Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/forms/submit', formSubmitLimiter);
app.use('/api/student-forms/submit', formSubmitLimiter);

// Password reset / OTP rate limiting
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many password reset attempts',
    message: 'Please try again after 15 minutes.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/password/forgot-password', passwordResetLimiter);
app.use('/api/password/send-otp', passwordResetLimiter);

// ----------------- Health / Basic routes -----------------
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'backend',
    time: new Date().toISOString()
  });
});

app.head('/', (req, res) => {
  res.status(200).end();
});

// ----------------- Body parsing -----------------
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Input sanitization & validation
app.use(sanitizeInput);
app.use(validateInputLength);

// Serve static uploaded files if present
const fs = require('fs');
const uploadsPath = path.join(__dirname, 'uploads');
const publicPath = path.join(__dirname, 'public');

if (fs.existsSync(uploadsPath)) {
  app.use('/uploads', express.static(uploadsPath));
}
if (fs.existsSync(publicPath)) {
  app.use('/public', express.static(publicPath));
}

// Test Postgres connection
if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
  app.get('/test-db', authMiddleware.verifyToken, authMiddleware.requireRole(['Principal']), async (req, res) => {
    try {
      const result = await dbUtils.testConnection();
      if (result.success) {
        res.json({
          message: 'Postgres connected successfully!',
          timestamp: result.timestamp
        });
      } else {
        res.status(500).json({ error: 'Postgres connection failed', details: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: 'Postgres connection failed', details: error.message });
    }
  });
}

// Get all users (Postgres)
app.get('/api/users',
  authMiddleware.verifyToken,
  authMiddleware.requireRole(['Principal', 'HOD', 'Accounts']),
  async (req, res) => {
    try {
      const users = await dbUtils.getAllUsers();
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get users' });
    }
  }
);

// ----------------- API Routes -----------------
// Cache-Control middleware for read-only GET endpoints
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') {
    const hasAuthHeader = Boolean(req.headers.authorization);
    const hasCookies = Boolean(req.headers.cookie);
    if (hasAuthHeader || hasCookies) {
      res.set('Cache-Control', 'no-store');
    } else {
      res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30');
    }
  } else {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// Activity logging middleware
const activityLogger = require('./middleware/activityLogger');
app.use('/api', activityLogger);

// CSP Violation Reporting Endpoint (non-blocking, limit 10KB)
app.post(
  '/api/csp-report',
  express.json({ type: ['application/json', 'application/csp-report'], limit: '10kb' }),
  (req, res) => {
    // Non-blocking: respond immediately with 204 No Content
    res.status(204).end();

    const reportData = req.body?.['csp-report'] || req.body || {};
    
    // Log violation to MongoDB ActivityLog asynchronously
    logger.logActivity({
      action: 'csp_violation',
      message: `CSP violation: blocked-uri=${reportData['blocked-uri'] || 'unknown'}, directive=${reportData['violated-directive'] || reportData['effective-directive'] || 'unknown'}`,
      level: 'WARN',
      status: 'failure',
      details: {
        documentUri: reportData['document-uri'],
        referrer: reportData.referrer,
        violatedDirective: reportData['violated-directive'],
        effectiveDirective: reportData['effective-directive'],
        originalPolicy: reportData['original-policy'],
        blockedUri: reportData['blocked-uri'],
        statusCode: reportData['status-code']
      },
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
      method: 'POST',
      endpoint: '/api/csp-report'
    });
  }
);

// CSRF token endpoint for frontend
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// Auth routes (handles login, google, refresh, logout, profile)
app.use('/api/auth', authRoutes);

// Password management routes
app.use('/api/password', passwordRoutes);

// Uploads
app.use('/api/uploads', uploadRoutes);

// Cloudinary / user upload controller
app.use('/api/users', uploadRoute);

// Forms (MongoDB) - Protected with Double-Submit Cookie CSRF
app.use('/api/forms', csrfProtection, formRoutes);

// Student forms (MongoDB) - Protected with Double-Submit Cookie CSRF
app.use('/api/student-forms', csrfProtection, studentFormRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Announcement routes
app.use('/api/announcements', announcementRoutes);

// Admin logs
app.get('/api/admin/logs',
  authMiddleware.verifyToken,
  authMiddleware.requireRole(['Admin']),
  async (req, res) => {
    try {
      await connectMongoDB();

      const roleFilter = String(req.query.role || 'All');
      const departmentFilter = String(req.query.department || 'All');
      const actionFilter = String(req.query.action || 'All');
      const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : null;
      const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : null;
      const rawLimit = Number.parseInt(String(req.query.limit || '200'), 10);
      const rawPage = Number.parseInt(String(req.query.page || '1'), 10);
      const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 200;
      const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;

      const filter = {};

      if (roleFilter !== 'All') filter.role = roleFilter;
      if (departmentFilter !== 'All') filter.department = departmentFilter;
      if (actionFilter !== 'All') filter.action = actionFilter;

      if (startDate && !Number.isNaN(startDate.getTime())) {
        filter.timestamp = filter.timestamp || {};
        filter.timestamp.$gte = startDate;
      }
      if (endDate && !Number.isNaN(endDate.getTime())) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.timestamp = filter.timestamp || {};
        filter.timestamp.$lte = endOfDay;
      }

      const total = await ActivityLog.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, totalPages);
      const skip = (safePage - 1) * limit;

      const logs = await ActivityLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const formattedLogs = logs.map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        data: {
          user: log.userName,
          role: log.role,
          department: log.department,
          formId: log.formId || undefined,
          action: log.action,
          status: log.status
        }
      }));

      res.json({
        logs: formattedLogs,
        pagination: {
          total,
          page: safePage,
          limit,
          totalPages
        }
      });
    } catch (err) {
      console.error('Failed to fetch logs:', err.message);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  }
);

// ----------------- Error handler -----------------
// Centralized error handling (sanitized for production)
app.use((err, req, res, next) => {
  // Log error with request context for debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      path: req.path,
      method: req.method,
      requestId: req.id,
      timestamp: new Date().toISOString()
    });
  }

  // Persist error to MongoDB for production debugging
  logger.logActivity({
    action: 'error',
    message: `Server error: ${err.message}`,
    level: 'ERROR',
    status: 'failure',
    details: {
      path: req.path,
      method: req.method,
      statusCode: err.status || 500,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    },
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
    method: req.method,
    endpoint: req.path
  });

  // Remove potentially sensitive headers
  res.removeHeader('X-Powered-By');

  // Handle CSRF errors
  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('CSRF')) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'Form submission failed security validation. Please refresh the page and try again.'
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(err.errors || {}).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'File upload failed',
      message: err.message
    });
  }

  // Default error response: NEVER send stack traces in production
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ----------------- Server bootstrap -----------------
let serverInstance = null;

async function startServer() {
  try {
    await connectMongoDB();
    const PORT = process.env.PORT || 5000;

    // Start BullMQ email notification worker
    startEmailWorker();

    const server = http.createServer(app);
    serverInstance = server;

    // Socket.io for real-time logs
    const io = new IOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    try {
      logger.attachSocket(io);
    } catch (e) {
      console.warn('Could not attach socket to logger', e.message || e);
    }

    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Failed to start server', err);
    process.exit(1);
  }
}

// Graceful shutdown handling
async function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  try {
    if (serverInstance) {
      await new Promise(resolve => serverInstance.close(resolve));
    }
    await closeEmailWorker();
    await closeEmailQueue();
    await prisma.$disconnect();
    console.log('✅ Server gracefully stopped.');
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = app;
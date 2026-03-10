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
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Validate JWT secret strength
const JWT_MIN_LENGTH = 64;
const KNOWN_WEAK_SECRETS = [
  'your_super_secret_jwt_key_here',
  'secret',
  'jwt_secret',
  'mysecret',
  'password',
  '123456',
  'change_me',
  'your_64_character_or_longer_random_secret_here_minimum_sixty_four_chars'
];

// In development, warn but don't crash for weak secrets
// In production, enforce strict validation
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < JWT_MIN_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${JWT_MIN_LENGTH} characters. Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`);
  }

  if (KNOWN_WEAK_SECRETS.includes(process.env.JWT_SECRET.toLowerCase())) {
    throw new Error('JWT_SECRET is a known weak/default value. Generate a secure random string.');
  }
  console.log('✅ JWT secret validation passed');
} else {
  // Development mode - warn but allow
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < JWT_MIN_LENGTH ||
    KNOWN_WEAK_SECRETS.includes(process.env.JWT_SECRET.toLowerCase())) {
    console.warn('⚠️  JWT_SECRET is weak or using default value. This is OK for development only.');
    console.warn('   For production, generate a secure 64+ character secret.');
  } else {
    console.log('✅ JWT secret validation passed');
  }
}

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { csrfProtection } = require('./middleware/csrf');
const http = require('http');
const { Server: IOServer } = require('socket.io');

// Database/connectors
const connectMongoDB = require('./config/mongo');
const dbUtils = require('./utils/database');
const logger = require('./utils/logger');

// Routes / controllers / middleware
const formRoutes = require('./routes/formRoutes');
const studentFormRoutes = require('./routes/StudentFormRoutes');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/uploadRoutes');     // existing upload routes (uploads/)
const uploadRoute = require('./controllers/routeUpload');  // cloudinary or user upload controller
const upload = require('./middleware/multer');             // multer middleware (if needed)
const authMiddleware = require('./middleware/auth');       // auth middleware for protected routes
const securityHeaders = require('./middleware/securityHeaders'); // HTTP security headers
const { requestContext } = require('./middleware/requestContext'); // Request ID tracking
const { validateInputLength, sanitizeInput } = require('./middleware/requestValidator'); // Input validation

const app = express();

// Trust proxies (required for Render, Railway, Heroku, etc.)
// Use '1' to trust exactly one reverse proxy hop (Render's load balancer),
// which keeps IP-based rate limiting safe while still honoring X-Forwarded-For.
app.set('trust proxy', 1);

// Add request ID tracking early in the middleware chain
app.use(requestContext);

// ----------------- CORS (must be first so preflight/OPTIONS gets headers) -----------------
const isProd = process.env.NODE_ENV === 'production';

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin) return callback(null, true);

    const allowedOrigins = [];

    // Canonical production frontend (Render <-> Vercel)
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    if (process.env.FRONTEND_URL_PREVIEW) {
      allowedOrigins.push(process.env.FRONTEND_URL_PREVIEW);
    }

    // Local development origins
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

    // In non-production, allow any localhost/127.0.0.1 (any port) as a safety net
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
  credentials: true, // Important: allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
  exposedHeaders: ['X-Request-ID'], // Headers clients can access
  optionsSuccessStatus: 200
};

// Apply CORS to all routes (Express 5 + cors handles OPTIONS internally)
app.use(cors(corsOptions));

// Cookie parser middleware (required for httpOnly cookies)
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
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // 100 requests per window
  message: {
    error: 'Too many requests',
    message: 'Please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/' && req.method === 'GET'
});
app.use('/api/', limiter);

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
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
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 form submissions per hour
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

// ----------------- Health / Basic routes -----------------
// IMPORTANT: These must be BEFORE body parsing so HEAD/GET health checks
// never encounter undefined req.body issues
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'backend',
    time: new Date().toISOString()
  });
});

// HEAD requests for health checks (Render, uptime monitors)
app.head('/', (req, res) => {
  res.status(200).end();
});

// ----------------- Body parsing -----------------
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Input sanitization & validation (after body parsing, before routes)
app.use(sanitizeInput);
app.use(validateInputLength);

// Optional: serve static uploaded files (if you store locally in 'public' or 'uploads')
// Adjust if you store in cloud (S3/Cloudinary) instead
// In serverless, these directories might not exist, so we check first
const fs = require('fs');
const uploadsPath = path.join(__dirname, 'uploads');
const publicPath = path.join(__dirname, 'public');

if (fs.existsSync(uploadsPath)) {
  app.use('/uploads', express.static(uploadsPath));
}
if (fs.existsSync(publicPath)) {
  app.use('/public', express.static(publicPath));
}

// Test Postgres connection - only available in development with strict authentication
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

// Get all users (Postgres) - Protected route, restricted to admin roles
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
// Short cache to reduce redundant DB hits while keeping data fresh
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') {
    // IMPORTANT:
    // - Any request that includes cookies or Authorization is user-specific. Never cache it.
    // - Public GETs (no auth) can be cached briefly to reduce DB load.
    const hasAuthHeader = Boolean(req.headers.authorization);
    const hasCookies = Boolean(req.headers.cookie);
    if (hasAuthHeader || hasCookies) {
      res.set('Cache-Control', 'no-store');
    } else {
      // Cache for 60 seconds, allow stale response for 30s while revalidating
      res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30');
    }
  } else {
    // No caching for mutations
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// Activity logging middleware (captures all non-admin user actions)
const activityLogger = require('./middleware/activityLogger');
app.use('/api', activityLogger);

// Auth routes (CSRF exempt for login, but protected for logout)
app.use('/api/auth', authRoutes);

// Uploads (local or specific upload route)
app.use('/api/uploads', uploadRoutes);

// Cloudinary / user upload controller (keeps the same path used in your second file)
app.use('/api/users', uploadRoute);

// Forms (MongoDB) - Apply CSRF protection to state-changing routes
app.use('/api/forms', csrfProtection, formRoutes);

// Student forms (MongoDB) - Apply CSRF protection to state-changing routes
app.use('/api/student-forms', csrfProtection, studentFormRoutes);

// CSRF token endpoint for frontend
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Admin logs - returns recent activity logs (excludes admin user actions)
app.get('/api/admin/logs',
  (req, res) => {
    try {
      const allLogs = logger.getLogs();
      // Filter to only show activity logs from non-admin users
      const activityLogs = allLogs.filter(log => {
        // Only include INFO-level logs that have user activity data
        if (log.level !== 'INFO') return false;
        if (!log.data || !log.data.role) return false;
        // Exclude admin actions
        if (log.data.role?.toLowerCase() === 'admin') return false;
        return true;
      });
      res.json({ logs: activityLogs });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  }
);

// ----------------- Error handler -----------------
// Centralized error handling (keeps the improved handling from your first version)
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

  // Remove potentially sensitive headers
  res.removeHeader('X-Powered-By');

  // Handle CSRF errors
  if (err.code === 'EBADCSRFTOKEN') {
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

  // Default error response (more info in development)
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ----------------- Server bootstrap -----------------
// In serverless / test environments we export the app and let the platform
// handle the HTTP server.
// IMPORTANT: In serverless, we should NOT connect to databases on module load
// because: 1) It slows down cold starts, 2) Connections might fail and crash the function
// Instead, connect lazily when routes are actually called (lazy initialization)
// Only connect immediately if running as a traditional server (local dev)
if (require.main === module) {
  connectMongoDB().catch((err) => {
    console.error('❌ Failed to connect MongoDB on startup', err);
    // In local dev, we can exit if DB connection fails
    process.exit(1);
  });
}
// In serverless, MongoDB will connect on first route that needs it

// When running this file directly (local dev), start the HTTP server
async function startServer() {
  try {
    await connectMongoDB();
    const PORT = process.env.PORT || 5000;

    const server = http.createServer(app);
    // Socket.io for real-time logs
    const io = new IOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Attach socket instance to logger so logger can emit events
    try {
      logger.attachSocket(io);
    } catch (e) {
      console.warn('Could not attach socket to logger', e.message || e);
    }

    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Failed to start server', err);
    // In local dev it's okay to exit; in serverless this path isn't used.
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
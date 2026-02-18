// server.js
// Only load dotenv in local development (not in Vercel/serverless)
// Vercel automatically injects environment variables into process.env
// Check multiple conditions to ensure we're not in Vercel
if (!process.env.VERCEL && !process.env.VERCEL_ENV && process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ quiet: true }); // Suppress dotenv logs
}

// Validate critical environment variables
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
}

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const rateLimit = require('express-rate-limit');

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

const app = express();

// ----------------- CORS (must be first so preflight/OPTIONS gets headers) -----------------
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://reimbursement-automation-system-new-nu.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174',
      'http://localhost:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5000'
    ];
    if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Removed wildcard *.vercel.app — only the exact production frontend URL is allowed

    // In development, allow any localhost/127.0.0.1 (any port)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const u = new URL(origin);
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return callback(null, true);
      } catch (_) { }
    }

    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// ----------------- Response Compression -----------------
app.use(compression());

// ----------------- Security Middleware -----------------
app.use(securityHeaders);

// Rate limiting for API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ----------------- Body parsing -----------------
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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

// ----------------- Health / Basic routes -----------------
// Health check root (safe for production - no config leakage)
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'backend',
    time: new Date().toISOString()
  });
});

// Test Postgres connection - only available in development
if (process.env.NODE_ENV !== 'production') {
  app.get('/test-db', async (req, res) => {
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

  // Debug endpoint (Postgres) - only available in development
  app.get('/api/debug/user/:moodleId', async (req, res) => {
    try {
      const { moodleId } = req.params;
      const user = await dbUtils.getUserForLogin(moodleId);
      res.json({
        moodleId,
        userFound: !!user,
        user: user
      });
    } catch (error) {
      res.status(500).json({ error: 'Debug failed', details: error.message });
    }
  });
}

// Get all users (Postgres) - Protected route
app.get('/api/users', authMiddleware.verifyToken, async (req, res) => {
  try {
    const users = await dbUtils.getAllUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users', details: error.message });
  }
});

// ----------------- API Routes -----------------
// Cache-Control middleware for read-only GET endpoints
// Short cache to reduce redundant DB hits while keeping data fresh
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') {
    // Cache for 60 seconds, allow stale response for 30s while revalidating
    res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30');
  } else {
    // No caching for mutations
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// Auth
app.use('/api/auth', authRoutes);

// Uploads (local or specific upload route)
app.use('/api/uploads', uploadRoutes);

// Cloudinary / user upload controller (keeps the same path used in your second file)
app.use('/api/users', uploadRoute);

// Forms (MongoDB)
app.use('/api/forms', formRoutes);

// Student forms (MongoDB)
app.use('/api/student-forms', studentFormRoutes);

// ----------------- Error handler -----------------
// Centralized error handling (keeps the improved handling from your first version)
app.use((err, req, res, next) => {
  console.error(err.stack);

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

  // Default error response — never leak internal details in production
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
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
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
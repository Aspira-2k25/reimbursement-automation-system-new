// server.js
// Only load dotenv in local development (not in Vercel/serverless)
// Vercel automatically injects environment variables into process.env
// Check multiple conditions to ensure we're not in Vercel
if (!process.env.VERCEL && !process.env.VERCEL_ENV && process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ quiet: true }); // Suppress dotenv logs
}
const express = require('express');
const cors = require('cors');
const path = require('path');

// Database/connectors
const connectMongoDB = require('./config/mongo');
const dbUtils = require('./utils/database');

// Routes / controllers / middleware
const formRoutes = require('./routes/formRoutes');
const studentFormRoutes = require('./routes/StudentFormRoutes');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/uploadRoutes');     // existing upload routes (uploads/)
const uploadRoute = require('./controllers/routeUpload');  // cloudinary or user upload controller
const upload = require('./middleware/multer');             // multer middleware (if needed)

const app = express();

// ----------------- Middleware -----------------
// CORS configuration - allow frontend domain from environment variable
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);

    // Build list of allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174',
      'http://localhost:5000'
    ];

    // Add FRONTEND_URL if set
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow all Vercel preview/production deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Block other origins in production
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
// Health check root
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'backend',
    time: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasMongoUri: !!process.env.MONGO_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV || 'not set',
      isVercel: !!process.env.VERCEL,
      // Don't expose actual values, just check if they exist
      envVarCount: Object.keys(process.env).filter(key =>
        key.includes('DATABASE') ||
        key.includes('MONGO') ||
        key.includes('JWT') ||
        key.includes('CLOUDINARY')
      ).length
    }
  });
});

// Test Postgres connection
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

// Get all users (Postgres)
app.get('/api/users', async (req, res) => {
  try {
    const users = await dbUtils.getAllUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users', details: error.message });
  }
});

// Debug endpoint (Postgres)
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

// ----------------- API Routes -----------------
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

  // Default error response (more info in development)
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
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
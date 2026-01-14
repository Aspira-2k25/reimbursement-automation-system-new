// server.js
require('dotenv').config();
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional: serve static uploaded files (if you store locally in 'public' or 'uploads')
// Adjust if you store in cloud (S3/Cloudinary) instead
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ----------------- Health / Basic routes -----------------
// Health check root
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'backend', time: new Date().toISOString() });
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
// handle the HTTP server. We still want to establish a Mongo connection once
// on cold start, but we must not crash the process on failure.
connectMongoDB().catch((err) => {
  console.error('❌ Failed to connect MongoDB on startup', err);
  // Let the Express error handler respond with 500 instead of exiting.
});

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
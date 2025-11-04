require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectMongoDB = require("./config/mongo");
const formRoutes = require("./routes/formRoutes");
const studentFormRoutes = require("./routes/StudentFormRoutes");
const dbUtils = require('./utils/database');
const authRoutes = require('./routes/auth');
const upload = require('./middleware/multer');
const uploadRoute = require('./controllers/routeUpload')

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cloudinary
app.use('/api/users', uploadRoute);

// Test database connection (Postgres)
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

// Auth routes
app.use('/api/auth', authRoutes);

// Form routes (MongoDB)
app.use("/api/forms", formRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Connect MongoDB before starting server
connectMongoDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error("❌ Failed to connect MongoDB", err);
});

app.use("/api/student-forms", studentFormRoutes);

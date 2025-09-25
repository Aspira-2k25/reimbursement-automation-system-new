const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const dbUtils = require('./utils/database');

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const result = await dbUtils.testConnection();
    if (result.success) {
      res.json({
        message: 'Database connected successfully!',
        timestamp: result.timestamp
      });
    } else {
      res.status(500).json({ error: 'Database connection failed', details: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// Get all users (for testing)
app.get('/api/users', async (req, res) => {
  try {
    const users = await dbUtils.getAllUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users', details: error.message });
  }
});

// Debug endpoint to test getUserForLogin
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

// Import routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
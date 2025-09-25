const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbUtils = require('../utils/database');

const authController = {
  // Login function
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      // Basic validation
      if (!username || !password) {
        return res.status(400).json({
          error: 'Username and password are required'
        });
      }

      // Get staff from database by username
      const user = await dbUtils.getStaffForLogin(username);

      console.log('Login attempt for username:', username);
      console.log('User found:', user ? 'Yes' : 'No');

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          error: 'Account is deactivated'
        });
      }

      // Compare provided password with stored value (plain text)
      if (password !== user.password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login time
      await dbUtils.updateLastLogin(user.id);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Return user data (without sensitive information)
      res.json({
        message: 'Login successful',
        token,
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
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Register function
  register: async (req, res) => {
    try {
      const { username, name, department, role, email, password } = req.body;

      // Basic validation
      if (!username || !name || !password) {
        return res.status(400).json({
          error: 'Username, name, and password are required'
        });
      }

      // Check if user already exists
      const existingUser = await dbUtils.getStaffByUsername(username);
      if (existingUser) {
        return res.status(409).json({
          error: 'User with this username already exists'
        });
      }

      // Store password as provided (plain text)

      // Insert new user
      const query = `
        INSERT INTO staff (
          username,
          name,
          department,
          role,
          email,
          password
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, username, name, department, role, email
      `;

      const pool = require('../config/database');
      const result = await pool.query(query, [
        username,
        name,
        department || null,
        role || 'student',
        email || null,
        password
      ]);

      const newUser = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username, role: newUser.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: newUser
      });

    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const userId = req.user?.userId; // From JWT middleware

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
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

  // Logout function (client-side token removal)
  logout: async (req, res) => {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just return a success message
      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// List all staff
authController.getAllStaff = async (req, res) => {
  try {
    const staff = await dbUtils.getAllStaff();
    res.json({ staff });
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


module.exports = authController;
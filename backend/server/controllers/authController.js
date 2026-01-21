const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbUtils = require('../utils/database');
const prisma = require('../config/prisma');

const authController = {
  // Login function
  // Login function
  login: async (req, res, next) => {
    try {
      // User is already authenticated and attached by validationMiddleware
      const user = req.user;

      if (!user) {
        // Should not happen if middleware works correctly
        return res.status(500).json({ error: 'Authentication failed internally' });
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
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Google login - verify credential and map to role via DB
  googleLogin: async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: 'Missing Google credential' });
      }

      // Verify the Google ID token (Node 18+ has global fetch)
      const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (!resp.ok) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }
      const payload = await resp.json();
      const email = payload?.email;
      const name = payload?.name || 'Google User';
      if (!email) {
        return res.status(400).json({ error: 'Google token missing email' });
      }

      // Validate email domain - only allow apsit.edu.in domain
      const allowedDomain = 'apsit.edu.in';
      if (!email.toLowerCase().endsWith(`@${allowedDomain}`)) {
        return res.status(403).json({
          error: `Please sign in with your institutional email.`
        });
      }

      // Look up staff by email to determine role; default to Student
      const staff = await dbUtils.getStaffByEmail(email);
      const role = staff?.role || 'Student';
      // Use staff ID if found, otherwise use email as userId for Google users
      const userId = staff?.id || email;

      const token = jwt.sign(
        { userId, email, role, name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      return res.json({ token, user: { id: userId, email, name, role } });
    } catch (error) {
      console.error('Google login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Register function - Create new user via API (Postman)
  register: async (req, res) => {
    try {
      const { username, name, department, role, email, password, employee_id } = req.body;

      // Basic validation
      if (!username || !name || !password) {
        return res.status(400).json({
          error: 'Username, name, and password are required'
        });
      }

      // Validate email format if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format'
        });
      }

      // Check if user already exists by username
      const existingUserByUsername = await prisma.staff.findUnique({
        where: { username: username }
      });
      if (existingUserByUsername) {
        return res.status(409).json({
          error: 'User with this username already exists'
        });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingUserByEmail = await prisma.staff.findUnique({
          where: { email: email }
        });
        if (existingUserByEmail) {
          return res.status(409).json({
            error: 'User with this email already exists'
          });
        }
      }

      // Hash password before storing
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user using Prisma
      const newUser = await prisma.staff.create({
        data: {
          username: username.trim(),
          name: name.trim(),
          password: hashedPassword, // Store hashed password, not plain text
          email: email ? email.trim() : null,
          department: department || null,
          role: role || 'Faculty',
          employee_id: employee_id || null,
          is_active: true,
        },
        select: {
          id: true,
          username: true,
          name: true,
          department: true,
          role: true,
          email: true,
          employee_id: true,
          is_active: true,
          created_at: true,
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username, role: newUser.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: newUser
      });

    } catch (error) {
      console.error('Register error:', error);

      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        return res.status(409).json({
          error: `User with this ${field} already exists`
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

  // Update user profile (limited fields)
  updateProfile: async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { name, department, email } = req.body || {};

      // Basic validation
      if (email !== undefined && email !== null) {
        const emailStr = String(email).trim();
        if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
          return res.status(400).json({ error: 'Invalid email address' });
        }
      }

      const updated = await dbUtils.updateStaffProfile(userId, {
        name,
        department,
        email
      });

      if (!updated) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      return res.json({ message: 'Profile updated', user: updated });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Internal server error' });
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

// Create user endpoint (for admin/user creation via Postman)
// Similar to register but doesn't auto-login the user
authController.createUser = async (req, res) => {
  try {
    const { username, name, department, role, email, password, employee_id } = req.body;

    // Basic validation
    if (!username || !name || !password) {
      return res.status(400).json({
        error: 'Username, name, and password are required'
      });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Check if user already exists by username
    const existingUserByUsername = await prisma.staff.findUnique({
      where: { username: username }
    });
    if (existingUserByUsername) {
      return res.status(409).json({
        error: 'User with this username already exists'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingUserByEmail = await prisma.staff.findUnique({
        where: { email: email }
      });
      if (existingUserByEmail) {
        return res.status(409).json({
          error: 'User with this email already exists'
        });
      }
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user using Prisma
    const newUser = await prisma.staff.create({
      data: {
        username: username.trim(),
        name: name.trim(),
        password: hashedPassword,
        email: email ? email.trim() : null,
        department: department || null,
        role: role || 'Faculty',
        employee_id: employee_id || null,
        is_active: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        department: true,
        role: true,
        email: true,
        employee_id: true,
        is_active: true,
        created_at: true,
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Create user error:', error);

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(409).json({
        error: `User with this ${field} already exists`
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message, // Debugging
      stack: error.stack // Debugging
    });
  }
};


module.exports = authController;
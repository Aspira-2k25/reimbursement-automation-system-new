const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateLogin, validateRegister } = require('../middleware/validation');

// Public routes (no authentication required)
router.post('/login', validateLogin, authController.login);
router.post('/google', authController.googleLogin);
router.post('/logout', verifyToken, authController.logout);


// Protected routes (authentication required)
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.get('/staff', verifyToken, authController.getAllStaff);
router.get('/staff/department/:department', verifyToken, authController.getStaffByDepartment);

// Create user endpoint — restricted to Principal only
router.post('/create-user', verifyToken, requireRole(['Principal']), validateRegister, authController.createUser);

// Test route for checking authentication (redacted — only returns role, no token details)
router.get('/test-auth', verifyToken, (req, res) => {
  res.json({
    message: 'Authentication successful',
    role: req.user.role
  });
});

module.exports = router;
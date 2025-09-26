const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { validateLogin, validateRegister } = require('../middleware/validation');

// Public routes (no authentication required)
router.post('/login', validateLogin, authController.login);
router.post('/register', validateRegister, authController.register);
router.post('/google', authController.googleLogin);


// Protected routes (authentication required)
router.get('/profile', verifyToken, authController.getProfile);
router.get('/staff', verifyToken, authController.getAllStaff);
router.get('/staff/department/:department', verifyToken, authController.getStaffByDepartment);


// Test route for checking authentication
router.get('/test-auth', verifyToken, (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: req.user
  });
});

module.exports = router;
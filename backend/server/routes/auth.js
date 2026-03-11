const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');
const { validateLogin, validateRegister } = require('../middleware/validation');

// Public routes (no authentication required)
router.post('/login', validateLogin, authController.login);
// /register removed — user creation is restricted to Principal via /create-user
router.post('/google', authController.googleLogin);
router.post('/logout', verifyToken, csrfProtection, authController.logout);

// Password Reset & Change routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password/request-otp', verifyToken, authController.requestChangePasswordOtp);
router.post('/change-password/verify', verifyToken, authController.verifyChangePassword);

// Protected routes (authentication required)
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, csrfProtection, authController.updateProfile);
router.get('/staff', verifyToken, authController.getAllStaff);
router.get('/staff/department/:department', verifyToken, authController.getStaffByDepartment);

// Create user endpoint — restricted to Admin role only
router.post('/create-user', verifyToken, csrfProtection, requireRole(['Admin']), validateRegister, authController.createUser);

// Admin routes for faculty management (secured - Admin role required)
router.get('/admin/faculty', verifyToken, requireRole(['Admin']), authController.getFacultyList);
router.get('/admin/faculty/:id', verifyToken, requireRole(['Admin']), authController.getStaffById);
router.put('/admin/faculty/:id', verifyToken, csrfProtection, requireRole(['Admin']), authController.updateStaffById);
router.post('/admin/faculty', verifyToken, csrfProtection, requireRole(['Admin']), authController.createFaculty);
router.delete('/admin/faculty/:id', verifyToken, csrfProtection, requireRole(['Admin']), authController.deleteFaculty);


// Test route for checking authentication
router.get('/test-auth', verifyToken, (req, res) => {
  res.json({
    message: 'Authentication successful',
    role: req.user.role
  });
});

module.exports = router;
const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');
const { verifyToken } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

// Public routes (no authentication required)
router.post('/forgot-password', passwordController.forgotPassword);
router.post('/reset-password', passwordController.resetPassword);

// Protected routes (authentication required)
router.post('/send-otp', verifyToken, csrfProtection, passwordController.sendOtp);
router.post('/change-password', verifyToken, csrfProtection, passwordController.changePassword);

module.exports = router;

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { sendPasswordResetEmail, sendOtpEmail } = require('../utils/emailService');

// Token expiry: 15 minutes, OTP expiry: 5 minutes
const RESET_TOKEN_EXPIRY_MIN = 15;
const OTP_EXPIRY_MIN = 5;

const passwordController = {
  /**
   * POST /api/password/forgot-password
   * Public — validates email, generates reset token, sends email
   */
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }

      const trimmedEmail = email.trim().toLowerCase();

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if user exists
      const staff = await prisma.staff.findUnique({
        where: { email: trimmedEmail },
        select: { id: true, email: true, is_active: true }
      });

      if (!staff || !staff.is_active) {
        // Return generic message to prevent email enumeration
        return res.json({ message: 'If the email is registered, a password reset link has been sent.' });
      }

      // Delete any existing reset tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email: trimmedEmail }
      });

      // Generate cryptographically secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiryTime = new Date(Date.now() + RESET_TOKEN_EXPIRY_MIN * 60 * 1000);

      // Store reset token
      await prisma.passwordResetToken.create({
        data: {
          email: trimmedEmail,
          token,
          expiry_time: expiryTime
        }
      });

      // Build reset link
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;

      // Send email (non-blocking — we respond regardless of email outcome)
      const emailResult = await sendPasswordResetEmail(trimmedEmail, resetLink);

      if (!emailResult.success) {
        console.error('Failed to send password reset email:', emailResult.error);
      }

      res.json({ message: 'If the email is registered, a password reset link has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * POST /api/password/reset-password
   * Public — validates token, updates password
   */
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'Token, new password, and confirm password are required' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New password and confirm password do not match' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      // Find valid token
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token }
      });

      if (!resetToken) {
        return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
      }

      // Check expiry
      if (new Date() > new Date(resetToken.expiry_time)) {
        // Clean up expired token
        await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
        return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password in staff table
      await prisma.staff.update({
        where: { email: resetToken.email },
        data: { password: hashedPassword }
      });

      // Delete the used token (single-use)
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

      res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * POST /api/password/send-otp
   * Protected — sends OTP to authenticated user's email
   */
  sendOtp: async (req, res) => {
    try {
      const userEmail = req.user?.email;

      if (!userEmail) {
        return res.status(400).json({ error: 'User email not found. Please update your profile with a valid email.' });
      }

      // Delete any existing OTPs for this email
      await prisma.otpVerification.deleteMany({
        where: { email: userEmail }
      });

      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiryTime = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

      // Store OTP
      await prisma.otpVerification.create({
        data: {
          email: userEmail,
          otp,
          expiry_time: expiryTime
        }
      });

      // Send OTP email
      const emailResult = await sendOtpEmail(userEmail, otp);

      if (!emailResult.success) {
        console.error('Failed to send OTP email:', emailResult.error);
        return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
      }

      res.json({ message: 'OTP has been sent to your registered email address.' });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * POST /api/password/change-password
   * Protected — validates old password, OTP, and updates password
   */
  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword, confirmPassword, otp } = req.body;
      const userId = req.user?.userId;
      const userEmail = req.user?.email;

      if (!oldPassword || !newPassword || !confirmPassword || !otp) {
        return res.status(400).json({ error: 'All fields are required: old password, new password, confirm password, and OTP' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New password and confirm password do not match' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      if (!userEmail) {
        return res.status(400).json({ error: 'User email not found in session' });
      }

      // Get current user with password
      const staff = await prisma.staff.findUnique({
        where: { id: typeof userId === 'number' ? userId : parseInt(userId, 10) },
        select: { id: true, password: true, email: true }
      });

      if (!staff) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify old password
      const isOldPasswordValid = await bcrypt.compare(oldPassword, staff.password);
      if (!isOldPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Verify OTP
      const otpRecord = await prisma.otpVerification.findFirst({
        where: { email: userEmail },
        orderBy: { created_at: 'desc' }
      });

      if (!otpRecord) {
        return res.status(400).json({ error: 'No OTP found. Please request a new OTP.' });
      }

      if (otpRecord.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
      }

      if (new Date() > new Date(otpRecord.expiry_time)) {
        // Clean up expired OTP
        await prisma.otpVerification.delete({ where: { id: otpRecord.id } });
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.staff.update({
        where: { id: staff.id },
        data: { password: hashedPassword }
      });

      // Delete used OTP (single-use)
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } });

      res.json({ message: 'Password changed successfully.' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = passwordController;

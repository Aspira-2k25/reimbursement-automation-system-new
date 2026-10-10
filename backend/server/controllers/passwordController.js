const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { sendPasswordResetEmail } = require('../utils/emailService');
const otpService = require('../utils/otpService');

// Token expiry: 15 minutes, OTP expiry: 5 minutes
const RESET_TOKEN_EXPIRY_MIN = 15;


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

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
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

      // Get staff details for logging
      const staffToUpdate = await prisma.staff.findUnique({
        where: { email: resetToken.email },
        select: { id: true, name: true, username: true, email: true, role: true, department: true, is_active: true }
      });

      if (!staffToUpdate || !staffToUpdate.is_active) {
        console.error('Staff not found for email in reset token:', resetToken.email);
        return res.status(404).json({ error: 'User not found for password reset.' });
      }

      // Update password in staff table
      await prisma.$transaction(async (transaction) => {
        // Consume once and revoke every refresh family in the same commit as the password change.
        await transaction.passwordResetToken.delete({ where: { id: resetToken.id } });
        await transaction.staff.update({ where: { id: staffToUpdate.id }, data: { password: hashedPassword, sessions_revoked_at: new Date() } });
        await transaction.refreshToken.updateMany({
          where: { userId: { in: [String(staffToUpdate.id), staffToUpdate.email] }, revokedAt: null },
          data: { revokedAt: new Date() }
        });
      });

      logger.logActivity({
        action: 'password_change',
        message: 'User reset password successfully',
        userId: String(staffToUpdate.id),
        userName: staffToUpdate.name || staffToUpdate.username || staffToUpdate.email || 'Unknown',
        role: staffToUpdate.role || 'Unknown',
        department: staffToUpdate.department || '',
        status: 'success',
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });


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
      const id = Number(req.user?.userId);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(403).json({ error: 'Password verification requires a staff account.' });
      const staff = await prisma.staff.findUnique({ where: { id }, select: { email: true, is_active: true } });
      if (!staff?.is_active || !staff.email) return res.status(403).json({ error: 'An active account with a registered email is required.' });
      const result = await otpService.issue({ email: staff.email, purpose: 'password' });
      return res.status(result.status || 200).json(result);
    } catch (error) { return otpService.failure(error, res); }
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

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' });
      }

      if (!userEmail) {
        return res.status(400).json({ error: 'User email not found in session' });
      }

      if (!Number.isSafeInteger(Number(userId)) || Number(userId) <= 0) {
        return res.status(400).json({ error: 'Password changes require a staff account' });
      }
      // Get current user with password
      const staff = await prisma.staff.findUnique({
        where: { id: typeof userId === 'number' ? userId : parseInt(userId, 10) },
        select: { id: true, password: true, email: true, is_active: true }
      });

      if (!staff || !staff.is_active) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify old password
      const isOldPasswordValid = await bcrypt.compare(oldPassword, staff.password);
      if (!isOldPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      if (!/^\d{6}$/.test(String(otp))) return res.status(400).json({ error: 'Enter the six-digit OTP.' });
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const result = await otpService.transaction(async transaction => {
        const current = await transaction.staff.findUnique({ where: { id: staff.id }, select: { password: true, email: true, is_active: true } });
        if (!current?.is_active || current.password !== staff.password || current.email !== staff.email) return { status: 409, error: 'Account changed. Sign in and request a new code.' };
        const error = await otpService.consume(transaction, { email: staff.email, purpose: 'password', otp });
        if (error) return error;
        await transaction.staff.update({ where: { id: staff.id }, data: { password: hashedPassword, sessions_revoked_at: new Date() } });
        await transaction.refreshToken.updateMany({ where: { userId: { in: [String(staff.id), staff.email] }, revokedAt: null }, data: { revokedAt: new Date() } });
        return {};
      });
      if (result.error) return res.status(result.status).json(result);

      logger.logActivity({
        action: 'password_change',
        message: 'User changed password successfully',
        userId: String(req.user?.userId || staff.id),
        userName: staff.name || req.user?.username || staff.email || 'Unknown',
        role: req.user?.role || 'Unknown',
        department: req.user?.department || '',
        status: 'success',
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });


      res.json({ message: 'Password changed successfully.' });
    } catch (error) {
      return otpService.failure(error, res);
    }
  }
};

module.exports = passwordController;

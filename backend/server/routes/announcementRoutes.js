const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const SystemAnnouncement = require('../models/SystemAnnouncement');
const { audienceRoles, reminderRecipients, sendReminderEmails } = require('../utils/reminderEmail');

/**
 * GET /api/announcements/active
 * Returns the latest active announcement.
 * If ?role= query param is provided, only returns announcements targeted at that role
 * (or announcements with empty targetRoles = show to everyone).
 */
router.get('/active', authMiddleware.verifyToken, async (req, res) => {
  try {
    const userRole = req.query.role || req.user?.role || '';

    // Build filter: active + (targetRoles is empty OR includes userRole)
    const filter = {
      isActive: true,
      $or: [
        { targetRoles: { $size: 0 } },
        { targetRoles: { $elemMatch: { $eq: userRole } } }
      ]
    };

    const announcement = await SystemAnnouncement.findOne(filter)
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ announcement: announcement || null });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

/**
 * PUT /api/announcements
 * Create or update the global announcement.
 * Restricted to HOD, Principal, and Admin roles.
 */
router.put(
  '/',
  authMiddleware.verifyToken,
  authMiddleware.requireRole(['HOD', 'Principal', 'Admin']),
  async (req, res) => {
    try {
      const { message, isActive, targetRoles } = req.body;

      if (message !== undefined) {
        if (typeof message !== 'string' || message.trim().length === 0) {
          return res.status(400).json({ error: 'Message must be a non-empty string.' });
        }
        if (message.length > 500) {
          return res.status(400).json({ error: 'Message must be 500 characters or fewer.' });
        }
      }

      // Validate targetRoles — must be an array of strings if provided
      let normalizedRoles = [];
      if (targetRoles !== undefined) {
        if (!Array.isArray(targetRoles)) {
          return res.status(400).json({ error: 'targetRoles must be an array.' });
        }
        normalizedRoles = [...new Set(targetRoles.map(r => String(r).trim()).filter(Boolean))];
        if (normalizedRoles.some(role => !audienceRoles.includes(role))) {
          return res.status(400).json({ error: 'Unsupported reminder audience.' });
        }
      }

      const updatedBy = req.user.name || req.user.email || req.user.username || 'Unknown';
      const updatedByRole = req.user.role;
      const previous = await SystemAnnouncement.findOne({}).sort({ updatedAt: -1 }).lean();
      const active = isActive !== undefined ? Boolean(isActive) : true;
      const changed = !previous || !previous.isActive || previous.message !== message?.trim()
        || JSON.stringify([...(previous.targetRoles || [])].sort()) !== JSON.stringify([...normalizedRoles].sort());
      const shouldEmail = active && changed && Boolean(message?.trim());
      if (shouldEmail && !require('../utils/emailService').isSmtpConfigured()) {
        return res.status(503).json({ error: 'Email is not configured. Reminder was not saved.' });
      }
      const recipients = shouldEmail ? await reminderRecipients(normalizedRoles) : [];

      // Upsert: update the single announcement document, or create it if none exists
      const announcement = await SystemAnnouncement.findOneAndUpdate(
        {},
        {
          message: message !== undefined ? message.trim() : '',
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          targetRoles: normalizedRoles,
          updatedBy,
          updatedByRole
        },
        { new: true, upsert: true, sort: { updatedAt: -1 } }
      );

      let email = { recipients: recipients.length, status: shouldEmail ? 'sending' : 'not_needed' };
      if (shouldEmail) {
        const delivery = sendReminderEmails(recipients, announcement);
        if (process.env.VERCEL || process.env.VERCEL_ENV) {
          email = { ...email, status: 'completed', ...await delivery };
        } else {
          delivery.then(result => console.info('Reminder email delivery:', result))
            .catch(() => console.error('Reminder email delivery failed'));
        }
      }
      res.json({ announcement, email, message: 'Announcement updated successfully.' });
    } catch (error) {
      console.error('Error updating announcement:', error);
      res.status(500).json({ error: 'Failed to update announcement' });
    }
  }
);

module.exports = router;

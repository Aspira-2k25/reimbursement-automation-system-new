const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const notificationService = require('../utils/notificationService');

// GET /api/notifications - Get user's notifications
router.get(
  '/',
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.userId || req.user.email || req.user.id;
      const { limit, unreadOnly } = req.query;

      const notifications = await notificationService.getUserNotifications(userId, {
        limit: Math.min(Math.max(parseInt(limit) || 50, 1), 100),
        unreadOnly: unreadOnly === 'true',
      });

      res.json({ notifications });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
    }
  }
);

// GET /api/notifications/unread-count - Get unread count
router.get(
  '/unread-count',
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.userId || req.user.email || req.user.id;
      const count = await notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count', details: error.message });
    }
  }
);

// PUT /api/notifications/:id/read - Mark notification as read
router.put(
  '/:id/read',
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.userId || req.user.email || req.user.id;

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid notification ID format' });
      }

      const notification = await notificationService.markAsRead(req.params.id, userId);

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({ notification });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read', details: error.message });
    }
  }
);

// PUT /api/notifications/read-all - Mark all notifications as read
router.put(
  '/read-all',
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.userId || req.user.email || req.user.id;
      const result = await notificationService.markAllAsRead(userId);
      res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read', details: error.message });
    }
  }
);

module.exports = router;
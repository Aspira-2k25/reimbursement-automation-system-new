const Notification = require('../models/Notification');
const emailService = require('./emailService');
const { queueEmailNotification } = require('../queues/emailQueue');
const { processEmailJob } = require('../workers/emailWorker');
const he = require('he');

// Create notification and send email via job queue (with direct execution fallback)
const createNotification = async (notificationData, sendEmailNotification = true) => {
  try {
    // Ensure userId is a string (Notification schema requires String)
    const userId = String(notificationData.userId || '');

    if (!userId) {
      throw new Error('userId is required for notification');
    }

    // Create notification in database
    const notification = new Notification({
      userId: userId,
      applicationId: notificationData.applicationId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      phase: notificationData.phase,
      status: notificationData.status,
      metadata: notificationData.metadata || {},
    });

    await notification.save();

    // Send email via BullMQ job queue
    if (sendEmailNotification && notificationData.userEmail) {
      const emailPayload = {
        notificationId: String(notification._id),
        userId: userId,
        userEmail: notificationData.userEmail,
        userName: notificationData.userName || 'User',
        type: notificationData.type,
        applicationId: notificationData.applicationId,
        studentId: notificationData.studentId,
        amount: notificationData.amount,
        phase: notificationData.phase,
        status: notificationData.status,
        remarks: notificationData.remarks,
        title: notificationData.title,
        message: notificationData.message
      };

      try {
        // Try BullMQ async job queue first
        await queueEmailNotification(emailPayload);
      } catch (queueErr) {
        // Fallback: If Redis/Queue is unavailable in local dev, process directly in background
        if (emailService.isSmtpConfigured()) {
          processEmailJob({ data: emailPayload, id: `direct-${Date.now()}` }).catch(err => {
            console.warn('Direct background email notification failed:', err.message);
          });
        }
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get notifications for a user
const getUserNotifications = async (userId, options = {}) => {
  try {
    const { limit = 50, unreadOnly = false } = options;
    const userIdStr = String(userId || '');

    // Direct string equality match against normalized userId
    const query = { userId: userIdStr };

    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Mark notification as read
const markAsRead = async (notificationId, userId) => {
  try {
    const userIdStr = String(userId || '');

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        userId: userIdStr
      },
      { read: true },
      { new: true }
    );

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read for a user
const markAllAsRead = async (userId) => {
  try {
    const userIdStr = String(userId || '');

    const result = await Notification.updateMany(
      {
        userId: userIdStr,
        read: false
      },
      { read: true }
    );

    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Get unread count
const getUnreadCount = async (userId) => {
  try {
    const userIdStr = String(userId || '');

    const count = await Notification.countDocuments({
      userId: userIdStr,
      read: false
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
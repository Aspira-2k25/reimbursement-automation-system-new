const Notification = require('../models/Notification');
const emailService = require('./emailService');
const he = require('he');

// Create notification and send email
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

    // Send email in background so HTTP response is not blocked (avoids ~60s SMTP timeout delaying form submit/approve)
    if (sendEmailNotification && notificationData.userEmail) {
      if (!emailService.isSmtpConfigured()) {
        console.warn('Notification saved but email skipped: RESEND_API_KEY not set on server.');
      } else {
      const sendEmailInBackground = async () => {
        try {
          let emailResult = { success: false };

          if (notificationData.type === 'approval') {
            emailResult = await emailService.sendApprovalEmail(
              {
                name: notificationData.userName || 'User',
                email: notificationData.userEmail,
                applicationId: notificationData.applicationId,
                studentId: notificationData.studentId,
                amount: notificationData.amount,
                status: notificationData.status,
                remarks: notificationData.remarks,
              },
              notificationData.phase
            );
          } else if (notificationData.type === 'rejection') {
            emailResult = await emailService.sendRejectionEmail(
              {
                name: notificationData.userName || 'User',
                email: notificationData.userEmail,
                applicationId: notificationData.applicationId,
                studentId: notificationData.studentId,
                amount: notificationData.amount,
                status: notificationData.status,
              },
              notificationData.phase,
              notificationData.remarks
            );
          } else if (notificationData.type === 'submission') {
            emailResult = await emailService.sendSubmissionEmail({
              name: notificationData.userName || 'User',
              email: notificationData.userEmail,
              applicationId: notificationData.applicationId,
              studentId: notificationData.studentId,
              amount: notificationData.amount,
            });
          } else {
            emailResult = await emailService.sendEmail(
              notificationData.userEmail,
              notificationData.title || `Application Update: ${notificationData.applicationId}`,
              `<p>Dear ${he.encode(notificationData.userName || 'User')},</p><p>${he.encode(notificationData.message || '')}</p><p>Status: ${he.encode(notificationData.status || '')}</p>`
            );
          }

          if (emailResult && emailResult.success) {
            notification.emailSent = true;
            await notification.save();
          } else {
            console.warn('Notification created but email delivery failed:', emailResult?.error || 'Unknown error');
          }
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      };
      sendEmailInBackground();
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

    // Convert userId to string for query (Notification schema stores as String)
    const userIdStr = String(userId || '');

    // Try multiple formats to handle different userId types
    const query = {
      $or: [
        { userId: userIdStr },
        { userId: userId },
        { userId: Number(userId) }
      ]
    };

    // Add read filter if unreadOnly is true
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Mark notification as read
const markAsRead = async (notificationId, userId) => {
  try {
    // Convert userId to string for query
    const userIdStr = String(userId || '');

    // Try multiple formats to handle different userId types
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        $or: [
          { userId: userIdStr },
          { userId: userId },
          { userId: Number(userId) }
        ]
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
    // Convert userId to string for query
    const userIdStr = String(userId || '');

    // Try multiple formats to handle different userId types
    const result = await Notification.updateMany(
      {
        $or: [
          { userId: userIdStr },
          { userId: userId },
          { userId: Number(userId) }
        ],
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
    // Convert userId to string for query
    const userIdStr = String(userId || '');

    // Try multiple formats to handle different userId types
    const count = await Notification.countDocuments({
      $or: [
        { userId: userIdStr },
        { userId: userId },
        { userId: Number(userId) }
      ],
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
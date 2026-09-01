const Notification = require('../models/Notification');
const emailService = require('./emailService');
const { addEmailJob } = require('../queues/emailQueue');
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

    // Send email via Redis queue (BullMQ) or fallback in background
    if (sendEmailNotification && notificationData.userEmail) {
      if (!emailService.isSmtpConfigured()) {
        console.warn('Notification saved but email skipped: RESEND_API_KEY not set on server.');
      } else {
        // Attempt to queue job via BullMQ
        const job = await addEmailJob('send-notification', {
          ...notificationData,
          notificationId: notification._id.toString()
        });

        // If queue not available (e.g. no Redis in local dev), run direct background execution
        if (!job) {
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
              } else if (notificationData.type === 'reimbursed') {
                emailResult = await emailService.sendReimbursedEmail({
                  name: notificationData.userName || 'User',
                  email: notificationData.userEmail,
                  applicationId: notificationData.applicationId,
                  studentId: notificationData.studentId,
                  amount: notificationData.amount,
                  status: notificationData.status,
                  remarks: notificationData.remarks,
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
    const query = { userId: String(userId || '') };

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
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        userId: String(userId || '')
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
    const result = await Notification.updateMany(
      {
        userId: String(userId || ''),
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
    const count = await Notification.countDocuments({
      userId: String(userId || ''),
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
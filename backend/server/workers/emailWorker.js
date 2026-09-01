/**
 * BullMQ Dedicated Email Notification Worker
 * Processes queued email jobs, executes email transports, and logs failures to MongoDB ActivityLog.
 */

const { Worker } = require('bullmq');
const emailService = require('../utils/emailService');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const he = require('he');
const { getRedisConnection } = require('../queues/emailQueue');

let emailWorker = null;

/**
 * Process an individual email job
 */
async function processEmailJob(job) {
  const data = job.data;
  const {
    notificationId,
    type,
    userEmail,
    userName = 'User',
    applicationId,
    studentId,
    amount,
    phase,
    status,
    remarks,
    title,
    message
  } = data;

  if (!userEmail) {
    throw new Error('userEmail is required for email notification job');
  }

  if (!emailService.isSmtpConfigured()) {
    console.warn(`[EmailWorker] Email skipped for ${applicationId}: SMTP/Resend is not configured.`);
    return { skipped: true, reason: 'SMTP not configured' };
  }

  let emailResult = { success: false };

  if (type === 'approval') {
    emailResult = await emailService.sendApprovalEmail(
      {
        name: userName,
        email: userEmail,
        applicationId,
        studentId,
        amount,
        status,
        remarks
      },
      phase
    );
  } else if (type === 'rejection') {
    emailResult = await emailService.sendRejectionEmail(
      {
        name: userName,
        email: userEmail,
        applicationId,
        studentId,
        amount,
        status
      },
      phase,
      remarks
    );
  } else if (type === 'submission') {
    emailResult = await emailService.sendSubmissionEmail({
      name: userName,
      email: userEmail,
      applicationId,
      studentId,
      amount
    });
  } else if (type === 'reimbursed') {
    emailResult = await emailService.sendReimbursedEmail({
      name: userName,
      email: userEmail,
      applicationId,
      studentId,
      amount,
      status,
      remarks
    });
  } else {
    emailResult = await emailService.sendEmail(
      userEmail,
      title || `Application Update: ${applicationId}`,
      `<p>Dear ${he.encode(userName)},</p><p>${he.encode(message || '')}</p><p>Status: ${he.encode(status || '')}</p>`
    );
  }

  if (emailResult && emailResult.success) {
    if (notificationId) {
      try {
        await Notification.findByIdAndUpdate(notificationId, { emailSent: true });
      } catch (err) {
        console.warn('[EmailWorker] Could not mark notification as emailSent:', err.message);
      }
    }
    return emailResult;
  } else {
    throw new Error(emailResult?.error || 'Email transport returned unsuccessful status');
  }
}

/**
 * Initialize and start the BullMQ email worker
 */
function startEmailWorker() {
  if (emailWorker) return emailWorker;

  const connection = getRedisConnection();
  if (!connection) {
    console.warn('⚠️ BullMQ worker not started: Redis connection unavailable.');
    return null;
  }

  try {
    emailWorker = new Worker(
      'email-notifications',
      async (job) => {
        return await processEmailJob(job);
      },
      {
        connection,
        concurrency: 5
      }
    );

    emailWorker.on('completed', (job) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[EmailWorker] Job ${job.id} completed for ${job.data?.applicationId}`);
      }
    });

    emailWorker.on('failed', (job, err) => {
      console.error(`[EmailWorker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);

      // Log failure to MongoDB ActivityLog with level ERROR
      logger.logActivity({
        action: 'email_notification_failed',
        message: `Failed to deliver email notification to ${job?.data?.userEmail}: ${err.message}`,
        level: 'ERROR',
        status: 'failure',
        details: {
          jobId: job?.id,
          type: job?.data?.type,
          applicationId: job?.data?.applicationId,
          userEmail: job?.data?.userEmail,
          attemptsMade: job?.attemptsMade,
          error: err.message
        }
      });
    });

    emailWorker.on('error', (err) => {
      if (process.env.NODE_ENV === 'development') {
        // Suppress repeated connection logs in dev if redis offline
      }
    });

    return emailWorker;
  } catch (err) {
    console.warn('⚠️ Failed to initialize BullMQ email worker:', err.message);
    return null;
  }
}

/**
 * Close worker on server shutdown
 */
async function closeEmailWorker() {
  try {
    if (emailWorker) {
      await emailWorker.close();
      emailWorker = null;
    }
  } catch (err) {
    console.error('Error closing email worker:', err);
  }
}

module.exports = {
  startEmailWorker,
  closeEmailWorker,
  processEmailJob
};

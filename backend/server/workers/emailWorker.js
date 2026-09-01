const emailService = require('../utils/emailService');
const logger = require('../utils/logger');
const he = require('he');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let emailWorker = null;

try {
  const { Worker } = require('bullmq');
  const Redis = require('ioredis');

  const connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    }
  });

  connection.on('error', () => {
    // Suppress unhandled error log when Redis is down in local dev
  });

  emailWorker = new Worker('email-notifications', async (job) => {
    const notificationData = job.data;
    if (!notificationData || !notificationData.userEmail) {
      return { success: false, reason: 'No userEmail provided' };
    }

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
    }

    logger.info(`Processed email job ${job.id} for ${notificationData.userEmail}`, {
      success: emailResult.success,
      type: notificationData.type,
      applicationId: notificationData.applicationId,
    });

    return emailResult;
  }, {
    connection,
    concurrency: 5,
  });

  emailWorker.on('completed', (job) => {
    logger.debug(`Email worker completed job ${job.id}`);
  });

  emailWorker.on('failed', (job, err) => {
    logger.error(`Email worker failed job ${job?.id}: ${err.message}`, {
      jobData: job?.data,
      error: err.stack,
    });
  });
} catch (error) {
  // Gracefully fallback if Redis/bullmq is unavailable
}

module.exports = emailWorker;

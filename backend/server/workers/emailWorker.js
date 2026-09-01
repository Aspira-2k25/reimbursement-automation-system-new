const { Worker } = require('bullmq');
const Redis = require('ioredis');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');
const he = require('he');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let emailWorker = null;

try {
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

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Email sending failed');
    }

    return emailResult;
  }, {
    connection,
    concurrency: 5
  });

  emailWorker.on('completed', (job) => {
    logger.info(`Email job ${job.id} completed successfully for ${job.data?.userEmail}`);
  });

  emailWorker.on('failed', (job, err) => {
    logger.error(`Email job ${job?.id} failed: ${err.message}`, {
      jobId: job?.id,
      data: job?.data,
      error: err.message
    });
  });

} catch (error) {
  console.warn('Failed to start emailWorker:', error.message);
}

module.exports = emailWorker;

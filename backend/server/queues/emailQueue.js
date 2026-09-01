/**
 * BullMQ Email Notification Queue
 * Handles queuing email delivery jobs with Redis backend and retry backoff.
 */

const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisConnection = null;
let emailQueue = null;
let isRedisConnected = false;

function getRedisConnection() {
  if (!redisConnection) {
    try {
      redisConnection = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times) {
          if (times > 5) {
            return null; // Stop retrying after 5 attempts in environments without Redis
          }
          return Math.min(times * 500, 2000);
        },
        lazyConnect: true
      });

      redisConnection.on('connect', () => {
        isRedisConnected = true;
      });

      redisConnection.on('error', (err) => {
        isRedisConnected = false;
        if (process.env.NODE_ENV === 'development') {
          // Suppress noise in dev when redis isn't running
        }
      });
    } catch (e) {
      console.warn('⚠️ Could not initialize Redis client:', e.message);
    }
  }
  return redisConnection;
}

function getEmailQueue() {
  if (!emailQueue) {
    const connection = getRedisConnection();
    try {
      emailQueue = new Queue('email-notifications', {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: 100,
          removeOnFail: 500
        }
      });
    } catch (err) {
      console.warn('⚠️ Could not initialize BullMQ email-notifications queue:', err.message);
    }
  }
  return emailQueue;
}

/**
 * Add an email notification job to the queue
 */
async function queueEmailNotification(jobData, options = {}) {
  const queue = getEmailQueue();
  if (queue) {
    try {
      return await queue.add('send-notification', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        ...options
      });
    } catch (err) {
      console.warn('⚠️ BullMQ queue add failed, falling back to direct notification:', err.message);
      throw err;
    }
  }
  throw new Error('Email queue unavailable');
}

/**
 * Close queue connection gracefully
 */
async function closeEmailQueue() {
  try {
    if (emailQueue) {
      await emailQueue.close();
      emailQueue = null;
    }
    if (redisConnection) {
      await redisConnection.quit();
      redisConnection = null;
    }
  } catch (err) {
    console.error('Error closing email queue connection:', err);
  }
}

module.exports = {
  getEmailQueue,
  queueEmailNotification,
  closeEmailQueue,
  getRedisConnection
};

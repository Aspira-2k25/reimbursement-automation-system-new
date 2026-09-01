let emailQueue = null;
let redisConnection = null;
let isRedisAvailable = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

try {
  const { Queue } = require('bullmq');
  const Redis = require('ioredis');

  redisConnection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 3) {
        // Stop retrying aggressively if Redis isn't running locally
        return null;
      }
      return Math.min(times * 200, 1000);
    }
  });

  redisConnection.on('connect', () => {
    isRedisAvailable = true;
  });

  redisConnection.on('error', (err) => {
    isRedisAvailable = false;
    if (process.env.NODE_ENV === 'development') {
      // Quiet log in development
    } else {
      console.error('Redis connection error in emailQueue:', err.message);
    }
  });

  emailQueue = new Queue('email-notifications', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    }
  });
} catch (error) {
  // Graceful fallback if bullmq/ioredis not installed or redis not accessible
  isRedisAvailable = false;
}

/**
 * Helper to add an email job to the queue, or fallback to synchronous send
 */
const addEmailJob = async (jobName, data) => {
  if (emailQueue && isRedisAvailable) {
    try {
      return await emailQueue.add(jobName, data);
    } catch (err) {
      console.warn('Failed to add job to emailQueue, fallback to direct execution:', err.message);
    }
  }
  return null;
};

module.exports = {
  emailQueue,
  addEmailJob,
  isRedisAvailable: () => isRedisAvailable,
};

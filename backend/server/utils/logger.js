/**
 * Production-grade logging utility
 * Persists activity logs to MongoDB (ActivityLog collection)
 * Console output is dev-only; DB persistence works in ALL environments
 */
const connectMongoDB = require('../config/mongo');

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const colors = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m', // Magenta
  RESET: '\x1b[0m'
};

function normalizeIp(rawIp) {
  if (!rawIp) return null;
  let ip = String(rawIp).trim();
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
    return '127.0.0.1 (Localhost)';
  }
  if (ip.startsWith('::ffff:')) {
    return ip.replace('::ffff:', '');
  }
  return ip;
}

class Logger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this._ActivityLog = null; // Lazy-loaded model reference
  }

  /** Lazy-load the ActivityLog model to avoid circular dependency issues */
  _getModel() {
    if (!this._ActivityLog) {
      this._ActivityLog = require('../models/ActivityLog');
    }
    return this._ActivityLog;
  }


  // ───────────────────────────────────────────
  // Console helpers (dev-only output)
  // ───────────────────────────────────────────

  _formatConsole(level, message, data) {
    const timestamp = new Date().toISOString();
    const color = colors[level] || colors.RESET;
    const reset = colors.RESET;
    let logMessage = `${color}[${timestamp}] [${level}]${reset} ${message}`;
    if (data) logMessage += `\n${JSON.stringify(data, null, 2)}`;
    return logMessage;
  }

  error(message, data = null) {
    // Always print errors to console
    console.error(this._formatConsole(LOG_LEVELS.ERROR, message, data));
  }

  warn(message, data = null) {
    if (!this.isProduction) {
      console.warn(this._formatConsole(LOG_LEVELS.WARN, message, data));
    }
  }

  info(message, data = null) {
    if (!this.isProduction) {
      console.info(this._formatConsole(LOG_LEVELS.INFO, message, data));
    }
  }

  debug(message, data = null) {
    if (!this.isProduction && process.env.DEBUG === 'true') {
      console.debug(this._formatConsole(LOG_LEVELS.DEBUG, message, data));
    }
  }

  // ───────────────────────────────────────────
  // Persistent activity logging (MongoDB)
  // Works in ALL environments (dev + production)
  // ───────────────────────────────────────────

  /**
   * Persist an activity log entry to MongoDB.
   * This is fire-and-forget — it never throws or blocks the request.
   */
  async logActivity(data) {
    try {
      // Ensure MongoDB is connected (lazy connect for serverless)
      await connectMongoDB();

      const ActivityLog = this._getModel();
      const doc = await ActivityLog.create({
        userId: data.userId || null,
        userName: data.userName || 'System',
        role: data.role || null,
        department: data.department || null,
        action: data.action || 'unknown',
        message: data.message || '',
        formId: data.formId || null,
        level: data.level || LOG_LEVELS.INFO,
        status: data.status || null,
        details: data.details || null,
        ipAddress: normalizeIp(data.ipAddress),
        userAgent: data.userAgent || null,
        method: data.method || null,
        endpoint: data.endpoint || null,
        responseTime: data.responseTime || null,
        timestamp: new Date()
      });

      // Also print to console in dev for convenience
      if (!this.isProduction) {
        console.info(this._formatConsole(LOG_LEVELS.INFO, `[ACTIVITY] ${data.message}`, {
          action: data.action,
          user: data.userName,
          role: data.role
        }));
      }


    } catch (err) {
      // Log to console but NEVER throw — logging must never break the app
      console.error('Failed to persist activity log:', err.message);
    }
  }
}

// Export singleton instance
const logger = new Logger();
module.exports = logger;

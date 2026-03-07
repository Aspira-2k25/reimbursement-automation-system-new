/**
 * Logging utility to replace console.log statements
 * Provides structured logging with different levels
 * Only logs in development/staging, silent in production (unless error)
 */

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

class Logger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this._buffer = [];
    this._maxBuffer = 2000; // keep recent logs in memory
    this._io = null;
  }

  attachSocket(io) {
    this._io = io;
  }

  getLogs() {
    // return a shallow copy
    return this._buffer.slice().reverse(); // newest first
  }

  _pushLogObject(obj) {
    this._buffer.push(obj);
    if (this._buffer.length > this._maxBuffer) {
      this._buffer.shift();
    }
    // emit to socket if available
    try {
      if (this._io) {
        this._io.emit('log', obj);
      }
    } catch (e) {
      // ignore socket errors
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const color = colors[level] || colors.RESET;
    const reset = colors.RESET;
    
    let logMessage = `${color}[${timestamp}] [${level}]${reset} ${message}`;
    
    if (data) {
      logMessage += `\n${JSON.stringify(data, null, 2)}`;
    }
    
    return logMessage;
  }

  // create structured log object for programmatic use
  createLogObject(level, message, data = null) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      data: data || null
    };
  }

  error(message, data = null) {
    // Always log errors, even in production
    console.error(this.formatMessage(LOG_LEVELS.ERROR, message, data));
    this._pushLogObject(this.createLogObject(LOG_LEVELS.ERROR, message, data));
  }

  warn(message, data = null) {
    if (!this.isProduction) {
      console.warn(this.formatMessage(LOG_LEVELS.WARN, message, data));
      this._pushLogObject(this.createLogObject(LOG_LEVELS.WARN, message, data));
    }
  }

  info(message, data = null) {
    if (!this.isProduction) {
      console.info(this.formatMessage(LOG_LEVELS.INFO, message, data));
      this._pushLogObject(this.createLogObject(LOG_LEVELS.INFO, message, data));
    }
  }

  debug(message, data = null) {
    if (!this.isProduction && process.env.DEBUG === 'true') {
      console.debug(this.formatMessage(LOG_LEVELS.DEBUG, message, data));
      this._pushLogObject(this.createLogObject(LOG_LEVELS.DEBUG, message, data));
    }
  }

  // Special method for HTTP request logging
  logRequest(req) {
    if (!this.isProduction) {
      this.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        body: req.method !== 'GET' ? req.body : undefined
      });
    }
  }

  // Special method for API response logging
  logResponse(statusCode, message, duration = null) {
    if (!this.isProduction) {
      const level = statusCode >= 400 ? LOG_LEVELS.WARN : LOG_LEVELS.INFO;
      const logData = { statusCode };
      if (duration) logData.duration = `${duration}ms`;
      
      if (level === LOG_LEVELS.WARN) {
        this.warn(message, logData);
      } else {
        this.info(message, logData);
      }
    }
  }
}

// Export singleton instance
const logger = new Logger();
module.exports = logger;

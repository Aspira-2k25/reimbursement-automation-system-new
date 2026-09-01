/**
 * Request context middleware
 * Adds request ID tracking and context for logging/debugging
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Add unique request ID to each request
 * Helps with tracing requests through logs
 */
const requestContext = (req, res, next) => {
  // Generate unique request ID
  req.id = uuidv4();
  
  // Set request ID header in response
  res.setHeader('X-Request-ID', req.id);
  
  // Add start time for performance tracking
  req.startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end to log request completion
  res.end = function(...args) {
    const duration = Date.now() - req.startTime;
    
    // Log in development only
    if (process.env.NODE_ENV === 'development') {
      const logData = {
        requestId: req.id,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };
      
      // Only log slow requests or errors in dev
      if (duration > 1000 || res.statusCode >= 400) {
        console.log('[Request Context]', JSON.stringify(logData));
      }
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Get request context for use in controllers
 */
const getRequestContext = (req) => {
  return {
    requestId: req.id,
    startTime: req.startTime,
    user: req.user ? { id: req.user.userId, role: req.user.role } : null
  };
};

module.exports = {
  requestContext,
  getRequestContext
};

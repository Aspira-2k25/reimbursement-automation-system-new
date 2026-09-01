const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  // User context
  userId: { type: String, default: null },
  userName: { type: String, default: 'System' },
  role: { type: String, default: null },
  department: { type: String, default: null },

  // Action info
  action: {
    type: String,
    required: true,
    index: true
    // e.g., 'login', 'logout', 'login_failed', 'submit', 'approve', 'reject',
    //       'update', 'delete', 'reimburse', 'profile_update', 'error'
  },
  message: { type: String, required: true },
  formId: { type: String, default: null },

  // Log level
  level: {
    type: String,
    enum: ['INFO', 'WARN', 'ERROR'],
    default: 'INFO',
    index: true
  },

  // Result / extra details
  status: { type: String, default: null }, // e.g., 'success', 'failure', HTTP status code
  details: { type: mongoose.Schema.Types.Mixed, default: null },

  // Request context
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  method: { type: String, default: null },
  endpoint: { type: String, default: null },
  responseTime: { type: Number, default: null }, // ms

  // Timestamp
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: false, // We use our own 'timestamp' field
  versionKey: false
});

// Compound indexes for common admin dashboard queries
activityLogSchema.index({ role: 1, timestamp: -1 });
activityLogSchema.index({ department: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });

// TTL index: auto-delete logs older than 90 days to prevent unbounded growth
activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

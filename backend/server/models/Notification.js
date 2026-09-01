const mongoose = require('mongoose');

// Structured subdocument schema for notification metadata with strict validation
const NotificationMetadataSchema = new mongoose.Schema(
  {
    ipAddress: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          // Basic IPv4 / IPv6 format sanity check
          return /^([0-9a-fA-F:.]+)$/.test(v);
        },
        message: 'Invalid IP address format in notification metadata'
      }
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500
    },
    formType: {
      type: String,
      trim: true,
      enum: ['Faculty', 'Student', 'Coordinator', 'HOD', 'Principal', 'Accounts', 'General', null]
    },
    changes: {
      type: Map,
      of: String
    }
  },
  {
    _id: false,
    strict: 'throw' // Schema-level validation: rejects any arbitrary/unvalidated properties
  }
);

const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  applicationId: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['approval', 'rejection', 'status_change', 'submission', 'reimbursed']
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  phase: { type: String },
  status: { type: String },
  read: { type: Boolean, default: false, index: true },
  emailSent: { type: Boolean, default: false },
  metadata: {
    type: NotificationMetadataSchema,
    default: () => ({})
  },
}, { timestamps: true });

// Compound index for efficient user notification queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
const mongoose = require('mongoose');

const MetadataSchema = new mongoose.Schema({
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    formType: { type: String, trim: true },
    changes: { type: Map, of: String }
}, { _id: false, strict: 'throw' });

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
    metadata: { type: MetadataSchema, default: () => ({}) },
}, { timestamps: true });

// Compound index for querying user notifications sorted by time
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
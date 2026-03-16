const mongoose = require('mongoose');

/**
 * SystemAnnouncement — single-document store for the global reminder banner.
 * HODs, Principals, and Admins can update this. All authenticated users can read it.
 * Only one active announcement is used at a time (upsert pattern).
 */
const SystemAnnouncementSchema = new mongoose.Schema({
  message: { type: String, required: true, maxlength: 500 },
  isActive: { type: Boolean, default: true },
  // targetRoles: empty array = show to ALL roles; otherwise restrict to listed roles
  targetRoles: { type: [String], default: [] },
  updatedBy: { type: String },
  updatedByRole: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SystemAnnouncement', SystemAnnouncementSchema);

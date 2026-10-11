const mongoose = require('mongoose');

/**
 * PortalSetting — Stores operational configuration for reimbursement portals.
 * Controls whether a specific reimbursement type (e.g. NPTEL, or future categories)
 * is open or closed, with role, department, and academic year targeting.
 * Managed by Admin.
 */
const PortalSettingSchema = new mongoose.Schema({
  portalKey: {
    type: String,
    required: true,
    unique: true,
    default: 'nptel'
  },
  title: {
    type: String,
    default: 'NPTEL Certification'
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  closedMessage: {
    type: String,
    default: 'NPTEL Reimbursement Portal is currently closed.'
  },
  targetRoles: {
    type: [String],
    default: ['All'] // ['All'] or ['Student'], ['Faculty']
  },
  targetDepartments: {
    type: [String],
    default: ['All'] // ['All'] or specific department names
  },
  targetYears: {
    type: [String],
    default: ['All'] // ['All'] or ['SE'], ['TE'], ['BE']
  },
  updatedBy: {
    type: String,
    default: 'Admin'
  },
  updatedByRole: {
    type: String,
    default: 'Admin'
  }
}, { timestamps: true });

module.exports = mongoose.model('PortalSetting', PortalSettingSchema);

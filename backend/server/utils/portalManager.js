const mongoose = require('mongoose');
const PortalSetting = require('../models/PortalSetting');
const logger = require('./logger');

// Known available reimbursement categories (extensible for future options)
const AVAILABLE_PORTALS = [
  { key: 'nptel', title: 'NPTEL Certification' },
  { key: 'lab-materials', title: 'Lab Materials' },
  { key: 'workshop', title: 'Workshop Training' },
  { key: 'fdp-program', title: 'Faculty Development Programs' },
  { key: 'conference-workshop', title: 'Conferences & Workshops' },
  { key: 'travel-alliance', title: 'Travel Alliance' }
];

// In-memory cache for fast, reliable access
let portalMemoryCache = {
  nptel: {
    portalKey: 'nptel',
    title: 'NPTEL Certification',
    isOpen: true,
    closedMessage: 'NPTEL Reimbursement Portal is currently closed for submissions.',
    targetRoles: ['All'],
    targetDepartments: ['All'],
    targetYears: ['All'],
    updatedBy: 'Admin',
    updatedByRole: 'Admin',
    updatedAt: new Date()
  }
};

/**
 * Checks whether a specific reimbursement portal is closed for a given user.
 * @param {Object} portalSetting - Current portal setting
 * @param {Object} userContext - User context { role, department, year }
 * @returns {boolean} - true if portal is closed for this user, false if open.
 */
function isPortalClosedForUser(portalSetting, userContext = {}) {
  if (!portalSetting || portalSetting.isOpen) {
    return false; // Open for everyone
  }

  const { role, department, year } = userContext;

  // 1. Role Match
  const targetRoles = Array.isArray(portalSetting.targetRoles) && portalSetting.targetRoles.length > 0
    ? portalSetting.targetRoles
    : ['All'];

  if (!targetRoles.includes('All')) {
    if (!role) return false;
    const matchesRole = targetRoles.some(r => r.toLowerCase() === role.toLowerCase());
    if (!matchesRole) {
      return false; // Closed only for other roles
    }
  }

  // 2. Department Match
  const targetDepartments = Array.isArray(portalSetting.targetDepartments) && portalSetting.targetDepartments.length > 0
    ? portalSetting.targetDepartments
    : ['All'];

  if (!targetDepartments.includes('All')) {
    if (!department) return false;
    const matchesDept = targetDepartments.some(d => d.toLowerCase() === department.toLowerCase());
    if (!matchesDept) {
      return false; // Closed only for other departments
    }
  }

  // 3. Year Match (only applies if user is Student and student's year is specified)
  if (role && role.toLowerCase() === 'student' && year) {
    const targetYears = Array.isArray(portalSetting.targetYears) && portalSetting.targetYears.length > 0
      ? portalSetting.targetYears
      : ['All'];

    if (!targetYears.includes('All')) {
      const matchesYear = targetYears.includes(year);
      if (!matchesYear) {
        return false; // Closed only for other academic years
      }
    }
  }

  // All targeting conditions match -> portal is closed for this user
  return true;
}

/**
 * Get current portal status (defaults to 'nptel')
 * @param {string} portalKey
 * @returns {Promise<Object>}
 */
async function getPortalStatus(portalKey = 'nptel') {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const setting = await PortalSetting.findOne({ portalKey }).lean();
      if (setting) {
        portalMemoryCache[portalKey] = setting;
        return setting;
      }
    }

    const defaultTitle = AVAILABLE_PORTALS.find(p => p.key === portalKey)?.title || portalKey.toUpperCase();
    return portalMemoryCache[portalKey] || {
      portalKey,
      title: defaultTitle,
      isOpen: true,
      closedMessage: `${defaultTitle} Reimbursement Portal is currently closed for submissions.`,
      targetRoles: ['All'],
      targetDepartments: ['All'],
      targetYears: ['All'],
      updatedBy: 'Admin',
      updatedByRole: 'Admin'
    };
  } catch (error) {
    logger.warn('Error querying PortalSetting from DB, falling back to cache:', { error: error.message });
    return portalMemoryCache[portalKey] || {
      portalKey,
      isOpen: true,
      closedMessage: 'Reimbursement Portal is currently closed.',
      targetRoles: ['All'],
      targetDepartments: ['All'],
      targetYears: ['All']
    };
  }
}

/**
 * Update portal status
 * @param {string} portalKey
 * @param {Object} updateData
 * @param {Object} actorUser
 * @returns {Promise<Object>}
 */
async function updatePortalStatus(portalKey = 'nptel', updateData = {}, actorUser = {}) {
  const {
    isOpen,
    closedMessage,
    targetRoles,
    targetDepartments,
    targetYears,
    title
  } = updateData;

  const updatedBy = actorUser.name || actorUser.username || actorUser.email || 'Admin';
  const updatedByRole = actorUser.role || 'Admin';

  const defaultTitle = AVAILABLE_PORTALS.find(p => p.key === portalKey)?.title || portalKey.toUpperCase();

  const updateFields = {
    portalKey,
    title: title || defaultTitle,
    updatedBy,
    updatedByRole,
    updatedAt: new Date()
  };

  if (typeof isOpen === 'boolean') {
    updateFields.isOpen = isOpen;
  }
  if (typeof closedMessage === 'string' && closedMessage.trim()) {
    updateFields.closedMessage = closedMessage.trim();
  }
  if (Array.isArray(targetRoles)) {
    updateFields.targetRoles = targetRoles.length > 0 ? targetRoles : ['All'];
  }
  if (Array.isArray(targetDepartments)) {
    updateFields.targetDepartments = targetDepartments.length > 0 ? targetDepartments : ['All'];
  }
  if (Array.isArray(targetYears)) {
    updateFields.targetYears = targetYears.length > 0 ? targetYears : ['All'];
  }

  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const updated = await PortalSetting.findOneAndUpdate(
        { portalKey },
        { $set: updateFields },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();

      portalMemoryCache[portalKey] = updated;

      logger.info(`Portal [${portalKey}] status updated to ${updated.isOpen ? 'OPEN' : 'CLOSED'} by ${updatedBy} (${updatedByRole})`, {
        portalKey,
        isOpen: updated.isOpen,
        targetRoles: updated.targetRoles,
        targetDepartments: updated.targetDepartments,
        targetYears: updated.targetYears,
        updatedBy
      });

      return updated;
    }

    // In-memory fallback
    portalMemoryCache[portalKey] = {
      ...(portalMemoryCache[portalKey] || {}),
      portalKey,
      ...updateFields
    };
    logger.info(`Portal [${portalKey}] status updated to ${updateFields.isOpen ? 'OPEN' : 'CLOSED'} by ${updatedBy} [Cache]`);
    return portalMemoryCache[portalKey];
  } catch (error) {
    logger.error('Failed to update PortalSetting in DB:', { error: error.message });
    portalMemoryCache[portalKey] = {
      ...(portalMemoryCache[portalKey] || {}),
      portalKey,
      ...updateFields
    };
    return portalMemoryCache[portalKey];
  }
}

/**
 * Get all available portal types/categories
 */
function getAvailablePortals() {
  return AVAILABLE_PORTALS;
}

module.exports = {
  getPortalStatus,
  updatePortalStatus,
  isPortalClosedForUser,
  getAvailablePortals,
  AVAILABLE_PORTALS
};

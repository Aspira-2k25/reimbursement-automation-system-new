const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getPortalStatus,
  updatePortalStatus,
  isPortalClosedForUser,
  getAvailablePortals
} = require('../utils/portalManager');

/**
 * GET /api/portal/status
 * Accessible to all authenticated users.
 * Evaluates whether the portal is closed for the specific calling user based on role, department, and academic year.
 */
router.get('/status', authMiddleware.verifyToken, async (req, res) => {
  try {
    const portalKey = req.query.portalKey || 'nptel';
    const status = await getPortalStatus(portalKey);

    const userContext = {
      role: req.user?.role,
      department: req.user?.department,
      year: req.query.year || req.user?.year
    };

    const isClosed = isPortalClosedForUser(status, userContext);

    return res.status(200).json({
      success: true,
      portal: status,
      isClosedForUser: isClosed,
      availablePortals: getAvailablePortals()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve portal status'
    });
  }
});

/**
 * PUT /api/portal/status
 * Restricted to Admin.
 * Updates portal open/closed state with targeting options (roles, departments, academic years).
 */
router.put(
  '/status',
  authMiddleware.verifyToken,
  authMiddleware.requireRole(['Admin']),
  async (req, res) => {
    try {
      const {
        isOpen,
        closedMessage,
        targetRoles,
        targetDepartments,
        targetYears,
        portalKey = 'nptel',
        title
      } = req.body;

      if (typeof isOpen !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isOpen must be a boolean value (true or false).'
        });
      }

      const updated = await updatePortalStatus(portalKey, {
        isOpen,
        closedMessage,
        targetRoles,
        targetDepartments,
        targetYears,
        title
      }, req.user);

      return res.status(200).json({
        success: true,
        portal: updated,
        message: `${updated.title || portalKey.toUpperCase()} Portal status has been saved successfully.`
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update portal status'
      });
    }
  }
);

module.exports = router;

/**
 * Activity logging middleware
 * Logs all meaningful API actions performed by non-admin users.
 * Uses the 'finish' event on the response so it never interferes with
 * the actual response being sent.
 */
const logger = require('../utils/logger');

// Routes to completely skip (noisy or internal)
const SKIP_PATHS = [
    '/api/csrf-token',
    '/api/admin/logs',
    '/api/uploads',
];

/**
 * Build a human-readable activity message from the request.
 * Returns null to skip logging for that request.
 */
function getActivityMessage(req) {
    const method = req.method;
    const path = req.originalUrl || req.path;

    // ── Auth ──
    // Note: login, google login, and logout are now logged explicitly in authController
    // with accurate user details, so we skip them here.
    if (path.startsWith('/api/auth/profile') && method === 'PUT') return 'Updated profile';

    // Extract ID if available
    const urlParts = path.split('/');
    const possibleId = urlParts[urlParts.length - 1];
    const formId = (possibleId && possibleId.length > 5 && possibleId !== 'submit') ? possibleId : null;

    // ── Faculty forms ──
    if (path === '/api/forms/submit' && method === 'POST') {
        return { message: 'Submitted a reimbursement application', formId };
    }
    if (path.startsWith('/api/forms/') && method === 'PUT') {
        const status = req.body?.status;
        if (status === 'Under Principal') return { message: 'Approved an application (forwarded to Principal)', formId };
        if (status === 'Approved') return { message: 'Approved an application', formId };
        if (status === 'Rejected') return { message: 'Rejected an application', formId };
        if (status === 'Reimbursed') return { message: 'Marked an application as reimbursed', formId };
        return { message: 'Updated a reimbursement application', formId };
    }
    if (path.startsWith('/api/forms/') && method === 'DELETE') {
        return { message: 'Deleted a reimbursement application', formId };
    }

    // ── Student forms ──
    if (path === '/api/student-forms/submit' && method === 'POST') {
        return { message: 'Submitted a student reimbursement application', formId };
    }
    if (path.startsWith('/api/student-forms/') && method === 'PUT') {
        const status = req.body?.status;
        if (status === 'Under HOD') return { message: 'Approved a student application (forwarded to HOD)', formId };
        if (status === 'Under Principal') return { message: 'Approved a student application (forwarded to Principal)', formId };
        if (status === 'Approved') return { message: 'Approved a student application', formId };
        if (status === 'Rejected') return { message: 'Rejected a student application', formId };
        if (status === 'Reimbursed') return { message: 'Marked a student application as reimbursed', formId };
        return { message: 'Updated a student reimbursement application', formId };
    }
    if (path.startsWith('/api/student-forms/') && method === 'DELETE') {
        return { message: 'Deleted a student reimbursement application', formId };
    }

    // ── Users / uploads ──
    if (path.startsWith('/api/users') && method === 'PUT') return { message: 'Updated user settings' };
    if (path.startsWith('/api/users') && method === 'POST') return { message: 'Uploaded a document' };

    // ── Notification routes ──
    if (path.includes('/notifications') && method === 'PUT') return { message: 'Marked notifications as read' };

    // Skip GET requests and anything not matched
    if (method === 'GET') return null;

    return null; // Skip unknown routes to avoid noisy logs
}

function activityLogger(req, res, next) {
    // Only log state-changing requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip internal/noisy paths
    for (const skip of SKIP_PATHS) {
        if ((req.originalUrl || req.path).startsWith(skip)) {
            return next();
        }
    }

    // Use the 'finish' event — fires after the response has been sent,
    // so it never interferes with the response itself.
    res.on('finish', () => {
        try {
            // Only log successful responses (2xx/3xx)
            if (res.statusCode >= 400) return;

            // Skip admin user actions
            const userRole = req.user?.role?.toLowerCase();
            if (userRole === 'admin') return;

            const activityData = getActivityMessage(req);
            if (!activityData) return;
            
            const activityMessage = activityData.message || activityData;

            const userName = req.user?.name || req.user?.username || req.user?.email || 'Unknown';
            const userRoleDisplay = req.user?.role || 'Unknown';
            const department = req.user?.department || '';

            logger.info(activityMessage, {
                user: userName,
                role: userRoleDisplay,
                department: department,
                formId: activityData.formId || undefined
            });
        } catch (e) {
            // Never let logging errors affect the application
        }
    });

    next();
}

module.exports = activityLogger;

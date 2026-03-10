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

    // ── Faculty forms ──
    if (path === '/api/forms/submit' && method === 'POST') {
        return 'Submitted a reimbursement application';
    }
    if (path.startsWith('/api/forms/') && method === 'PUT') {
        const status = req.body?.status;
        if (status === 'Under Principal') return 'Approved an application (forwarded to Principal)';
        if (status === 'Approved') return 'Approved an application';
        if (status === 'Rejected') return 'Rejected an application';
        if (status === 'Reimbursed') return 'Marked an application as reimbursed';
        if (status === 'Disbursed') return 'Marked an application as disbursed';
        return 'Updated a reimbursement application';
    }
    if (path.startsWith('/api/forms/') && method === 'DELETE') {
        return 'Deleted a reimbursement application';
    }

    // ── Student forms ──
    if (path === '/api/student-forms/submit' && method === 'POST') {
        return 'Submitted a student reimbursement application';
    }
    if (path.startsWith('/api/student-forms/') && method === 'PUT') {
        const status = req.body?.status;
        if (status === 'Under HOD') return 'Approved a student application (forwarded to HOD)';
        if (status === 'Under Principal') return 'Approved a student application (forwarded to Principal)';
        if (status === 'Approved') return 'Approved a student application';
        if (status === 'Rejected') return 'Rejected a student application';
        if (status === 'Reimbursed') return 'Marked a student application as reimbursed';
        if (status === 'Disbursed') return 'Marked a student application as disbursed';
        return 'Updated a student reimbursement application';
    }
    if (path.startsWith('/api/student-forms/') && method === 'DELETE') {
        return 'Deleted a student reimbursement application';
    }

    // ── Users / uploads ──
    if (path.startsWith('/api/users') && method === 'PUT') return 'Updated user settings';
    if (path.startsWith('/api/users') && method === 'POST') return 'Uploaded a document';

    // ── Notification routes ──
    if (path.includes('/notifications') && method === 'PUT') return 'Marked notifications as read';

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

            const activity = getActivityMessage(req);
            if (!activity) return;

            const userName = req.user?.name || req.user?.username || req.user?.email || 'Unknown';
            const userRoleDisplay = req.user?.role || 'Unknown';
            const department = req.user?.department || '';

            logger.info(activity, {
                user: userName,
                role: userRoleDisplay,
                department: department,
            });
        } catch (e) {
            // Never let logging errors affect the application
        }
    });

    next();
}

module.exports = activityLogger;

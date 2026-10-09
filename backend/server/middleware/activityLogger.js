/**
 * Activity logging middleware
 * Persists meaningful API actions to MongoDB via logger.logActivity().
 * Uses the 'finish' event so it never blocks or interferes with the response.
 */
const logger = require('../utils/logger');

// Routes to completely skip (noisy or internal)
const SKIP_PATHS = [
    '/api/csrf-token',
    '/api/admin/logs',
    '/api/uploads',
];

/**
 * Build a structured activity descriptor from the request.
 * Returns null to skip logging for that request.
 * Returns { action, message, formId? } for loggable requests.
 */
function getActivityDescriptor(req) {
    const method = req.method;
    const path = req.originalUrl || req.path;

    // ── Auth ──
    // login, google login, and logout are logged explicitly in authController
    if (path.startsWith('/api/auth/profile') && method === 'PUT') {
        return { action: 'profile_update', message: 'Updated profile' };
    }

    // Extract possible form ID from URL
    const urlParts = path.split('/');
    const possibleId = urlParts[urlParts.length - 1];
    const formId = (possibleId && possibleId.length > 5 && possibleId !== 'submit') ? possibleId : null;

    // ── Faculty forms ──
    if (path === '/api/forms/submit' && method === 'POST') {
        return { action: 'submit', message: 'Submitted a reimbursement application', formId };
    }
    if (path.startsWith('/api/forms/') && method === 'PUT') {
        const status = req.body?.status;
        if (status === 'Under Principal') return { action: 'approve', message: 'Approved an application (forwarded to Principal)', formId };
        if (status === 'Approved') return { action: 'approve', message: 'Approved an application', formId };
        if (status === 'Rejected') return { action: 'reject', message: 'Rejected an application', formId };
        if (status === 'Reimbursed') return { action: 'reimburse', message: 'Marked an application as reimbursed', formId };
        return { action: 'update', message: 'Updated a reimbursement application', formId };
    }
    if (path.startsWith('/api/forms/') && method === 'DELETE') {
        return { action: 'delete', message: 'Deleted a reimbursement application', formId };
    }

    // ── Student forms ──
    if (path === '/api/student-forms/submit' && method === 'POST') {
        return { action: 'submit', message: 'Submitted a student reimbursement application', formId };
    }
    if (path.startsWith('/api/student-forms/') && method === 'PUT') {
        const status = req.body?.status;
        if (status === 'Under HOD') return { action: 'approve', message: 'Approved a student application (forwarded to HOD)', formId };
        if (status === 'Under Principal') return { action: 'approve', message: 'Approved a student application (forwarded to Principal)', formId };
        if (status === 'Approved') return { action: 'approve', message: 'Approved a student application', formId };
        if (status === 'Rejected') return { action: 'reject', message: 'Rejected a student application', formId };
        if (status === 'Reimbursed') return { action: 'reimburse', message: 'Marked a student application as reimbursed', formId };
        return { action: 'update', message: 'Updated a student reimbursement application', formId };
    }
    if (path.startsWith('/api/student-forms/') && method === 'DELETE') {
        return { action: 'delete', message: 'Deleted a student reimbursement application', formId };
    }

    // ── Users / uploads ──
    if (path.startsWith('/api/users') && method === 'PUT') {
        return { action: 'update', message: 'Updated user settings' };
    }
    if (path.startsWith('/api/users') && method === 'POST') {
        return { action: 'upload', message: 'Uploaded a document' };
    }

    // ── Notification routes ──
    if (path.includes('/notifications') && method === 'PUT') {
        return { action: 'update', message: 'Marked notifications as read' };
    }

    // ── Password changes ──
    if (path.includes('/password/change-password') && method === 'POST') {
        return { action: 'password_change', message: 'Changed account password' };
    }

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

    // Track response time
    const startTime = Date.now();

    // Use the 'finish' event — fires after the response has been sent,
    // so it never interferes with the response itself.
    res.on('finish', () => {
        try {
            // Only log successful responses (2xx/3xx)
            if (res.statusCode >= 400) return;

            const descriptor = getActivityDescriptor(req);
            if (!descriptor) return;

            const userName = req.user?.name || req.user?.username || req.user?.email || 'Unknown';
            const userRoleDisplay = req.user?.role || 'Unknown';
            const department = req.user?.department || '';

            // Persist to MongoDB (fire-and-forget)
            logger.logActivity({
                userId: req.user?.userId || req.user?.id || null,
                userName,
                role: userRoleDisplay,
                department,
                action: descriptor.action,
                message: descriptor.message,
                formId: descriptor.formId || null,
                level: 'INFO',
                status: 'success',
                ipAddress: req.ip || req.connection?.remoteAddress || null,
                userAgent: req.get('user-agent') || null,
                method: req.method,
                endpoint: req.originalUrl || req.path,
                responseTime: Date.now() - startTime
            });
        } catch (e) {
            // Never let logging errors affect the application
            console.error('Activity logger error:', e.message);
        }
    });

    next();
}

module.exports = activityLogger;

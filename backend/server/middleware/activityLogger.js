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
    '/api/announcements',
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
        return { action: 'profile_update', message: 'Updated user profile' };
    }

    // Extract ID if available
    const urlParts = path.split('/').filter(Boolean);
    const lastPart = urlParts[urlParts.length - 1];
    const prevPart = urlParts.length > 1 ? urlParts[urlParts.length - 2] : null;
    const formId = (lastPart && lastPart.length > 5 && lastPart !== 'submit' && lastPart !== 'status') 
        ? lastPart 
        : (prevPart && prevPart.length > 5 && prevPart !== 'student-forms' && prevPart !== 'forms')
        ? prevPart 
        : null;

    // ── Faculty / Coordinator / HOD forms ──
    if (path === '/api/forms/submit' && method === 'POST') {
        const role = req.user?.role?.toLowerCase();
        const rolePrefix = role === 'hod' ? 'an HOD' : (role === 'coordinator' ? 'a coordinator' : 'a faculty');
        return { action: 'submit', message: `Submitted ${rolePrefix} reimbursement application`, formId };
    }
    if (path.startsWith('/api/forms/') && ['PUT', 'PATCH'].includes(method)) {
        const status = req.body?.status;
        if (status === 'Under Principal') return { action: 'approve', message: 'Approved an application (forwarded to Principal)', formId };
        if (status === 'Approved') return { action: 'approve', message: 'Sanctioned & approved reimbursement claim', formId };
        if (status === 'Rejected') return { action: 'reject', message: `Rejected reimbursement claim (${req.body?.rejectionRemarks || req.body?.rejectionReason || 'No reason provided'})`, formId };
        if (status === 'Reimbursed') return { action: 'reimburse', message: 'Marked claim as reimbursed / payment disbursed', formId };
        return { action: 'update', message: 'Updated reimbursement claim', formId };
    }
    if (path.startsWith('/api/forms/') && method === 'DELETE') {
        return { action: 'delete', message: 'Deleted a reimbursement claim', formId };
    }

    // ── Student forms ──
    if (path === '/api/student-forms/submit' && method === 'POST') {
        return { action: 'submit', message: 'Submitted an NPTEL student reimbursement application', formId };
    }
    if (path.startsWith('/api/student-forms/') && ['PUT', 'PATCH'].includes(method)) {
        const status = req.body?.status;
        if (status === 'Under HOD') return { action: 'approve', message: 'Verified student application (forwarded to HOD)', formId };
        if (status === 'Under Principal') return { action: 'approve', message: 'Approved student application (forwarded to Principal)', formId };
        if (status === 'Approved') return { action: 'approve', message: 'Sanctioned & approved student reimbursement', formId };
        if (status === 'Rejected') return { action: 'reject', message: `Rejected student reimbursement (${req.body?.rejectionRemarks || req.body?.rejectionReason || 'No reason provided'})`, formId };
        if (status === 'Reimbursed') return { action: 'reimburse', message: 'Disbursed reimbursement payment to student', formId };
        return { action: 'update', message: 'Updated student reimbursement application', formId };
    }
    if (path.startsWith('/api/student-forms/') && method === 'DELETE') {
        return { action: 'delete', message: 'Deleted a student reimbursement application', formId };
    }

    // ── Users / uploads ──
    if (path.startsWith('/api/users') && method === 'PUT') {
        return { action: 'update', message: 'Updated user settings' };
    }
    if (path.startsWith('/api/users') && method === 'POST') {
        return { action: 'upload', message: 'Uploaded a supporting document' };
    }

    // ── Notification routes ──
    if (path.includes('/notifications') && method === 'PUT') {
        return { action: 'update', message: 'Marked notifications as read' };
    }

    // ── Password changes ──
    if (path.includes('/password/change-password') && method === 'POST') {
        return { action: 'password_change', message: 'Changed account password' };
    }

    return null;
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
            const userRoleDisplay = req.user?.role || 'User';
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

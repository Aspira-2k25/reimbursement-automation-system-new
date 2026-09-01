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
    '/api/announcements',
];

/**
 * Build a human-readable activity message from the request.
 * Returns null to skip logging for that request.
 */
function getActivityMessage(req) {
    const method = req.method;
    const path = req.originalUrl || req.path;

    // ── Auth ──
    if (path.startsWith('/api/auth/profile') && method === 'PUT') return { message: 'Updated user profile' };

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
        return { message: `Submitted ${rolePrefix} reimbursement application`, formId };
    }
    if (path.startsWith('/api/forms/') && ['PUT', 'PATCH'].includes(method)) {
        const status = req.body?.status;
        if (status === 'Under Principal') return { message: 'Approved an application (forwarded to Principal)', formId };
        if (status === 'Approved') return { message: 'Sanctioned & approved reimbursement claim', formId };
        if (status === 'Rejected') return { message: `Rejected reimbursement claim (${req.body?.rejectionRemarks || req.body?.rejectionReason || 'No reason provided'})`, formId };
        if (status === 'Reimbursed') return { message: 'Marked claim as reimbursed / payment disbursed', formId };
        return { message: 'Updated reimbursement claim', formId };
    }
    if (path.startsWith('/api/forms/') && method === 'DELETE') {
        return { message: 'Deleted a reimbursement claim', formId };
    }

    // ── Student forms ──
    if (path === '/api/student-forms/submit' && method === 'POST') {
        return { message: 'Submitted an NPTEL student reimbursement application', formId };
    }
    if (path.startsWith('/api/student-forms/') && ['PUT', 'PATCH'].includes(method)) {
        const status = req.body?.status;
        if (status === 'Under HOD') return { message: 'Verified student application (forwarded to HOD)', formId };
        if (status === 'Under Principal') return { message: 'Approved student application (forwarded to Principal)', formId };
        if (status === 'Approved') return { message: 'Sanctioned & approved student reimbursement', formId };
        if (status === 'Rejected') return { message: `Rejected student reimbursement (${req.body?.rejectionRemarks || req.body?.rejectionReason || 'No reason provided'})`, formId };
        if (status === 'Reimbursed') return { message: 'Disbursed reimbursement payment to student', formId };
        return { message: 'Updated student reimbursement application', formId };
    }
    if (path.startsWith('/api/student-forms/') && method === 'DELETE') {
        return { message: 'Deleted a student reimbursement application', formId };
    }

    // ── Users / uploads ──
    if (path.startsWith('/api/users') && method === 'PUT') return { message: 'Updated user settings' };
    if (path.startsWith('/api/users') && method === 'POST') return { message: 'Uploaded a supporting document' };

    // ── Notification routes ──
    if (path.includes('/notifications') && method === 'PUT') return { message: 'Marked notifications as read' };

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

    // Use the 'finish' event — fires after the response has been sent
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
            const userRoleDisplay = req.user?.role || 'User';
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

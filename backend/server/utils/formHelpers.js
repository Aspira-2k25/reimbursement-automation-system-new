/**
 * Shared form helper utilities
 * Extracted from formRoutes.js and StudentFormRoutes.js to eliminate duplication.
 */

const mongoose = require('mongoose');

// Department aliases for flexible matching between short codes and full names
const DEPARTMENT_ALIASES = {
    'IT': 'Information Technology',
    'CE': 'Computer Engineering',
    'AIML': 'CSE AI and ML',
    'DS': 'CSE Data Science',
    'CIVIL': 'Civil Engineering',
    'MECH': 'Mechanical Engineering',
};

/**
 * Sanitize a string by removing MongoDB operators and dangerous characters.
 * @param {string} str
 * @returns {string}
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[${}<>]/g, '').trim();
};

/**
 * Sanitize an application ID to only allow alphanumeric, hyphens, and underscores.
 * @param {string} id
 * @returns {string}
 */
const sanitizeApplicationId = (id) => {
    if (typeof id !== 'string') return '';
    return id.replace(/[^a-zA-Z0-9\-_]/g, '');
};

/**
 * Validate MongoDB ObjectId format.
 * @param {string} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Get all possible department name variants for a given department value.
 * Maps short codes to full names and vice versa.
 * @param {string} department
 * @returns {string[]}
 */
const getDepartmentVariants = (department) => {
    if (!department) return [];
    const variants = [department];
    const upperDept = department.toUpperCase().trim();

    // If department is a short alias, add its full name
    if (DEPARTMENT_ALIASES[upperDept]) {
        variants.push(DEPARTMENT_ALIASES[upperDept]);
    }

    // If department is a full name, add the short alias
    for (const [alias, fullName] of Object.entries(DEPARTMENT_ALIASES)) {
        if (fullName.toLowerCase() === department.toLowerCase().trim()) {
            variants.push(alias);
        }
    }

    return [...new Set(variants)]; // deduplicate
};

/**
 * Build a strict department filter for MongoDB queries based on user role and their department.
 * Principals, Accounts, and Admins can see all departments.
 * HODs and Coordinators can only see applications matching their department precisely.
 * 
 * @param {string} userRole 
 * @param {string} userDepartment 
 * @returns {object} MongoDB query object for department filtering
 */
const buildDepartmentFilter = (userRole, userDepartment) => {
    const role = (userRole || '').toLowerCase();

    // Principals, Accounts, and Admins can see all requests
    if (['principal', 'accounts', 'admin'].includes(role)) {
        return {};
    }

    // Coordinators and HODs are strictly filtered to their own department
    if (['coordinator', 'hod'].includes(role)) {
        if (!userDepartment) {
            // Edge case: if an HOD/Coordinator has no department assigned, they technically
            // shouldn't see anything, but we'll return an unsatisfiable query to be safe.
            return { department: "__NONE__" };
        }

        const deptVariants = getDepartmentVariants(userDepartment);
        const deptPattern = deptVariants
            .map(d => String(d).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|');
        const deptRegex = new RegExp(`^(${deptPattern})$`, 'i');

        return {
            $or: [
                { department: { $in: deptVariants } },
                { department: { $regex: deptRegex } }
            ]
        };
    }

    // Fallback for students and faculty is usually handled via user owner IDs elsewhere.
    return {};
};

module.exports = {
    DEPARTMENT_ALIASES,
    sanitizeString,
    sanitizeApplicationId,
    isValidObjectId,
    getDepartmentVariants,
    buildDepartmentFilter,
};

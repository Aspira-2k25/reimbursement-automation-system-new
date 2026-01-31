/**
 * Application-wide constants for reimbursement status workflow
 * This ensures consistency across the codebase and prevents typos
 */

// Reimbursement status workflow states
const REIMBURSEMENT_STATUS = {
  PENDING: 'Pending',
  UNDER_COORDINATOR: 'Under Coordinator',
  UNDER_HOD: 'Under HOD',
  UNDER_PRINCIPAL: 'Under Principal',
  APPROVED: 'Approved',
  DISBURSED: 'Disbursed',
  REJECTED: 'Rejected'
};

// Applicant types
const APPLICANT_TYPES = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  COORDINATOR: 'Coordinator',
  HOD: 'HOD'
};

// User roles (matches database schema)
const USER_ROLES = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  COORDINATOR: 'Coordinator',
  HOD: 'HOD',
  PRINCIPAL: 'Principal',
  ACCOUNTS: 'Accounts'
};

// Reimbursement types with codes for Application ID
const REIMBURSEMENT_TYPES = {
  NPTEL: { name: 'NPTEL', code: 'NPT' },
  FDP: { name: 'Faculty Development Program', code: 'FDP' },
  CONFERENCE: { name: 'Conference', code: 'CNF' },
  WORKSHOP: { name: 'Workshop', code: 'WKS' },
  TRAVEL: { name: 'Travel', code: 'TRV' },
  LAB_MATERIALS: { name: 'Lab Materials', code: 'LAB' }
};

// Departments with codes for Application ID
const DEPARTMENTS = {
  CE: { name: 'Computer Engineering', code: 'CE' },
  IT: { name: 'Information Technology', code: 'IT' },
  AIML: { name: 'CSE AI and ML', code: 'AIML' },
  DS: { name: 'CSE Data Science', code: 'DS' },
  CIVIL: { name: 'Civil Engineering', code: 'CVL' },
  MECH: { name: 'Mechanical Engineering', code: 'MECH' }
};

// Department list for dropdowns
const DEPARTMENT_LIST = [
  'Computer Engineering',
  'Information Technology',
  'CSE AI and ML',
  'CSE Data Science',
  'Civil Engineering',
  'Mechanical Engineering'
];

// File upload constraints
const FILE_CONSTRAINTS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.webp']
};

// Validation rules
const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  IFSC_CODE_PATTERN: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  ACCOUNT_NUMBER_PATTERN: /^\d{9,18}$/,
  ACADEMIC_YEAR_PATTERN: /^\d{4}-\d{4}$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

// Workflow transitions (what status can transition to what)
const STATUS_TRANSITIONS = {
  [REIMBURSEMENT_STATUS.PENDING]: [REIMBURSEMENT_STATUS.UNDER_COORDINATOR, REIMBURSEMENT_STATUS.REJECTED],
  [REIMBURSEMENT_STATUS.UNDER_COORDINATOR]: [REIMBURSEMENT_STATUS.UNDER_HOD, REIMBURSEMENT_STATUS.REJECTED],
  [REIMBURSEMENT_STATUS.UNDER_HOD]: [REIMBURSEMENT_STATUS.UNDER_PRINCIPAL, REIMBURSEMENT_STATUS.REJECTED],
  [REIMBURSEMENT_STATUS.UNDER_PRINCIPAL]: [REIMBURSEMENT_STATUS.APPROVED, REIMBURSEMENT_STATUS.REJECTED],
  [REIMBURSEMENT_STATUS.APPROVED]: [REIMBURSEMENT_STATUS.DISBURSED], // Accounts can mark as disbursed
  [REIMBURSEMENT_STATUS.DISBURSED]: [], // Final state
  [REIMBURSEMENT_STATUS.REJECTED]: [] // Final state
};

// Export all constants
module.exports = {
  REIMBURSEMENT_STATUS,
  APPLICANT_TYPES,
  USER_ROLES,
  REIMBURSEMENT_TYPES,
  DEPARTMENTS,
  DEPARTMENT_LIST,
  FILE_CONSTRAINTS,
  VALIDATION_RULES,
  STATUS_TRANSITIONS
};

/**
 * Application ID Generator
 * 
 * Generates meaningful, human-readable application IDs for reimbursement requests.
 * 
 * Format: {ROLE}-{DEPT}-{FORMTYPE}-{YEAR}-{SEQ}
 * 
 * Examples:
 *   S-IT-NPT-2026-001   → Student, IT Dept, NPTEL, 2026, Sequence 1
 *   F-COMP-NPT-2026-002 → Faculty, Computer Engg, NPTEL, 2026, Sequence 2
 *   S-AIML-NPT-2026-003 → Student, AIML Dept, NPTEL, 2026, Sequence 3
 * 
 * The sequence number is GLOBALLY UNIQUE across all forms, departments,
 * roles, and form types. Uniqueness is guaranteed by an atomic MongoDB
 * counter (findOneAndUpdate + $inc) — no race conditions possible.
 */

const { getNextSequence } = require('../models/Counter');

// ──────────────────────────────────────────────────────────────
// Role prefixes
// ──────────────────────────────────────────────────────────────
const APPLICANT_PREFIX = {
  'Student': 'S',
  'Faculty': 'F',
  'Coordinator': 'C',
  'HOD': 'H'
};

// ──────────────────────────────────────────────────────────────
// Department codes  (add new departments here)
// ──────────────────────────────────────────────────────────────
const DEPARTMENT_CODES = {
  // Information Technology
  'information technology': 'IT',
  'it': 'IT',
  'infotech': 'IT',

  // Computer Engineering
  'computer engineering': 'COMP',
  'computer engg': 'COMP',
  'comps': 'COMP',
  'comp': 'COMP',
  'ce': 'COMP',

  // CSE AI and ML
  'cse ai and ml': 'AIML',
  'cse aiml': 'AIML',
  'aiml': 'AIML',
  'ai ml': 'AIML',
  'artificial intelligence': 'AIML',

  // CSE Data Science
  'cse data science': 'DS',
  'cse ds': 'DS',
  'data science': 'DS',
  'ds': 'DS',

  // Civil Engineering
  'civil engineering': 'CIVIL',
  'civil engg': 'CIVIL',
  'civil': 'CIVIL',

  // Mechanical Engineering
  'mechanical engineering': 'MECH',
  'mechanical engg': 'MECH',
  'mechanical': 'MECH',
  'mech': 'MECH',

  // Fallback
  'other': 'OTH',
  'unknown': 'UNK'
};

// ──────────────────────────────────────────────────────────────
// Form type codes  (add new form types here — no other code
//                   changes needed to support them)
// ──────────────────────────────────────────────────────────────
const CATEGORY_CODES = {
  'NPTEL': 'NPT',
  'nptel': 'NPT',
  'FDP': 'FDP',
  'Faculty Development Program': 'FDP',
  'Conference': 'CNF',
  'conference': 'CNF',
  'Workshop': 'WKS',
  'workshop': 'WKS',
  'Travel': 'TRV',
  'travel': 'TRV',
  'Hackathon': 'HCK',
  'hackathon': 'HCK',
  'Internship': 'INT',
  'internship': 'INT',
  'Lab Materials': 'LAB',
  'lab materials': 'LAB',
  'OTHER': 'OTH',
  'other': 'OTH'
};

// ──────────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────────

/**
 * Get single-letter role prefix.
 * @param {string} applicantType  'Student' | 'Faculty' | 'Coordinator' | 'HOD'
 * @returns {string}
 */
function getApplicantPrefix(applicantType) {
  if (!applicantType) return 'S';
  return APPLICANT_PREFIX[applicantType] || 'S';
}

/**
 * Get department abbreviation from department name.
 * @param {string} department  e.g. 'Information Technology'
 * @returns {string}  e.g. 'IT'
 */
function getDepartmentCode(department) {
  if (!department) return 'UNK';
  const dept = department.toLowerCase().trim();

  // Exact match
  if (DEPARTMENT_CODES[dept]) return DEPARTMENT_CODES[dept];

  // Partial match
  for (const [key, code] of Object.entries(DEPARTMENT_CODES)) {
    if (dept.includes(key) || key.includes(dept)) return code;
  }

  // Auto-generate from initials (max 4 chars)
  const words = department.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.map(w => w[0].toUpperCase()).join('').substring(0, 4);
  }
  return department.substring(0, 4).toUpperCase();
}

/**
 * Get form type code from reimbursement / form type string.
 * @param {string} formType  e.g. 'NPTEL', 'Hackathon'
 * @returns {string}  e.g. 'NPT', 'HCK'
 */
function getCategoryCode(formType) {
  if (!formType) return 'NPT';
  const type = formType.toLowerCase().trim();

  if (CATEGORY_CODES[type]) return CATEGORY_CODES[type];

  for (const [key, code] of Object.entries(CATEGORY_CODES)) {
    if (type.includes(key.toLowerCase()) || key.toLowerCase().includes(type)) {
      return code;
    }
  }

  // Auto-generate a 3-letter code for unknown types
  return formType.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'OTH';
}

/**
 * Extract / derive a 4-digit year.
 * Falls back to the current system year if nothing is provided.
 * @param {string} [academicYear]  e.g. '2025-2026' or '2026'
 * @returns {string}
 */
function extractYear(academicYear) {
  if (!academicYear) return new Date().getFullYear().toString();

  if (academicYear.includes('-')) return academicYear.split('-')[0].trim();
  if (/^\d{4}$/.test(academicYear.trim())) return academicYear.trim();

  const match = academicYear.match(/\d{4}/);
  return match ? match[0] : new Date().getFullYear().toString();
}

// ──────────────────────────────────────────────────────────────
// Main entry point — atomic ID generation
// ──────────────────────────────────────────────────────────────

/**
 * Generate a globally unique Application ID.
 *
 * Format:  ROLE-DEPT-FORMTYPE-YEAR-SEQ
 * Example: S-IT-NPT-2026-001
 *
 * Uses an atomic MongoDB counter (findOneAndUpdate + $inc) to guarantee
 * that every call receives a unique, monotonically increasing sequence
 * number.  No retries are needed — the counter is race-condition-free.
 *
 * @param {Object}   params
 * @param {string}   params.applicantType     'Student' | 'Faculty' | …
 * @param {string}   params.reimbursementType 'NPTEL' | 'Hackathon' | …
 * @param {string}  [params.academicYear]     '2025-2026' or '2026'
 * @param {string}   params.department        'Information Technology' | …
 * @returns {Promise<string>}
 */
async function generateApplicationId(params) {
  const {
    applicantType = 'Student',
    reimbursementType = 'NPTEL',
    academicYear,
    department
  } = params;

  const rolePrefix = getApplicantPrefix(applicantType);
  const deptCode = getDepartmentCode(department);
  const formCode = getCategoryCode(reimbursementType);
  const year = extractYear(academicYear);

  // Atomic increment — guaranteed unique across all concurrent requests
  const counterKey = `global_app_id_${year}`;
  const seq = await getNextSequence(counterKey);
  const sequence = String(seq).padStart(3, '0');

  const applicationId = `${rolePrefix}-${deptCode}-${formCode}-${year}-${sequence}`;

  console.log(`Generated Application ID: ${applicationId}`);
  console.log(`  Role      : ${applicantType} → ${rolePrefix}`);
  console.log(`  Department: ${department || '(unknown)'} → ${deptCode}`);
  console.log(`  Form Type : ${reimbursementType} → ${formCode}`);
  console.log(`  Year      : ${academicYear || '(system date)'} → ${year}`);
  console.log(`  Sequence  : ${sequence} (global, atomic)`);

  return applicationId;
}

/**
 * Parse an Application ID back into its component parts.
 * @param {string} applicationId  e.g. 'S-IT-NPT-2026-001'
 * @returns {Object|null}
 */
function parseApplicationId(applicationId) {
  if (!applicationId) return null;

  const parts = applicationId.split('-');
  if (parts.length !== 5) return null;

  const [rolePrefix, deptCode, formCode, year, sequence] = parts;

  const applicantType = Object.entries(APPLICANT_PREFIX)
    .find(([, c]) => c === rolePrefix)?.[0] || 'Unknown';

  const department = Object.entries(DEPARTMENT_CODES)
    .find(([, c]) => c === deptCode)?.[0] || 'Unknown';

  const category = Object.entries(CATEGORY_CODES)
    .find(([, c]) => c === formCode)?.[0] || 'Unknown';

  return {
    applicantType,
    department,
    category,
    year,
    sequence: parseInt(sequence, 10),
    raw: { rolePrefix, deptCode, formCode, sequence }
  };
}

// ──────────────────────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────────────────────
module.exports = {
  generateApplicationId,
  parseApplicationId,
  getApplicantPrefix,
  getDepartmentCode,
  getCategoryCode,
  extractYear,
  APPLICANT_PREFIX,
  DEPARTMENT_CODES,
  CATEGORY_CODES
};

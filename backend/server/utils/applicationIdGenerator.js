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
 * roles, and form types. Duplicate prevention uses retry logic with the
 * MongoDB unique index on applicationId.
 */

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
// Global sequence generator
// ──────────────────────────────────────────────────────────────

/**
 * Find the highest sequence number that exists in the database
 * across ALL provided Mongoose models for the given year.
 *
 * @param {string}   year    4-digit year string
 * @param {Object[]} Models  Array of Mongoose models (e.g. [StudentForm, Form])
 * @returns {Promise<number>} The highest sequence found (0 if none)
 */
async function findMaxSequence(year, Models) {
  let maxSeq = 0;

  for (const Model of Models) {
    // Match any applicationId ending with  -YEAR-NNN  (covers all roles / depts / types)
    const docs = await Model.find({
      applicationId: { $regex: `-${year}-[0-9]{3,}$` }
    }).select('applicationId').lean();

    for (const doc of docs) {
      const parts = doc.applicationId.split('-');
      const seq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }

  return maxSeq;
}

// ──────────────────────────────────────────────────────────────
// Main entry point
// ──────────────────────────────────────────────────────────────

/** Maximum retries when a duplicate applicationId is detected. */
const MAX_RETRIES = 5;

/**
 * Generate a globally unique Application ID.
 *
 * Format:  ROLE-DEPT-FORMTYPE-YEAR-SEQ
 * Example: S-IT-NPT-2026-001
 *
 * The returned ID is *not* yet saved — the caller saves it.
 * If two requests race and produce the same sequence, the MongoDB
 * unique index on `applicationId` will reject the second write.
 * Use {@link generateApplicationIdWithRetry} to handle that automatically.
 *
 * @param {Object}   params
 * @param {string}   params.applicantType     'Student' | 'Faculty' | …
 * @param {string}   params.reimbursementType 'NPTEL' | 'Hackathon' | …
 * @param {string}  [params.academicYear]     '2025-2026' or '2026'
 * @param {string}   params.department        'Information Technology' | …
 * @param {Object[]} Models                   Mongoose models to scan
 * @returns {Promise<string>}
 */
async function generateApplicationId(params, Models) {
  const {
    applicantType = 'Student',
    reimbursementType = 'NPTEL',
    academicYear,
    department
  } = params;

  const modelArray = Array.isArray(Models) ? Models : [Models];

  const rolePrefix = getApplicantPrefix(applicantType);
  const deptCode = getDepartmentCode(department);
  const formCode = getCategoryCode(reimbursementType);
  const year = extractYear(academicYear);

  const maxSeq = await findMaxSequence(year, modelArray);
  const sequence = String(maxSeq + 1).padStart(3, '0');

  const applicationId = `${rolePrefix}-${deptCode}-${formCode}-${year}-${sequence}`;

  console.log(`Generated Application ID: ${applicationId}`);
  console.log(`  Role      : ${applicantType} → ${rolePrefix}`);
  console.log(`  Department: ${department || '(unknown)'} → ${deptCode}`);
  console.log(`  Form Type : ${reimbursementType} → ${formCode}`);
  console.log(`  Year      : ${academicYear || '(system date)'} → ${year}`);
  console.log(`  Sequence  : ${sequence} (global)`);

  return applicationId;
}

/**
 * Generate an Application ID **with automatic retry** on duplicate key errors.
 *
 * Call this wrapper instead of `generateApplicationId` when you want
 * built-in protection against two concurrent submissions getting the
 * same sequence number.
 *
 * Usage:
 *   const { applicationId, savedDoc } = await generateApplicationIdWithRetry(
 *     params, Models, buildDocFn
 *   );
 *
 * @param {Object}   params       Same as generateApplicationId
 * @param {Object[]} Models       Mongoose models to scan
 * @param {Function} buildDocFn   (applicationId) => Mongoose document (unsaved)
 * @returns {Promise<{applicationId: string, savedDoc: Object}>}
 */
async function generateApplicationIdWithRetry(params, Models, buildDocFn) {
  const modelArray = Array.isArray(Models) ? Models : [Models];

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

  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const maxSeq = await findMaxSequence(year, modelArray);
    const sequence = String(maxSeq + 1 + attempt).padStart(3, '0');
    const applicationId = `${rolePrefix}-${deptCode}-${formCode}-${year}-${sequence}`;

    try {
      const doc = buildDocFn(applicationId);
      const savedDoc = await doc.save();

      console.log(`Generated Application ID: ${applicationId}  (attempt ${attempt + 1})`);
      return { applicationId, savedDoc };
    } catch (err) {
      // MongoDB duplicate key error code = 11000
      if (err.code === 11000 && err.keyPattern?.applicationId) {
        console.warn(`Duplicate applicationId ${applicationId}, retrying… (${attempt + 1}/${MAX_RETRIES})`);
        lastError = err;
        continue;
      }
      throw err; // not a duplicate error — rethrow
    }
  }

  throw lastError || new Error('Failed to generate unique Application ID after retries');
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
  generateApplicationIdWithRetry,
  parseApplicationId,
  getApplicantPrefix,
  getDepartmentCode,
  getCategoryCode,
  extractYear,
  findMaxSequence,
  APPLICANT_PREFIX,
  DEPARTMENT_CODES,
  CATEGORY_CODES
};

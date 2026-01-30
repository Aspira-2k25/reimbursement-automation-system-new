/**
 * Application ID Generator
 * 
 * Generates meaningful, human-readable application IDs for reimbursement requests
 * 
 * Format: {APPLICANT_TYPE}-{CATEGORY}-{YEAR}-{DEPT}-{SEQ}
 * 
 * Examples:
 *   S-NPT-2026-IT-001   → Student NPTEL 2026 IT Department, Sequence 1
 *   F-FDP-2026-CE-015   → Faculty FDP 2026 Computer Engg, Sequence 15
 *   F-NPT-2026-AIML-003 → Faculty NPTEL 2026 CSE AIML, Sequence 3
 */

// Applicant type prefixes
const APPLICANT_PREFIX = {
  'Student': 'S',
  'Faculty': 'F',
  'Coordinator': 'C',
  'HOD': 'H'
};

// Reimbursement type abbreviations
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
  'Lab Materials': 'LAB',
  'lab materials': 'LAB',
  'OTHER': 'OTH',
  'other': 'OTH'
};

// Department abbreviations (normalized to lowercase keys for matching)
const DEPARTMENT_CODES = {
  // Computer Engineering variations
  'computer engineering': 'CE',
  'computer engg': 'CE',
  'comps': 'CE',
  'comp': 'CE',
  'ce': 'CE',
  
  // Information Technology variations
  'information technology': 'IT',
  'it': 'IT',
  'infotech': 'IT',
  
  // CSE AI and ML variations
  'cse ai and ml': 'AIML',
  'cse aiml': 'AIML',
  'aiml': 'AIML',
  'ai ml': 'AIML',
  'artificial intelligence': 'AIML',
  
  // CSE Data Science variations
  'cse data science': 'DS',
  'cse ds': 'DS',
  'data science': 'DS',
  'ds': 'DS',
  
  // Civil Engineering variations
  'civil engineering': 'CVL',
  'civil engg': 'CVL',
  'civil': 'CVL',
  'cvl': 'CVL',
  
  // Mechanical Engineering variations
  'mechanical engineering': 'MECH',
  'mechanical engg': 'MECH',
  'mechanical': 'MECH',
  'mech': 'MECH',
  
  // Fallback
  'other': 'OTH',
  'unknown': 'UNK'
};

/**
 * Get applicant type prefix
 * @param {string} applicantType - 'Student', 'Faculty', 'Coordinator', 'HOD'
 * @returns {string} - Single letter prefix (S, F, C, H)
 */
function getApplicantPrefix(applicantType) {
  if (!applicantType) return 'S'; // Default to Student
  return APPLICANT_PREFIX[applicantType] || 'S';
}

/**
 * Get category code from reimbursement type
 * @param {string} reimbursementType - e.g., 'NPTEL', 'FDP', 'Conference'
 * @returns {string} - 3-letter category code
 */
function getCategoryCode(reimbursementType) {
  if (!reimbursementType) return 'NPT'; // Default to NPTEL
  const type = reimbursementType.toLowerCase().trim();
  
  // Try exact match first
  if (CATEGORY_CODES[type]) {
    return CATEGORY_CODES[type];
  }
  
  // Try partial match
  for (const [key, code] of Object.entries(CATEGORY_CODES)) {
    if (type.includes(key.toLowerCase()) || key.toLowerCase().includes(type)) {
      return code;
    }
  }
  
  return 'OTH'; // Fallback
}

/**
 * Get department code from department name
 * @param {string} department - e.g., 'Information Technology', 'Computer Engineering'
 * @returns {string} - Department abbreviation
 */
function getDepartmentCode(department) {
  if (!department) return 'UNK'; // Unknown if not provided
  const dept = department.toLowerCase().trim();
  
  // Try exact match first
  if (DEPARTMENT_CODES[dept]) {
    return DEPARTMENT_CODES[dept];
  }
  
  // Try partial match
  for (const [key, code] of Object.entries(DEPARTMENT_CODES)) {
    if (dept.includes(key) || key.includes(dept)) {
      return code;
    }
  }
  
  // Generate abbreviation from first letters if no match
  const words = department.split(' ').filter(w => w.length > 0);
  if (words.length > 1) {
    return words.map(w => w[0].toUpperCase()).join('').substring(0, 4);
  }
  
  return department.substring(0, 4).toUpperCase(); // First 4 chars
}

/**
 * Extract year from academic year string
 * @param {string} academicYear - e.g., '2025-2026' or '2026'
 * @returns {string} - 4-digit year
 */
function extractYear(academicYear) {
  if (!academicYear) {
    return new Date().getFullYear().toString();
  }
  
  // Handle "2025-2026" format - use first year
  if (academicYear.includes('-')) {
    const years = academicYear.split('-');
    return years[0].trim();
  }
  
  // Handle "2026" format
  if (/^\d{4}$/.test(academicYear.trim())) {
    return academicYear.trim();
  }
  
  // Try to extract 4-digit year from string
  const match = academicYear.match(/\d{4}/);
  if (match) {
    return match[0];
  }
  
  return new Date().getFullYear().toString();
}

/**
 * Generate sequence number by counting existing applications
 * @param {Object} Model - Mongoose model (Form or StudentForm)
 * @param {string} prefix - The prefix to search for (e.g., 'S-NPT-2026-IT-')
 * @returns {Promise<string>} - 3-digit sequence number
 */
async function generateSequenceNumber(Model, prefix) {
  try {
    // Find all applications that start with this prefix
    const existingApps = await Model.find({
      applicationId: { $regex: `^${prefix}`, $options: 'i' }
    }).select('applicationId').lean();
    
    // Extract sequence numbers and find the max
    let maxSeq = 0;
    for (const app of existingApps) {
      const parts = app.applicationId.split('-');
      const seqPart = parts[parts.length - 1];
      const seq = parseInt(seqPart, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
    
    // Return next sequence number, padded to 3 digits
    return String(maxSeq + 1).padStart(3, '0');
  } catch (error) {
    console.error('Error generating sequence number:', error);
    // Fallback: use timestamp-based sequence
    const timestamp = Date.now().toString().slice(-4);
    return timestamp.padStart(3, '0');
  }
}

/**
 * Generate application ID
 * 
 * @param {Object} params - Parameters for ID generation
 * @param {string} params.applicantType - 'Student', 'Faculty', 'Coordinator', 'HOD'
 * @param {string} params.reimbursementType - 'NPTEL', 'FDP', 'Conference', etc.
 * @param {string} params.academicYear - '2025-2026' or '2026'
 * @param {string} params.department - 'Information Technology', 'Computer Engineering', etc.
 * @param {Object} Model - Mongoose model to check for existing sequences
 * @returns {Promise<string>} - Generated application ID (e.g., 'S-NPT-2026-IT-001')
 */
async function generateApplicationId(params, Model) {
  const {
    applicantType = 'Student',
    reimbursementType = 'NPTEL',
    academicYear,
    department
  } = params;
  
  // Build ID components
  const typePrefix = getApplicantPrefix(applicantType);
  const categoryCode = getCategoryCode(reimbursementType);
  const year = extractYear(academicYear);
  const deptCode = getDepartmentCode(department);
  
  // Build prefix for sequence lookup
  const prefix = `${typePrefix}-${categoryCode}-${year}-${deptCode}-`;
  
  // Generate sequence number
  const sequence = await generateSequenceNumber(Model, prefix);
  
  // Combine all parts
  const applicationId = `${prefix}${sequence}`;
  
  console.log(`Generated Application ID: ${applicationId}`);
  console.log(`  Type: ${applicantType} → ${typePrefix}`);
  console.log(`  Category: ${reimbursementType} → ${categoryCode}`);
  console.log(`  Year: ${academicYear} → ${year}`);
  console.log(`  Department: ${department} → ${deptCode}`);
  console.log(`  Sequence: ${sequence}`);
  
  return applicationId;
}

/**
 * Parse application ID back to components
 * @param {string} applicationId - e.g., 'S-NPT-2026-IT-001'
 * @returns {Object} - Parsed components
 */
function parseApplicationId(applicationId) {
  if (!applicationId) return null;
  
  const parts = applicationId.split('-');
  if (parts.length !== 5) return null;
  
  const [typePrefix, categoryCode, year, deptCode, sequence] = parts;
  
  // Reverse lookup for type
  const applicantType = Object.entries(APPLICANT_PREFIX)
    .find(([, code]) => code === typePrefix)?.[0] || 'Unknown';
  
  // Reverse lookup for category
  const category = Object.entries(CATEGORY_CODES)
    .find(([, code]) => code === categoryCode)?.[0] || 'Unknown';
  
  // Reverse lookup for department
  const department = Object.entries(DEPARTMENT_CODES)
    .find(([, code]) => code === deptCode)?.[0] || 'Unknown';
  
  return {
    applicantType,
    category,
    year,
    department,
    sequence: parseInt(sequence, 10),
    raw: {
      typePrefix,
      categoryCode,
      deptCode,
      sequence
    }
  };
}

// Export all functions and constants
module.exports = {
  generateApplicationId,
  parseApplicationId,
  getApplicantPrefix,
  getCategoryCode,
  getDepartmentCode,
  extractYear,
  generateSequenceNumber,
  APPLICANT_PREFIX,
  CATEGORY_CODES,
  DEPARTMENT_CODES
};

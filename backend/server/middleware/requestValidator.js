/**
 * Request validation middleware
 * Validates input length and content type before processing
 */

// Maximum allowed lengths for form fields
const FIELD_LENGTH_LIMITS = {
  name: 100,
  email: 100,
  username: 50,
  courseName: 200,
  remarks: 1000,
  rejectionRemarks: 1000,
  accountsComments: 1000,
  department: 50,
  jobTitle: 100,
  studentId: 50,
  division: 20,
  academicYear: 20,
  facultyId: 50,
  accountName: 100,
  ifscCode: 20,
  accountNumber: 50,
  reimbursementType: 50,
  applicantType: 50
};

// Maximum request body size (1MB for JSON, separate from file uploads)
const MAX_JSON_SIZE = 1024 * 1024; // 1MB

/**
 * Validate input field lengths
 */
const validateInputLength = (req, res, next) => {
  // Skip for GET requests and file uploads
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.is('multipart/form-data')) {
    return next();
  }

  const errors = [];
  const body = req.body;

  // Guard against undefined/null body (e.g. bodyless requests)
  if (!body || typeof body !== 'object') {
    return next();
  }

  // Check overall request size
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > MAX_JSON_SIZE) {
    return res.status(413).json({
      error: 'Request entity too large',
      message: 'Request body exceeds 1MB limit'
    });
  }

  // Validate each field length
  for (const [field, value] of Object.entries(body)) {
    const limit = FIELD_LENGTH_LIMITS[field];

    if (limit && typeof value === 'string' && value.length > limit) {
      errors.push(`${field} exceeds maximum length of ${limit} characters`);
    }

    // Check for potentially dangerous patterns
    if (typeof value === 'string') {
      // Block MongoDB operators in string values
      if (/\$[a-zA-Z]/.test(value)) {
        errors.push(`${field} contains invalid characters`);
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

/**
 * Validate file upload request size (before multer processes)
 * This prevents memory exhaustion from large uploads
 */
const validateUploadSize = (maxSizeMB = 10) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = maxSizeMB * 1024 * 1024;

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'File too large',
        message: `Upload size exceeds ${maxSizeMB}MB limit`
      });
    }

    next();
  };
};

/**
 * Sanitize string inputs
 */
const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        // Trim whitespace
        req.body[key] = value.trim();

        // Remove null bytes
        req.body[key] = req.body[key].replace(/\x00/g, '');
      }
    }
  }

  next();
};

module.exports = {
  validateInputLength,
  validateUploadSize,
  sanitizeInput,
  FIELD_LENGTH_LIMITS
};

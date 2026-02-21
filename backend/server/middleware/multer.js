const multer = require('multer');
const fileType = require('file-type');

// Use memory storage for serverless environments (Vercel, AWS Lambda, etc.)
// Disk storage doesn't work because filesystem is read-only
const storage = multer.memoryStorage();

// Magic numbers for file type validation
const FILE_SIGNATURES = {
  'image/jpeg': ['ffd8ff'],
  'image/png': ['89504e47'],
  'application/pdf': ['25504446']
};

// File type validation - only allow images and PDFs
// Validates both MIME type and file content (magic numbers)
const fileFilter = async (req, file, cb) => {
  try {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];

    // Check MIME type from header
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
    }

    // Check file extension
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('Invalid file extension.'), false);
    }

    // Extension must match MIME type
    const mimeToExt = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'application/pdf': ['pdf']
    };

    if (!mimeToExt[file.mimetype]?.includes(ext)) {
      return cb(new Error('File extension does not match content type.'), false);
    }

    cb(null, true);
  } catch (error) {
    cb(new Error('File validation failed.'), false);
  }
};

// Validate file content using magic numbers
const validateFileContent = async (buffer, expectedMimeType) => {
  try {
    // Use file-type library to detect actual file type
    const type = await fileType.fromBuffer(buffer);

    if (!type) {
      return { valid: false, error: 'Could not determine file type' };
    }

    // Map file-type results to MIME types
    const detectedMime = type.mime;

    if (detectedMime !== expectedMimeType) {
      return {
        valid: false,
        error: `File content (${detectedMime}) does not match expected type (${expectedMimeType})`
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'File content validation failed' };
  }
};

// Maximum file sizes (1MB uniform limit as per requirements)
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB per file
const MAX_TOTAL_SIZE = 1 * 1024 * 1024; // 1MB total for all files

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Middleware to validate total upload size before multer processes
const validateTotalUploadSize = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');

  if (contentLength > MAX_TOTAL_SIZE) {
    return res.status(413).json({
      error: 'Upload too large',
      message: `Total upload size exceeds ${MAX_TOTAL_SIZE / (1024 * 1024)}MB limit`
    });
  }

  next();
};

// Middleware to validate file content after upload
const validateUploadedFiles = async (req, res, next) => {
  if (!req.files && !req.file) {
    return next();
  }

  try {
    const files = req.files ? Object.values(req.files).flat() : [req.file];

    for (const file of files) {
      if (!file.buffer) continue;

      const validation = await validateFileContent(file.buffer, file.mimetype);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'File validation failed',
          details: validation.error,
          filename: file.originalname
        });
      }
    }

    next();
  } catch (error) {
    console.error('File validation error:', error);
    return res.status(500).json({ error: 'File validation failed' });
  }
};

module.exports = upload;
module.exports.validateUploadedFiles = validateUploadedFiles;
module.exports.validateTotalUploadSize = validateTotalUploadSize;
module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
module.exports.MAX_TOTAL_SIZE = MAX_TOTAL_SIZE;

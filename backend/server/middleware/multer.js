const multer = require('multer');

// Use memory storage for serverless environments (Vercel, AWS Lambda, etc.)
// Disk storage doesn't work because filesystem is read-only
const storage = multer.memoryStorage();

// Magic numbers for file type validation (fallback when file-type library unavailable)
const FILE_SIGNATURES = {
  'image/jpeg': ['ffd8ff'],
  'image/png': ['89504e47'],
  'application/pdf': ['25504446']
};

// File type validation - only allow images and PDFs
// Validates both MIME type and file content (magic numbers)
const fileFilter = (req, file, cb) => {
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
// file-type v21+ is ESM-only, so we use dynamic import
const validateFileContent = async (buffer, expectedMimeType) => {
  try {
    // Try using file-type library via dynamic import (ESM-only in v17+)
    try {
      const fileType = await import('file-type');
      const type = await fileType.fileTypeFromBuffer(buffer);

      if (!type) {
        return { valid: false, error: 'Could not determine file type' };
      }

      if (type.mime !== expectedMimeType) {
        return {
          valid: false,
          error: `File content (${type.mime}) does not match expected type (${expectedMimeType})`
        };
      }

      return { valid: true };
    } catch (importError) {
      // Fallback: validate using magic numbers if file-type library fails
      console.warn('file-type library unavailable, using magic number fallback:', importError.message);
      const signatures = FILE_SIGNATURES[expectedMimeType];
      if (!signatures) {
        return { valid: false, error: `Unknown MIME type: ${expectedMimeType}` };
      }

      const header = buffer.slice(0, 4).toString('hex');
      const matches = signatures.some(sig => header.startsWith(sig));
      if (!matches) {
        return { valid: false, error: 'File content does not match expected type (magic number check)' };
      }

      return { valid: true };
    }
  } catch (error) {
    return { valid: false, error: 'File content validation failed' };
  }
};

// Maximum file sizes (500KB uniform limit as per requirements)
const MAX_FILE_SIZE = 500 * 1024; // 500KB per file
const MAX_TOTAL_SIZE = 500 * 1024; // 500KB total for all files

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE // 500KB per file
  },
  fileFilter: fileFilter
});

// Middleware to validate total upload size before multer processes
const validateTotalUploadSize = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');

  if (contentLength > MAX_TOTAL_SIZE) {
    return res.status(413).json({
      error: 'Upload too large',
      message: `Total upload size exceeds 500KB limit`
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

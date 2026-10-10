const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const { uploadFile } = require('../utils/cloudinary');
const Attachment = require('../models/Attachment');
const Form = require('../models/Form');
const StudentForm = require('../models/StudentForm');
const { validateUploadedFiles } = require('../middleware/multer');
const { verifyToken } = require('../middleware/auth');
// Allowed MIME types and extensions for reimbursement documents
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'application/pdf'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

// Use memory storage for serverless with strict type & size validation (1MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 1 * 1024 * 1024, // 1MB limit per file
    files: 5,
    fields: 5,
    fieldSize: 4096,
    parts: 10
  },
  fileFilter: (req, file, cb) => {
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Invalid file type. Only PDF, JPG, PNG, and WebP files are allowed.'));
    }
    cb(null, true);
  }
});

// Multer middleware wrapper for clean error responses
const handleUpload = (req, res, next) => {
  upload.array('files')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 1MB limit.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Cannot upload more than 5 files at once.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }
    next();
  });
};

// POST /api/uploads/documents
router.post('/documents', verifyToken, handleUpload, validateUploadedFiles, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Upload from memory buffer using helper function
    const uploadPromises = req.files.map(file =>
      uploadFile(file, {
        ownerId: String(req.user.userId || req.user.email),
        folder: 'reimbursement-Forms',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true
      })
    );

    const uploadedFiles = await cloudinary.uploadBatch(uploadPromises);

    const documents = uploadedFiles.map(file => cloudinary.toDocument(file));

    res.json({ documents });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// DELETE /api/uploads/documents/:publicId
router.delete('/documents/:publicId', verifyToken, async (req, res) => {
  try {
    const { publicId } = req.params;

    // Validate publicId — only allow alphanumeric, underscores, hyphens, forward slashes
    if (!publicId || !/^[a-zA-Z0-9_\/-]+$/.test(publicId) || publicId.includes('..')) {
      return res.status(400).json({ error: 'Invalid publicId format' });
    }

    const attachment = await Attachment.findOne({ publicId, ownerId: String(req.user.userId || req.user.email) });
    if (!attachment) return res.status(403).json({ error: 'Document not owned by this account' });
    const referenced = await Promise.all([Form.exists({ 'documents.publicId': publicId }), StudentForm.exists({ 'documents.publicId': publicId })]);
    if (referenced.some(Boolean)) return res.status(409).json({ error: 'Attached documents must be managed through their application' });
    await cloudinary.deleteDocument(attachment);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;

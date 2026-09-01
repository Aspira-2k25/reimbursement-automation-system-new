const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const { uploadFile } = require('../utils/cloudinary');
const { verifyToken } = require('../middleware/auth');
// Use memory storage for serverless - disk storage doesn't work in read-only filesystem
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/uploads/documents
router.post('/documents', verifyToken, upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Upload from memory buffer using helper function
    const uploadPromises = req.files.map(file =>
      uploadFile(file, {
        folder: 'reimbursement-Forms',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true
      })
    );

    const uploadedFiles = await Promise.all(uploadPromises);

    const documents = uploadedFiles.map(file => ({
      url: file.secure_url,
      publicId: file.public_id
    }));

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

    await cloudinary.uploader.destroy(publicId);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const upload = multer({ dest: 'uploads/' });

// POST /api/uploads/documents
router.post('/documents', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const uploadPromises = req.files.map(file =>
      cloudinary.uploader.upload(file.path, {
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
router.delete('/documents/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    await cloudinary.uploader.destroy(publicId);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
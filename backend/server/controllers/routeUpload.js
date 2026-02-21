const express = require("express");
const router = express.Router();
const cloudinary = require("../utils/cloudinary");
const { uploadFile } = require("../utils/cloudinary");
const upload = require("../middleware/multer");

router.post('/upload', upload.single('image'), async function (req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided"
      });
    }

    // Use uploadFile helper which handles both memory buffers (serverless) and file paths (local dev)
    const result = await uploadFile(req.file, {
      folder: 'reimbursement-Forms',
      resource_type: 'auto'
    });

    res.status(200).json({
      success: true,
      message: "Uploaded!",
      data: result
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: err.message
    });
  }
});

module.exports = router;

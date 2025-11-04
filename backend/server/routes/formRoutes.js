const express = require("express");
const router = express.Router();
const Form = require("../models/Form");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/multer");  // <-- multer setup
const cloudinary = require("../utils/cloudinary");

// POST /api/forms/submit
router.post(
    "/submit",
    authMiddleware.verifyToken,
    upload.fields([
        {name:"nptelResult", maxCount:1},
        {name: "idCard", maxCount:1}
    ]), //<<- multer handles file upload

    async (req, res) => {
  try {
    let userId = req.user.userId; // <-- get the logged-in user's ID from JWT

    // Debug logging
    console.log('User from JWT:', req.user);
    console.log('Extracted userId:', userId);

    // Fallback: if userId is null, use email as userId (for old JWT tokens)
    if (!userId && req.user.email) {
      userId = req.user.email;
      console.log('Using email as fallback userId:', userId);
    }

    // Validate userId is present
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    // Upload received files to Cloudinary (if present)
    let nptelResultUpload = null;
    let idCardUpload = null;

    if (req.files?.nptelResult?.[0]?.path) {
      nptelResultUpload = await cloudinary.uploader.upload(
        req.files.nptelResult[0].path,
        {
          folder: "reimbursement-Forms/Student_Form",
          resource_type: "image",
          use_filename: true,
          unique_filename: false
        }
      );
    }

    if (req.files?.idCard?.[0]?.path) {
      idCardUpload = await cloudinary.uploader.upload(
        req.files.idCard[0].path,
        {
          folder: "reimbursement-Forms/Student_Form",
          resource_type: "image",
          use_filename: true,
          unique_filename: false
        }
      );
    }

    const newForm = new Form({
      ...req.body,
      userId, // attach it to the form
      documents: [
        nptelResultUpload
          ? { url: nptelResultUpload.secure_url, publicId: nptelResultUpload.public_id }
          : null,
        idCardUpload
          ? { url: idCardUpload.secure_url, publicId: idCardUpload.public_id }
          : null
      ].filter(Boolean),
    });

    await newForm.save();
    res.status(201).json({ message: "Form saved successfully!", form: newForm });
  } catch (err) {
    console.error("Error saving form:", err);
    res.status(500).json({ error: "Failed to save form", details: err.message });
  }
});

module.exports = router;
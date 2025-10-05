const express = require("express");
const router = express.Router();
const Form = require("../models/Form");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");  // <-- multer setup

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

    const newForm = new Form({
      ...req.body,
      userId, // attach it to the form
      documents: [
        req.files.nptelResult
        ? { filename: req.files.nptelResult[0].filename, path: req.files.nptelResult[0].path }
        : null,
        req.files.idCard
        ? {filename: req.files.idCard[0].filename, path: req.files.idCard[0].path }
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
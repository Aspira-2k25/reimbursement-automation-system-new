// routes/studentFormRoutes.js
const express = require("express");
const router = express.Router();
const StudentForm = require("../models/StudentForm");
const authMiddleware = require("../middleware/auth");
const cloudinary = require("../utils/cloudinary");
const upload = require("../middleware/multer");


// POST /api/student-forms/submit
router.post(
  "/submit",
  authMiddleware.verifyToken,
  upload.fields([
    { name: "nptelResult", maxCount: 1 },
    { name: "idCard", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = req.user.userId || req.user.email || req.user.id;

      if (!userId) {
        return res.status(400).json({ error: "User ID not found in token" });
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

      const newStudentForm = new StudentForm({
        ...req.body,
        userId,
        documents: [
          nptelResultUpload
            ? { url: nptelResultUpload.secure_url, publicId: nptelResultUpload.public_id }
            : null,
          idCardUpload
            ? { url: idCardUpload.secure_url, publicId: idCardUpload.public_id }
            : null,
        ].filter(Boolean),
      });

      await newStudentForm.save();
      res.status(201).json({ message: "Student form submitted successfully!", form: newStudentForm });
    } catch (err) {
      console.error("Error saving student form:", err);
      res.status(500).json({ error: "Failed to save student form", details: err.message });
    }
  }
);

// GET /api/student-forms/mine - list forms for current user
router.get(
  "/mine",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.userId || req.user.email || req.user.id;
      if (!userId) {
        return res.status(400).json({ error: "User ID not found in token" });
      }

      // Try to find forms matching userId (could be numeric ID or email)
      // Convert userId to string for comparison since MongoDB might store it as string
      const userIdStr = String(userId);
      
      // Try multiple query patterns to handle different userId formats
      const forms = await StudentForm.find({ 
        $or: [
          { userId: userIdStr },
          { userId: userId },
          { userId: Number(userId) }
        ]
      }).sort({ createdAt: -1 });

      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching user forms:", err);
      res.status(500).json({ error: "Failed to fetch user forms", details: err.message });
    }
  }
);

// GET /api/student-forms/debug - Debug endpoint to see all forms (for troubleshooting)
router.get(
  "/debug",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.userId || req.user.email || req.user.id;
      
      // Get all forms (limited to 10 for debugging)
      const allForms = await StudentForm.find().limit(10).select('userId applicationId name createdAt');
      
      // Get forms for current user
      const userForms = await StudentForm.find({ 
        $or: [
          { userId: String(userId) },
          { userId: userId },
          { userId: Number(userId) }
        ]
      }).limit(10).select('userId applicationId name createdAt');
      
      return res.json({ 
        currentUserId: userId,
        userObject: req.user,
        allFormsSample: allForms,
        userForms: userForms,
        userFormsCount: userForms.length
      });
    } catch (err) {
      console.error("Error in debug endpoint:", err);
      res.status(500).json({ error: "Debug endpoint error", details: err.message });
    }
  }
);

// GET /api/student-forms/:id - fetch a specific form by Mongo _id
router.get(
  "/:id",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const form = await StudentForm.findById(req.params.id);
      if (!form) return res.status(404).json({ error: "Form not found" });
      // Optionally ensure users can only access their own form unless they have elevated roles
      const userId = req.user.userId || req.user.email;
      if (form.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      return res.json({ form });
    } catch (err) {
      console.error("Error fetching form by id:", err);
      res.status(500).json({ error: "Failed to fetch form", details: err.message });
    }
  }
);

module.exports = router;
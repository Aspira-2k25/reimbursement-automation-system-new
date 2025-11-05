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
      // Log the incoming request data
      console.log('Form submission received:', {
        body: req.body,
        files: req.files,
        user: req.user
      });

      const userId = req.user.userId || req.user.email;

      if (!userId) return res.status(400).json({ error: "User ID not found in token" });

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

      // Validate required fields before saving
      const requiredFields = ['name', 'studentId', 'division', 'email'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: "Missing required fields",
          fields: missingFields
        });
      }

      // Parse amount as number if present
      const formData = {
        ...req.body,
        amount: req.body.amount ? parseFloat(req.body.amount) : undefined
      };

      const newStudentForm = new StudentForm({
        ...formData,
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

      console.log('Attempting to save form:', newStudentForm);

      await newStudentForm.save();
      res.status(201).json({ message: "Student form submitted successfully!", form: newStudentForm });
    } catch (err) {
      console.error("Error saving student form:", err);
      
      // Handle mongoose validation errors
      if (err.name === 'ValidationError') {
        const validationErrors = Object.keys(err.errors).map(key => ({
          field: key,
          message: err.errors[key].message
        }));
        return res.status(400).json({
          error: "Validation failed",
          details: validationErrors
        });
      }
      
      // Handle file upload errors
      if (err.message && err.message.includes('Cloudinary')) {
        return res.status(500).json({
          error: "File upload failed",
          details: err.message
        });
      }

      res.status(500).json({
        error: "Failed to save student form",
        details: err.message,
        type: err.name
      });
    }
  }
);

// GET /api/student-forms/mine - list forms for current user
router.get(
  "/mine",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.userId || req.user.email;
      if (!userId) return res.status(400).json({ error: "User ID not found in token" });

      const forms = await StudentForm.find({ userId }).sort({ createdAt: -1 });
      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching user forms:", err);
      res.status(500).json({ error: "Failed to fetch user forms", details: err.message });
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
      if (form.userId !== userId && !['coordinator', 'hod', 'principal'].includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      return res.json({ form });
    } catch (err) {
      console.error("Error fetching form by id:", err);
      res.status(500).json({ error: "Failed to fetch form", details: err.message });
    }
  }
);

// PUT /api/student-forms/:id - update a specific form
router.put(
  "/:id",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const form = await StudentForm.findById(req.params.id);
      if (!form) return res.status(404).json({ error: "Form not found" });
      
      const userId = req.user.userId || req.user.email;
      if (form.userId !== userId && !['coordinator', 'hod', 'principal'].includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Prevent updating certain fields if not admin/coordinator
      const allowedUpdates = ['remarks'];
      if (['coordinator', 'hod', 'principal'].includes(req.user.role)) {
        allowedUpdates.push('status', 'reviewedBy', 'reviewedAt');
      }

      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      const updatedForm = await StudentForm.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      return res.json({ form: updatedForm });
    } catch (err) {
      console.error("Error updating form:", err);
      res.status(500).json({ error: "Failed to update form", details: err.message });
    }
  }
);

// DELETE /api/student-forms/:id - delete a specific form
router.delete(
  "/:id",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const form = await StudentForm.findById(req.params.id);
      if (!form) return res.status(404).json({ error: "Form not found" });
      
      const userId = req.user.userId || req.user.email;
      if (form.userId !== userId && !['coordinator', 'hod', 'principal'].includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Delete associated files from Cloudinary
      if (form.documents) {
        for (const doc of form.documents) {
          if (doc.publicId) {
            await cloudinary.uploader.destroy(doc.publicId);
          }
        }
      }

      await StudentForm.findByIdAndDelete(req.params.id);
      return res.json({ message: "Form deleted successfully" });
    } catch (err) {
      console.error("Error deleting form:", err);
      res.status(500).json({ error: "Failed to delete form", details: err.message });
    }
  }
);

module.exports = router;
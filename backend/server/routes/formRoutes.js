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

// GET /api/forms/:id - Get a specific form by ID
router.get("/:id", authMiddleware.verifyToken, async (req, res) => {
  try {
    const form = await Form.findOne({ applicationId: req.params.id });
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    // Check if user is authorized to view this form
    if (form.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized to view this form" });
    }
    res.json(form);
  } catch (err) {
    res.status(500).json({ error: "Error retrieving form" });
  }
});

// PUT /api/forms/:id - Update a form
router.put(
  "/:id",
  authMiddleware.verifyToken,
  upload.fields([
    { name: "nptelResult", maxCount: 1 },
    { name: "idCard", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const form = await Form.findOne({ applicationId: req.params.id });
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }
      // Check if user is authorized to edit this form
      if (form.userId !== req.user.userId) {
        return res.status(403).json({ error: "Not authorized to edit this form" });
      }

      // Upload new files if provided
      let nptelResultUpload = null;
      let idCardUpload = null;

      if (req.files?.nptelResult?.[0]?.path) {
        // Delete old file from Cloudinary if exists
        if (form.documents?.[0]?.publicId) {
          await cloudinary.uploader.destroy(form.documents[0].publicId);
        }
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
        // Delete old file from Cloudinary if exists
        if (form.documents?.[1]?.publicId) {
          await cloudinary.uploader.destroy(form.documents[1].publicId);
        }
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

      // Update form fields
      const updatedForm = await Form.findOneAndUpdate(
        { applicationId: req.params.id },
        {
          ...req.body,
          documents: [
            nptelResultUpload
              ? { url: nptelResultUpload.secure_url, publicId: nptelResultUpload.public_id }
              : form.documents[0],
            idCardUpload
              ? { url: idCardUpload.secure_url, publicId: idCardUpload.public_id }
              : form.documents[1]
          ].filter(Boolean),
        },
        { new: true }
      );

      res.json({ message: "Form updated successfully!", form: updatedForm });
    } catch (err) {
      console.error("Error updating form:", err);
      res.status(500).json({ error: "Failed to update form" });
    }
  }
);

// DELETE /api/forms/:id - Delete a form
router.delete("/:id", authMiddleware.verifyToken, async (req, res) => {
  try {
    const form = await Form.findOne({ applicationId: req.params.id });
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    // Check if user is authorized to delete this form
    if (form.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized to delete this form" });
    }

    // Delete files from Cloudinary if they exist
    if (form.documents) {
      for (const doc of form.documents) {
        if (doc.publicId) {
          await cloudinary.uploader.destroy(doc.publicId);
        }
      }
    }

    await Form.deleteOne({ applicationId: req.params.id });
    res.json({ message: "Form deleted successfully" });
  } catch (err) {
    console.error("Error deleting form:", err);
    res.status(500).json({ error: "Failed to delete form" });
  }
});

module.exports = router;
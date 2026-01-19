const express = require("express");
const router = express.Router();
const Form = require("../models/Form");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/multer");  // <-- multer setup
const cloudinary = require("../utils/cloudinary");
const { uploadFile } = require("../utils/cloudinary");

// POST /api/forms/submit
router.post(
  "/submit",
  authMiddleware.verifyToken,
  upload.fields([
    { name: "nptelResult", maxCount: 1 },
    { name: "idCard", maxCount: 1 }
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
      // Use memory buffer (serverless) or file path (local dev)
      let nptelResultUpload = null;
      let idCardUpload = null;

      if (req.files?.nptelResult?.[0]) {
        nptelResultUpload = await uploadFile(
          req.files.nptelResult[0],
          {
            folder: "reimbursement-Forms/Student_Form",
            resource_type: "image",
            use_filename: true,
            unique_filename: false
          }
        );
      }

      if (req.files?.idCard?.[0]) {
        idCardUpload = await uploadFile(
          req.files.idCard[0],
          {
            folder: "reimbursement-Forms/Student_Form",
            resource_type: "image",
            use_filename: true,
            unique_filename: false
          }
        );
      }

      // Determine initial status based on applicant type
      // HOD applications go directly to Principal (skip HOD review)
      let initialStatus = "Under HOD"; // Default for Faculty/Coordinator
      const applicantType = req.body.applicantType;

      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Applicant Type:', applicantType);
      console.log('User Role from JWT:', req.user.role);

      if (applicantType === 'HOD') {
        initialStatus = "Under Principal"; // HOD forms bypass HOD review
        console.log('HOD detected! Setting status to Under Principal');
      } else {
        console.log('Not HOD. Status will be:', initialStatus);
      }
      console.log('Final status being set:', initialStatus);

      const newForm = new Form({
        ...req.body,
        userId, // attach it to the form
        status: initialStatus, // Set based on applicant type (this should override model default)
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
      console.log('Form saved with status:', newForm.status);
      console.log('Form saved with applicantType:', newForm.applicantType);
      console.log('============================');
      res.status(201).json({ message: "Form saved successfully!", form: newForm });
    } catch (err) {
      console.error("Error saving form:", err);
      res.status(500).json({ error: "Failed to save form", details: err.message });
    }
  });

// GET /api/forms/mine - Get all forms for logged-in user
router.get("/mine", authMiddleware.verifyToken, async (req, res) => {
  try {
    let userId = req.user.userId;
    // Fallback for email-based IDs if needed
    if (!userId && req.user.email) {
      userId = req.user.email;
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID not found' });
    }

    const forms = await Form.find({ userId }).sort({ createdAt: -1 });
    res.json(forms);
  } catch (err) {
    console.error("Error fetching user forms:", err);
    res.status(500).json({ error: "Error retrieving forms" });
  }
});

// GET /api/forms/for-hod - Get faculty forms for HOD (status: Under HOD)
// IMPORTANT: Must be BEFORE /:id route to avoid being caught as a param
router.get("/for-hod", authMiddleware.verifyToken, async (req, res) => {
  try {
    // Only HODs and principals can access this endpoint
    const userRole = req.user.role?.toLowerCase();
    if (!['hod', 'principal'].includes(userRole)) {
      return res.status(403).json({ error: "Forbidden: Only HODs and principals can access this endpoint" });
    }

    // Get HOD's department for filtering
    const hodDepartment = req.user.department;
    console.log('HOD Department:', hodDepartment);

    // Build query: status "Under HOD" OR no status (old forms)
    let query = {
      $or: [
        { status: "Under HOD" },
        { status: { $exists: false } },
        { status: null }
      ]
    };

    // If HOD has a department, filter by it OR forms without department (Principal sees all)
    if (hodDepartment && userRole === 'hod') {
      query.$and = [
        query.$or ? { $or: query.$or } : {},
        {
          $or: [
            { department: hodDepartment },
            { department: { $exists: false } },
            { department: null },
            { department: "" }
          ]
        }
      ];
      delete query.$or;
    }

    console.log('Fetching faculty forms with query:', JSON.stringify(query));
    const forms = await Form.find(query).sort({ updatedAt: -1 });
    console.log('HOD Faculty forms found:', forms.length);

    return res.json({ forms });
  } catch (err) {
    console.error("Error fetching HOD faculty forms:", err);
    res.status(500).json({ error: "Failed to fetch HOD faculty forms", details: err.message });
  }
});

// GET /api/forms/approved - Get approved faculty forms
router.get("/approved", authMiddleware.verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    if (!['hod', 'principal', 'coordinator', 'faculty'].includes(userRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const forms = await Form.find({
      status: { $in: ["Under Principal", "Approved"] }
    }).sort({ updatedAt: -1 });

    return res.json({ forms });
  } catch (err) {
    console.error("Error fetching approved forms:", err);
    res.status(500).json({ error: "Failed to fetch approved forms" });
  }
});

// GET /api/forms/rejected - Get rejected faculty forms
router.get("/rejected", authMiddleware.verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    if (!['hod', 'principal', 'coordinator', 'faculty'].includes(userRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const forms = await Form.find({ status: "Rejected" }).sort({ updatedAt: -1 });
    return res.json({ forms });
  } catch (err) {
    console.error("Error fetching rejected forms:", err);
    res.status(500).json({ error: "Failed to fetch rejected forms" });
  }
});

// GET /api/forms/:id - Get a specific form by ID
router.get("/:id", authMiddleware.verifyToken, async (req, res) => {
  try {
    // Try to find by applicationId first, then by MongoDB _id
    let form = await Form.findOne({ applicationId: req.params.id });
    if (!form) {
      form = await Form.findById(req.params.id);
    }
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    // Get userId from token (handle both email-based and numeric IDs)
    const tokenUserId = req.user.userId || req.user.email || req.user.id;
    const formUserId = form.userId;
    const userRole = req.user.role?.toLowerCase();

    // Allow access if: owner OR HOD/Principal (they can view all forms)
    const isOwner = String(formUserId) === String(tokenUserId);
    const isAuthorizedRole = ['hod', 'principal'].includes(userRole);

    if (!isOwner && !isAuthorizedRole) {
      return res.status(403).json({ error: "Not authorized to view this form" });
    }
    res.json({ form });
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
      // Try to find by applicationId first, then by MongoDB _id
      let form = await Form.findOne({ applicationId: req.params.id });
      if (!form) {
        form = await Form.findById(req.params.id);
      }
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }
      // Get userId from token (handle both email-based and numeric IDs)
      const tokenUserId = req.user.userId || req.user.email || req.user.id;
      const formUserId = form.userId;
      const userRole = req.user.role?.toLowerCase();

      // Allow update if: owner OR HOD/Principal (they can update status)
      const isOwner = String(formUserId) === String(tokenUserId);
      const isAuthorizedRole = ['hod', 'principal'].includes(userRole);

      if (!isOwner && !isAuthorizedRole) {
        return res.status(403).json({ error: "Not authorized to edit this form" });
      }

      // Upload new files if provided
      // Use memory buffer (serverless) or file path (local dev)
      let nptelResultUpload = null;
      let idCardUpload = null;

      if (req.files?.nptelResult?.[0]) {
        // Delete old file from Cloudinary if exists
        if (form.documents?.[0]?.publicId) {
          await cloudinary.uploader.destroy(form.documents[0].publicId);
        }
        nptelResultUpload = await uploadFile(
          req.files.nptelResult[0],
          {
            folder: "reimbursement-Forms/Student_Form",
            resource_type: "image",
            use_filename: true,
            unique_filename: false
          }
        );
      }

      if (req.files?.idCard?.[0]) {
        // Delete old file from Cloudinary if exists
        if (form.documents?.[1]?.publicId) {
          await cloudinary.uploader.destroy(form.documents[1].publicId);
        }
        idCardUpload = await uploadFile(
          req.files.idCard[0],
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
    // Get userId from token (handle both email-based and numeric IDs)
    const tokenUserId = req.user.userId || req.user.email || req.user.id;
    const formUserId = form.userId;

    // Check if user is authorized to delete this form (normalize to strings for comparison)
    if (String(formUserId) !== String(tokenUserId)) {
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
const express = require("express");
const router = express.Router();
const Form = require("../models/Form");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/multer");  // <-- multer setup
const cloudinary = require("../utils/cloudinary");
const { uploadFile } = require("../utils/cloudinary");
const { generateApplicationId } = require("../utils/applicationIdGenerator");

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
            folder: "reimbursement-Forms/Faculty_Form",
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
            folder: "reimbursement-Forms/Faculty_Form",
            resource_type: "image",
            use_filename: true,
            unique_filename: false
          }
        );
      }

      // Determine initial status based on applicant type
      // HOD applications go directly to Principal (skip HOD review)
      let initialStatus = "Under HOD"; // Default for Faculty/Coordinator
      const applicantType = req.body.applicantType || 'Faculty';

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

      // Generate meaningful application ID
      // Format: F-NPT-2026-IT-001 (Faculty NPTEL 2026 IT Dept Sequence 1)
      const applicationId = await generateApplicationId({
        applicantType: applicantType,
        reimbursementType: req.body.reimbursementType || 'NPTEL',
        academicYear: req.body.academicYear,
        department: req.body.department || req.user.department
      }, Form);

      console.log('Generated Application ID:', applicationId);

      const newForm = new Form({
        ...req.body,
        applicationId, // Use generated ID
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
      console.log('Form saved with applicationId:', newForm.applicationId);
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

// GET /api/forms/for-principal - Get faculty forms awaiting principal approval
router.get("/for-principal", authMiddleware.verifyToken, async (req, res) => {
  try {
    // Only principals can access this endpoint
    const userRole = req.user.role?.toLowerCase();
    if (userRole !== 'principal') {
      return res.status(403).json({ error: "Forbidden: Only principals can access this endpoint" });
    }

    // Fetch forms with status "Under Principal" (awaiting principal approval)
    const forms = await Form.find({
      status: "Under Principal"
    }).sort({ updatedAt: -1 });

    console.log('Faculty forms for Principal found:', forms.length);
    return res.json({ forms });
  } catch (err) {
    console.error("Error fetching principal forms:", err);
    res.status(500).json({ error: "Failed to fetch principal forms" });
  }
});

// GET /api/forms/for-accounts - Get approved faculty forms for Accounts department
router.get("/for-accounts", authMiddleware.verifyToken, async (req, res) => {
  try {
    // Only accounts role can access this endpoint
    const userRole = req.user.role?.toLowerCase();
    if (userRole !== 'accounts') {
      return res.status(403).json({ error: "Forbidden: Only accounts department can access this endpoint" });
    }

    // Fetch forms with status "Approved" or "Disbursed" (for accounts processing)
    const forms = await Form.find({
      status: { $in: ["Approved", "Disbursed"] }
    }).sort({ updatedAt: -1 });

    console.log('Faculty forms for Accounts found:', forms.length);
    return res.json({ forms });
  } catch (err) {
    console.error("Error fetching accounts forms:", err);
    res.status(500).json({ error: "Failed to fetch accounts forms" });
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

      // Allow update if: owner OR HOD/Principal/Accounts (they can update status)
      const isOwner = String(formUserId) === String(tokenUserId);
      const isAuthorizedRole = ['hod', 'principal', 'accounts'].includes(userRole);

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
            folder: "reimbursement-Forms/Faculty_Form",
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
            folder: "reimbursement-Forms/Faculty_Form",
            resource_type: "image",
            use_filename: true,
            unique_filename: false
          }
        );
      }

      // Determine allowed updates based on user role and form status
      // Faculty/Coordinator/HOD (owners) can only edit their own pending/under-review forms
      // HOD can approve/reject "Under HOD" forms
      // Principal can approve/reject "Under Principal" forms
      let allowedUpdates = [];
      let statusValidation = null;

      if (isOwner) {
        // Owners can update form details only if status allows it
        if (['Under HOD', 'Under Principal'].includes(form.status)) {
          // Form is under review - owner can only update remarks
          allowedUpdates = ['remark'];
        } else if (form.status === 'Pending') {
          // Should not happen for faculty forms (they start at Under HOD), but handle it
          allowedUpdates = ['name', 'email', 'jobTitle', 'department', 'academicYear', 'amount', 'accountName', 'ifscCode', 'accountNumber', 'remark'];
        }
        // Owners cannot change status of their own forms
      }

      if (userRole === 'hod') {
        // HOD can approve/reject "Under HOD" forms (not their own)
        if (form.status === 'Under HOD' && !isOwner) {
          allowedUpdates = ['status', 'remark'];
          statusValidation = ['Under Principal', 'Rejected'];
        } else if (form.status === 'Under HOD' && isOwner) {
          // HOD's own form is Under HOD - they can't approve their own form
          // This shouldn't happen since HOD forms go directly to Principal
          return res.status(403).json({ error: 'Cannot modify your own form while under review' });
        }
      }

      if (userRole === 'principal') {
        // Principal can approve/reject "Under Principal" forms
        if (form.status === 'Under Principal') {
          allowedUpdates = ['status', 'remark', 'reviewedBy', 'reviewedAt'];
          statusValidation = ['Approved', 'Rejected'];
        } else {
          return res.status(403).json({ error: 'Principal can only approve/reject forms with status "Under Principal"' });
        }
      }

      if (userRole === 'accounts') {
        // Accounts can mark approved forms as disbursed
        if (form.status === 'Approved') {
          allowedUpdates = ['status', 'accountsComments'];
          statusValidation = ['Disbursed'];
        } else if (form.status === 'Disbursed') {
          return res.status(400).json({ error: 'This form has already been disbursed' });
        } else {
          return res.status(403).json({ error: 'Accounts can only process forms with status "Approved"' });
        }
      }

      // Validate status change if attempting to change status
      if (req.body.status && statusValidation) {
        if (!statusValidation.includes(req.body.status)) {
          return res.status(400).json({ 
            error: `Invalid status transition. Allowed: ${statusValidation.join(', ')}` 
          });
        }
      }

      // Build update object with only allowed fields
      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      // Handle document updates for owners
      if (isOwner && form.status === 'Pending') {
        if (nptelResultUpload) {
          updates.documents = updates.documents || [...(form.documents || [])];
          updates.documents[0] = { url: nptelResultUpload.secure_url, publicId: nptelResultUpload.public_id };
        }
        if (idCardUpload) {
          updates.documents = updates.documents || [...(form.documents || [])];
          updates.documents[1] = { url: idCardUpload.secure_url, publicId: idCardUpload.public_id };
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update or insufficient permissions' });
      }

      // Update form fields
      const updatedForm = await Form.findByIdAndUpdate(
        form._id,
        { $set: updates },
        { new: true, runValidators: true }
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

    await Form.findByIdAndDelete(form._id);
    res.json({ message: "Form deleted successfully" });
  } catch (err) {
    console.error("Error deleting form:", err);
    res.status(500).json({ error: "Failed to delete form" });
  }
});

module.exports = router;
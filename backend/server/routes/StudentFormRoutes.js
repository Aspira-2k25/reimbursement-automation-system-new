// routes/studentFormRoutes.js
const express = require("express");
const router = express.Router();
const StudentForm = require("../models/StudentForm");
const authMiddleware = require("../middleware/auth");
const cloudinary = require("../utils/cloudinary");
const { uploadFile } = require("../utils/cloudinary");
const upload = require("../middleware/multer");
const { generateApplicationId } = require("../utils/applicationIdGenerator");


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

      // Generate meaningful application ID
      // Format: S-NPT-2026-IT-001 (Student NPTEL 2026 IT Dept Sequence 1)
      const applicationId = await generateApplicationId({
        applicantType: 'Student',
        reimbursementType: req.body.reimbursementType || 'NPTEL',
        academicYear: req.body.academicYear,
        department: req.body.department
      }, StudentForm);

      console.log('Generated Application ID:', applicationId);

      const newStudentForm = new StudentForm({
        ...req.body,
        applicationId, // Use generated ID
        userId,
        status: "Pending", // Ensure status is Pending when student submits
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
      console.log('Form Application ID:', newStudentForm.applicationId);

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

// GET /api/student-forms/pending - Get pending requests for coordinators
router.get(
  "/pending",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      // Only coordinators, HODs, and principals can access this endpoint
      const userRole = req.user.role?.toLowerCase();
      if (!['coordinator', 'hod', 'principal'].includes(userRole)) {
        return res.status(403).json({ error: "Forbidden: Only coordinators, HODs, and principals can access this endpoint" });
      }

      // Fetch forms with status "Pending" (awaiting coordinator approval)
      const forms = await StudentForm.find({ status: "Pending" }).sort({ createdAt: -1 });

      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching pending forms:", err);
      res.status(500).json({ error: "Failed to fetch pending forms", details: err.message });
    }
  }
);

// GET /api/student-forms/approved - Get approved requests for coordinators
router.get(
  "/approved",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      // Only coordinators, HODs, and principals can access this endpoint
      const userRole = req.user.role?.toLowerCase();
      if (!['coordinator', 'hod', 'principal'].includes(userRole)) {
        return res.status(403).json({ error: "Forbidden: Only coordinators, HODs, and principals can access this endpoint" });
      }

      // Fetch forms with status "Under HOD", "Under Principal", or "Approved"
      const forms = await StudentForm.find({
        status: { $in: ["Under HOD", "Under Principal", "Approved"] }
      }).sort({ updatedAt: -1 });

      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching approved forms:", err);
      res.status(500).json({ error: "Failed to fetch approved forms", details: err.message });
    }
  }
);

// GET /api/student-forms/rejected - Get rejected requests for coordinators
router.get(
  "/rejected",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      // Only coordinators, HODs, and principals can access this endpoint
      const userRole = req.user.role?.toLowerCase();
      if (!['coordinator', 'hod', 'principal'].includes(userRole)) {
        return res.status(403).json({ error: "Forbidden: Only coordinators, HODs, and principals can access this endpoint" });
      }

      // Fetch forms with status "Rejected"
      const forms = await StudentForm.find({
        status: "Rejected"
      }).sort({ updatedAt: -1 });

      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching rejected forms:", err);
      res.status(500).json({ error: "Failed to fetch rejected forms", details: err.message });
    }
  }
);

// GET /api/student-forms/for-principal - Get requests approved by HOD (status: Under Principal)
router.get(
  "/for-principal",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      // Only principals can access this endpoint
      const userRole = req.user.role?.toLowerCase();
      if (userRole !== 'principal') {
        return res.status(403).json({ error: "Forbidden: Only principals can access this endpoint" });
      }

      // Fetch forms with status "Under Principal" (awaiting principal approval)
      const forms = await StudentForm.find({
        status: "Under Principal"
      }).sort({ updatedAt: -1 });

      console.log('Student forms for Principal found:', forms.length);
      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching principal forms:", err);
      res.status(500).json({ error: "Failed to fetch principal forms", details: err.message });
    }
  }
);

// GET /api/student-forms/for-accounts - Get approved requests for Accounts department
router.get(
  "/for-accounts",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      // Only accounts role can access this endpoint
      const userRole = req.user.role?.toLowerCase();
      if (userRole !== 'accounts') {
        return res.status(403).json({ error: "Forbidden: Only accounts department can access this endpoint" });
      }

      // Fetch forms with status "Approved" or "Disbursed" (for accounts processing)
      const forms = await StudentForm.find({
        status: { $in: ["Approved", "Disbursed"] }
      }).sort({ updatedAt: -1 });

      console.log('Student forms for Accounts found:', forms.length);
      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching accounts forms:", err);
      res.status(500).json({ error: "Failed to fetch accounts forms", details: err.message });
    }
  }
);

// GET /api/student-forms/for-hod - Get requests approved by coordinator (status: Under HOD)
router.get(
  "/for-hod",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      // Only HODs and principals can access this endpoint
      const userRole = req.user.role?.toLowerCase();
      if (!['hod', 'principal'].includes(userRole)) {
        return res.status(403).json({ error: "Forbidden: Only HODs and principals can access this endpoint" });
      }

      // Get HOD's department for filtering
      const hodDepartment = req.user.department;
      console.log('Student Forms - HOD Department:', hodDepartment);

      // Build query
      let query = { status: "Under HOD" };

      // If HOD has a department, filter by it OR forms without department (Principal sees all)
      if (hodDepartment && userRole === 'hod') {
        query = {
          $and: [
            { status: "Under HOD" },
            {
              $or: [
                { department: hodDepartment },
                { department: { $exists: false } },
                { department: null },
                { department: "" }
              ]
            }
          ]
        };
      }

      console.log('Fetching student forms with query:', JSON.stringify(query));
      const forms = await StudentForm.find(query).sort({ updatedAt: -1 });
      console.log('Student forms for HOD found:', forms.length);

      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching HOD forms:", err);
      res.status(500).json({ error: "Failed to fetch HOD forms", details: err.message });
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

// GET /api/student-forms/:id - fetch a specific form by Mongo _id or applicationId
router.get(
  "/:id",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      // Try to find by MongoDB _id first, then by applicationId
      let form = await StudentForm.findById(req.params.id);

      // If not found by _id, try applicationId
      if (!form) {
        form = await StudentForm.findOne({ applicationId: req.params.id });
      }

      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      // Check access permissions
      const userId = req.user.userId || req.user.email || req.user.id;
      const userRole = req.user.role?.toLowerCase();

      // Allow access if:
      // 1. User is the owner of the form
      // 2. User is a coordinator, HOD, principal, or accounts (they need to view requests)
      const isOwner = form.userId === userId;
      const isAdmin = ['coordinator', 'hod', 'principal', 'accounts'].includes(userRole);

      if (!isOwner && !isAdmin) {
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
      // Try to find by MongoDB _id first, then by applicationId
      let form = await StudentForm.findById(req.params.id);

      // If not found by _id, try applicationId
      if (!form) {
        form = await StudentForm.findOne({ applicationId: req.params.id });
      }

      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      // Use the MongoDB _id for the update
      const formId = form._id;

      const userId = req.user.userId || req.user.email || req.user.id;
      const isOwner = form.userId === userId;
      const userRole = req.user.role?.toLowerCase();
      const isAdmin = ['coordinator', 'hod', 'principal', 'accounts'].includes(userRole);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Determine allowed fields based on user role and form status
      let allowedUpdates = [];

      if (isOwner && form.status === 'Pending') {
        // Students can update their own pending forms (all editable fields)
        allowedUpdates = [
          'name', 'studentId', 'division', 'email', 'academicYear',
          'amount', 'accountName', 'ifscCode', 'accountNumber',
          'remarks', 'documents'
        ];
      } else if (isOwner) {
        // Students can only update remarks for non-pending forms
        allowedUpdates = ['remarks'];
      }

      if (userRole === 'coordinator') {
        // Coordinators can approve/reject pending requests and update status to "Under HOD" or "Rejected"
        if (form.status === 'Pending') {
          allowedUpdates = ['status', 'remarks'];
          // Validate status change - coordinators can only set to "Under HOD" or "Rejected"
          if (req.body.status && !['Under HOD', 'Rejected'].includes(req.body.status)) {
            return res.status(400).json({ error: 'Coordinators can only approve (Under HOD) or reject requests' });
          }
        } else {
          return res.status(403).json({ error: 'Coordinator can only approve/reject requests with status "Pending"' });
        }
      } else if (userRole === 'hod') {
        // HODs can approve/reject requests with status "Under HOD"
        if (form.status === 'Under HOD') {
          allowedUpdates = ['status', 'remarks'];
          // Validate status change - HODs can ONLY set to "Under Principal" or "Rejected" (cannot approve directly)
          if (req.body.status && !['Under Principal', 'Rejected'].includes(req.body.status)) {
            return res.status(400).json({ error: 'HOD must forward to Principal for final approval or reject. Cannot approve directly.' });
          }
        } else {
          return res.status(403).json({ error: 'HOD can only approve/reject requests with status "Under HOD"' });
        }
      } else if (userRole === 'principal') {
        // Principals can only approve/reject requests with status "Under Principal"
        if (form.status === 'Under Principal') {
          allowedUpdates = ['remarks', 'status', 'reviewedBy', 'reviewedAt'];
          // Validate status change - Principal can set to "Approved" or "Rejected"
          if (req.body.status && !['Approved', 'Rejected'].includes(req.body.status)) {
            return res.status(400).json({ error: 'Principal can only approve or reject requests' });
          }
        } else {
          return res.status(403).json({ error: 'Principal can only approve/reject requests with status "Under Principal"' });
        }
      } else if (userRole === 'accounts') {
        // Accounts can mark approved requests as disbursed
        if (form.status === 'Approved') {
          allowedUpdates = ['status', 'accountsComments'];
          // Validate status change - Accounts can only set to "Disbursed"
          if (req.body.status && req.body.status !== 'Disbursed') {
            return res.status(400).json({ error: 'Accounts can only mark approved requests as Disbursed' });
          }
        } else if (form.status === 'Disbursed') {
          // Already disbursed, no further updates allowed
          return res.status(400).json({ error: 'This request has already been disbursed' });
        } else {
          return res.status(403).json({ error: 'Accounts can only process requests with status "Approved"' });
        }
      }

      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      // Check if there are any updates to apply
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update or insufficient permissions" });
      }

      // Update updatedAt timestamp
      updates.updatedAt = new Date();

      const updatedForm = await StudentForm.findByIdAndUpdate(
        formId,
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
      // Try to find by MongoDB _id first, then by applicationId
      let form = await StudentForm.findById(req.params.id);
      if (!form) {
        form = await StudentForm.findOne({ applicationId: req.params.id });
      }
      if (!form) return res.status(404).json({ error: "Form not found" });

      const userId = req.user.userId || req.user.email || req.user.id;
      const userRole = req.user.role?.toLowerCase();
      if (form.userId !== userId && !['coordinator', 'hod', 'principal'].includes(userRole)) {
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

      await StudentForm.findByIdAndDelete(form._id);
      return res.json({ message: "Form deleted successfully" });
    } catch (err) {
      console.error("Error deleting form:", err);
      res.status(500).json({ error: "Failed to delete form", details: err.message });
    }
  }
);




module.exports = router;
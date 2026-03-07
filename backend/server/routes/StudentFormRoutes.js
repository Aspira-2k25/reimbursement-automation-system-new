// routes/studentFormRoutes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const StudentForm = require("../models/StudentForm");
const Form = require("../models/Form");
const authMiddleware = require("../middleware/auth");
const cloudinary = require("../utils/cloudinary");
const { uploadFile } = require("../utils/cloudinary");
const upload = require("../middleware/multer");
const { validateUploadedFiles } = require("../middleware/multer");
const { generateApplicationId } = require("../utils/applicationIdGenerator");
const notificationService = require('../utils/notificationService');
const dbUtils = require('../utils/database');
const { sanitizeString, sanitizeApplicationId, isValidObjectId, getDepartmentVariants, DEPARTMENT_ALIASES } = require('../utils/formHelpers');


// POST /api/student-forms/submit
router.post(
  "/submit",
  authMiddleware.verifyToken,
  upload.fields([
    { name: "nptelResult", maxCount: 1 },
    { name: "idCard", maxCount: 1 },
  ]),
  validateUploadedFiles, //<<- validate file content using magic numbers
  async (req, res) => {
    try {
      const userId = req.user.userId || req.user.email;

      if (!userId) return res.status(400).json({ error: "User ID not found in token" });

      // ── Daily submission limit: max 3 per student per day ──
      const MAX_DAILY_SUBMISSIONS = 3;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayCount = await StudentForm.countDocuments({
        userId: String(userId),
        createdAt: { $gte: todayStart }
      });

      if (todayCount >= MAX_DAILY_SUBMISSIONS) {
        return res.status(429).json({
          error: "Daily submission limit reached",
          message: `Students can submit a maximum of ${MAX_DAILY_SUBMISSIONS} forms per day. You have already submitted ${todayCount} today.`
        });
      }

      // Upload received files to Cloudinary in parallel (if present)
      const uploadPromises = [];
      if (req.files?.nptelResult?.[0]) {
        uploadPromises.push(
          uploadFile(req.files.nptelResult[0], {
            folder: "reimbursement-Forms/Student_Form",
            resource_type: "image",
            use_filename: true,
            unique_filename: false
          })
        );
      } else {
        uploadPromises.push(Promise.resolve(null));
      }
      if (req.files?.idCard?.[0]) {
        uploadPromises.push(
          uploadFile(req.files.idCard[0], {
            folder: "reimbursement-Forms/Student_Form",
            resource_type: "image",
            use_filename: true,
            unique_filename: false
          })
        );
      } else {
        uploadPromises.push(Promise.resolve(null));
      }
      const [nptelResultUpload, idCardUpload] = await Promise.all(uploadPromises);

      // Validate required fields before saving
      const requiredFields = ['name', 'studentId', 'division', 'email'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: "Missing required fields",
          fields: missingFields
        });
      }

      // Parse numeric fields
      const amount = req.body.amount ? parseInt(req.body.amount, 10) : undefined;
      const marks = req.body.marks ? parseFloat(req.body.marks) : undefined;

      // Generate Application ID and save with retry for duplicate prevention
      // Format: S-IT-NPT-2026-001 (Student, IT Dept, NPTEL, 2026, Global Sequence 1)
      const { savedDoc: newStudentForm } = await generateApplicationIdWithRetry(
        {
          applicantType: 'Student',
          reimbursementType: req.body.reimbursementType || 'NPTEL',
          academicYear: req.body.academicYear,
          department: req.body.department
        },
        [StudentForm, Form],
        (applicationId) => new StudentForm({
          ...req.body,
          amount,
          marks,
          applicationId,
          userId,
          status: "Pending",
          documents: [
            nptelResultUpload
              ? { url: nptelResultUpload.secure_url, publicId: nptelResultUpload.public_id }
              : null,
            idCardUpload
              ? { url: idCardUpload.secure_url, publicId: idCardUpload.public_id }
              : null,
          ].filter(Boolean),
        })
      );

      // submission notification
      await notificationService.createNotification({
        userId: userId,
        applicationId: newStudentForm.applicationId,
        type: 'submission',
        title: 'Application Submitted',
        message: `Your reimbursement application ${newStudentForm.applicationId} has been submitted successfully.`,
        phase: 'Student',
        status: 'Pending',
        userEmail: req.body.email || req.user.email,
        userName: req.body.name || req.user.username || 'Student',
        studentId: req.body.studentId,
        amount: req.body.amount,
      }, true); // Send email notification

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

      // Fetch forms with status "Under HOD", "Under Principal", "Approved", "Reimbursed", or "Disbursed"
      const forms = await StudentForm.find({
        status: { $in: ["Under HOD", "Under Principal", "Approved", "Reimbursed", "Disbursed"] }
      }).sort({ updatedAt: -1 });

      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching approved forms:", err);
      res.status(500).json({ error: "Failed to fetch approved forms", details: err.message });
    }
  }
);

// GET /api/student-forms/rejected - Get rejected requests based on role-specific visibility
// WORKFLOW: Rejected applications only visible up to the level that rejected them
router.get(
  "/rejected",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const userRole = req.user.role?.toLowerCase();
      if (!['coordinator', 'hod', 'principal', 'accounts'].includes(userRole)) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }

      // Build visibility query based on role
      // Coordinator sees: rejectedBy Coordinator
      // HOD sees: rejectedBy Coordinator OR HOD
      // Principal sees: rejectedBy Coordinator, HOD, OR Principal
      // Accounts sees: rejectedBy Accounts only (their own rejections)
      let rejectedByFilter = [];

      if (userRole === 'coordinator') {
        rejectedByFilter = ['Coordinator'];
      } else if (userRole === 'hod') {
        rejectedByFilter = ['Coordinator', 'HOD'];
      } else if (userRole === 'principal') {
        rejectedByFilter = ['Coordinator', 'HOD', 'Principal'];
      } else if (userRole === 'accounts') {
        rejectedByFilter = ['Accounts'];
      }

      const forms = await StudentForm.find({
        status: "Rejected",
        rejectedBy: { $in: rejectedByFilter }
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

      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching principal forms:", err);
      res.status(500).json({ error: "Failed to fetch principal forms", details: err.message });
    }
  }
);

// GET /api/student-forms/for-accounts - Get approved requests for Accounts department
// WORKFLOW: Accounts only sees applications approved by Principal, plus their own processed ones
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

      // Fetch forms:
      // - "Approved" (awaiting reimbursement)
      // - "Reimbursed" (successfully processed by Accounts)
      // - "Rejected" by Accounts only (not rejections from other levels)
      const forms = await StudentForm.find({
        $or: [
          { status: "Approved" },
          { status: "Reimbursed" },
          { status: "Rejected", rejectedBy: "Accounts" }
        ]
      }).sort({ updatedAt: -1 });

      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching accounts forms:", err);
      res.status(500).json({ error: "Failed to fetch accounts forms", details: err.message });
    }
  }
);

// Department aliases and helpers imported from ../utils/formHelpers

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

      // Build query
      let query = { status: "Under HOD" };

      // If HOD has a department, filter by it OR forms without department (Principal sees all)
      // Uses alias mapping so "IT" matches "Information Technology" and vice versa
      if (hodDepartment && userRole === 'hod') {
        const deptVariants = getDepartmentVariants(hodDepartment);
        // Build a case-insensitive regex that matches any variant
        const deptPattern = deptVariants
          .map(d => String(d).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|');
        const deptRegex = new RegExp(`^(${deptPattern})$`, 'i');

        query = {
          $and: [
            { status: "Under HOD" },
            {
              $or: [
                { department: { $in: deptVariants } },
                { department: { $regex: deptRegex } },
                { department: { $exists: false } },
                { department: null },
                { department: "" }
              ]
            }
          ]
        };
      }

      const forms = await StudentForm.find(query).sort({ updatedAt: -1 });

      return res.json({ forms });
    } catch (err) {
      console.error("Error fetching HOD forms:", err);
      res.status(500).json({ error: "Failed to fetch HOD forms", details: err.message });
    }
  }
);

// DEBUG ENDPOINT REMOVED - Security vulnerability
// Previous debug endpoint exposed sensitive form data
// If troubleshooting is needed, use proper logging and monitoring instead

// POST /api/student-forms/:id/documents - upload new documents for an existing form (for edit flow)
router.post(
  "/:id/documents",
  authMiddleware.verifyToken,
  upload.fields([
    { name: "nptelResult", maxCount: 1 },
    { name: "idCard", maxCount: 1 },
  ]),
  validateUploadedFiles, //<<- validate file content using magic numbers
  async (req, res) => {
    try {
      // Sanitize the ID parameter to prevent NoSQL injection
      const rawId = req.params.id;

      // Reject IDs that contain MongoDB operators
      if (typeof rawId === 'string' && /[${}]/.test(rawId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      let form = null;
      const sanitizedAppId = sanitizeApplicationId(rawId);

      if (isValidObjectId(rawId)) {
        form = await StudentForm.findById(rawId);
      }
      if (!form && sanitizedAppId) {
        form = await StudentForm.findOne({ applicationId: sanitizedAppId });
      }
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      const userId = req.user.userId || req.user.email || req.user.id;
      const userRole = req.user.role?.toLowerCase();
      const isOwner = String(form.userId) === String(userId);
      const isAdmin = ['coordinator', 'hod', 'principal', 'accounts', 'admin'].includes(userRole);
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Only owner can update documents when form is Pending
      if (form.status !== 'Pending' && !isAdmin) {
        return res.status(403).json({ error: "Cannot update documents for this form status" });
      }

      let nptelResultUpload = null;
      let idCardUpload = null;
      const docUploadPromises = [];
      if (req.files?.nptelResult?.[0]) {
        docUploadPromises.push(
          uploadFile(req.files.nptelResult[0], {
            folder: "reimbursement-Forms/Student_Form",
            resource_type: "image",
            use_filename: true,
            unique_filename: false,
          })
        );
      } else {
        docUploadPromises.push(Promise.resolve(null));
      }
      if (req.files?.idCard?.[0]) {
        docUploadPromises.push(
          uploadFile(req.files.idCard[0], {
            folder: "reimbursement-Forms/Student_Form",
            resource_type: "image",
            use_filename: true,
            unique_filename: false,
          })
        );
      } else {
        docUploadPromises.push(Promise.resolve(null));
      }
      [nptelResultUpload, idCardUpload] = await Promise.all(docUploadPromises);

      const documents = [...(form.documents || [])];
      if (nptelResultUpload) {
        documents[0] = { url: nptelResultUpload.secure_url, publicId: nptelResultUpload.public_id };
      }
      if (idCardUpload) {
        documents[1] = { url: idCardUpload.secure_url, publicId: idCardUpload.public_id };
      }

      return res.json({ documents });
    } catch (err) {
      console.error("Error uploading documents for student form:", err);
      res.status(500).json({ error: "Failed to upload documents", details: err.message });
    }
  }
);

// GET /api/student-forms/:id - fetch a specific form by Mongo _id or applicationId
router.get(
  "/:id",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      // Sanitize the ID parameter to prevent NoSQL injection
      const rawId = req.params.id;

      // Reject IDs that contain MongoDB operators
      if (typeof rawId === 'string' && /[${}]/.test(rawId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      // Try to find by MongoDB _id first (if valid), then by applicationId (sanitized)
      let form = null;
      const sanitizedAppId = sanitizeApplicationId(rawId);

      if (isValidObjectId(rawId)) {
        form = await StudentForm.findById(rawId);
      }

      // If not found by _id, try applicationId
      if (!form && sanitizedAppId) {
        form = await StudentForm.findOne({ applicationId: sanitizedAppId });
      }

      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      // Check access permissions (userId may be number in JWT; form.userId may be string or email)
      const userId = req.user.userId || req.user.email || req.user.id;
      const userRole = req.user.role?.toLowerCase();
      const isOwner =
        String(form.userId) === String(userId) ||
        (req.user.email && String(form.userId).toLowerCase() === String(req.user.email).toLowerCase());
      const isAdmin = ['coordinator', 'hod', 'principal', 'accounts', 'admin'].includes(userRole);

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
      // Sanitize the ID parameter to prevent NoSQL injection
      const rawId = req.params.id;

      // Reject IDs that contain MongoDB operators
      if (typeof rawId === 'string' && /[${}]/.test(rawId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }



      // Try to find by MongoDB _id first (if valid), then by applicationId (sanitized)
      let form = null;
      const sanitizedAppId = sanitizeApplicationId(rawId);

      if (isValidObjectId(rawId)) {
        form = await StudentForm.findById(rawId);
      }

      // If not found by _id, try applicationId
      if (!form && sanitizedAppId) {
        form = await StudentForm.findOne({ applicationId: sanitizedAppId });
      }

      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      // Use the MongoDB _id for the update
      const formId = form._id;

      const userId = req.user.userId || req.user.email || req.user.id;
      const userRole = req.user.role?.toLowerCase();
      // Match owner by userId or email (forms may store either from submit)
      const isOwner =
        String(form.userId) === String(userId) ||
        (req.user.email && String(form.userId).toLowerCase() === String(req.user.email).toLowerCase());
      const isAdmin = ['coordinator', 'hod', 'principal', 'accounts', 'admin'].includes(userRole);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Forbidden", message: "You can only edit your own applications." });
      }

      // Determine allowed fields based on user role and form status
      let allowedUpdates = [];

      if (isOwner && !req.body.status) {
        // Owners can only edit their form while status is still "Pending"
        // (before Coordinator takes any action). Once approved/rejected, editing is locked.
        if (form.status === 'Pending') {
          allowedUpdates = [
            'name', 'studentId', 'division', 'department', 'email', 'academicYear',
            'amount', 'accountName', 'ifscCode', 'accountNumber',
            'courseName', 'marks',
            'remarks', 'documents', 'reimbursementType'
          ];
        } else {
          return res.status(403).json({ error: 'Form can no longer be edited. Once an approver acts on a form, editing is permanently locked.' });
        }
      } else if (isOwner && req.body.status) {
        // Owners cannot change the status of their own forms
        return res.status(403).json({ error: 'Cannot change the status of your own form' });
      } else if (userRole === 'coordinator') {
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
        // Accounts can mark approved requests as reimbursed or rejected
        if (form.status === 'Approved') {
          allowedUpdates = ['status', 'accountsComments', 'accountsRemarks'];
          // Validate status change - Accounts can set to "Reimbursed" or "Rejected"
          if (req.body.status && !['Reimbursed', 'Rejected'].includes(req.body.status)) {
            return res.status(400).json({ error: 'Accounts can only mark approved requests as Reimbursed or Rejected' });
          }
        } else if (form.status === 'Reimbursed') {
          // Already reimbursed, no further updates allowed
          return res.status(400).json({ error: 'This request has already been reimbursed' });
        } else if (form.status === 'Disbursed') {
          // Already disbursed (legacy), no further updates allowed
          return res.status(400).json({ error: 'This request has already been processed' });
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



      // WORKFLOW: When rejecting, set rejectedBy to track which level rejected
      if (req.body.status === 'Rejected') {
        const roleMap = {
          'coordinator': 'Coordinator',
          'hod': 'HOD',
          'principal': 'Principal',
          'accounts': 'Accounts'
        };
        updates.rejectedBy = roleMap[userRole] || userRole;
        // Store rejection remarks if provided
        if (req.body.rejectionRemarks || req.body.remarks || req.body.accountsRemarks) {
          updates.rejectionRemarks = req.body.rejectionRemarks || req.body.remarks || req.body.accountsRemarks;
        }
      } else if (req.body.status && req.body.status !== 'Rejected') {
        // Clear rejection fields when approving/forwarding
        updates.rejectedBy = null;
        updates.rejectionRemarks = null;
      }

      // Check if there are any updates to apply
      if (Object.keys(updates).length === 0) {
        const hint = isOwner && form.status !== 'Pending'
          ? "You can only edit applications that are still Pending. After submission, only remarks can be updated."
          : "No valid fields to update or insufficient permissions.";
        return res.status(400).json({ error: "No valid fields to update", details: hint });
      }

      // Update updatedAt timestamp
      updates.updatedAt = new Date();

      const updatedForm = await StudentForm.findByIdAndUpdate(
        formId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      // Check if status changed and trigger notifications
      if (updates.status && updates.status !== form.status) {
        const newStatus = updates.status;

        // Determine phase based on who made the change
        let phase = '';
        if (userRole === 'coordinator') {
          phase = 'Coordinator';
        } else if (userRole === 'hod') {
          phase = 'HOD';
        } else if (userRole === 'principal') {
          phase = 'Principal';
        }

        // Determine notification type
        let notificationType = 'status_change';
        if (newStatus === 'Rejected') {
          notificationType = 'rejection';
        } else if (['Under HOD', 'Under Principal', 'Approved'].includes(newStatus)) {
          notificationType = 'approval';
        }

        // Priority: 1. Form Email, 2. Postgres Profile Email
        let userEmail = form.email;
        let userName = form.name;

        try {
          if (form.userId && !isNaN(form.userId)) {
            const staffUser = await dbUtils.getStaffProfile(form.userId);
            if (staffUser) {
              // Only fallback to staff profile email if form email is missing
              userEmail = userEmail || staffUser.email;
              userName = userName || staffUser.name;
            }
          }
        } catch (dbError) {
          console.error('Error fetching user details:', dbError);
        }

        // Create notification
        try {

          await notificationService.createNotification({
            userId: form.userId,
            applicationId: form.applicationId,
            type: notificationType,
            title: `Application ${newStatus === 'Rejected' ? 'Rejected' : 'Approved'}`,
            message: `Your reimbursement application ${form.applicationId} has been ${newStatus === 'Rejected' ? 'rejected' : 'approved'} at the ${phase} phase.`,
            phase: phase,
            status: newStatus,
            userEmail: userEmail,
            userName: userName,
            studentId: form.studentId,
            amount: form.amount,
            remarks: updates.remarks || form.remarks,
          }, true); // Send email notification

        } catch (notifError) {
          // Log but don't fail the request if notification fails
          console.error('[ERROR] Failed to create notification:', notifError);
        }
      }

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
      // Sanitize the ID parameter to prevent NoSQL injection
      const rawId = req.params.id;

      // Reject IDs that contain MongoDB operators
      if (typeof rawId === 'string' && /[${}]/.test(rawId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      // Try to find by MongoDB _id first (if valid), then by applicationId (sanitized)
      let form = null;
      const sanitizedAppId = sanitizeApplicationId(rawId);

      if (isValidObjectId(rawId)) {
        form = await StudentForm.findById(rawId);
      }

      if (!form && sanitizedAppId) {
        form = await StudentForm.findOne({ applicationId: sanitizedAppId });
      }
      if (!form) return res.status(404).json({ error: "Form not found" });

      const userId = String(req.user.userId || req.user.email || req.user.id);
      const userRole = req.user.role?.toLowerCase();
      const formUserId = String(form.userId);

      const isOwner = formUserId === userId;
      const isAuthorizedRole = ['coordinator', 'hod', 'principal'].includes(userRole);

      if (!isOwner && !isAuthorizedRole) {
        return res.status(403).json({ error: "Forbidden: Not authorized to delete this form" });
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
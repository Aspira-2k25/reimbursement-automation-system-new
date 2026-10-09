const express = require("express");
const router = express.Router();
const Form = require("../models/Form");
const StudentForm = require("../models/StudentForm");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/multer");  // <-- multer setup
const { validateUploadedFiles } = require("../middleware/multer");  // <-- file content validation
const cloudinary = require("../utils/cloudinary");
const { uploadFile } = require("../utils/cloudinary");
const { generateApplicationId } = require("../utils/applicationIdGenerator");
const notificationService = require('../utils/notificationService');
const { DEPARTMENT_LIST } = require('../constants/statusEnums');
const dbUtils = require('../utils/database');
const { parsePaginationParams, paginateQuery } = require('../utils/pagination');
const { sanitizeApplicationId, isValidObjectId, buildDepartmentFilter, getNormalizedDepartment, hasDepartmentAccess } = require('../utils/formHelpers');

const { applicantBody, validateSubmission, validateEdit, ownerSummary, paginatedForms } = require('../utils/formPolicy');

const documentKinds = ['nptelResult', 'idCard'];
function replacementDocuments(existing, uploads) {
  const documents = (existing || []).map((document, index) => ({
    ...(document.toObject ? document.toObject() : document),
    kind: document.kind || (existing.length === 2 ? documentKinds[index] : undefined)
  }));
  const obsolete = [];
  for (const [index, result] of uploads.entries()) {
    if (!result) continue;
    const kind = documentKinds[index];
    const slot = documents.findIndex(document => document.kind === kind);
    const replacement = cloudinary.toDocument(result, kind);
    if (slot < 0) documents.push(replacement);
    else { obsolete.push(documents[slot]); documents[slot] = replacement; }
  }
  return { documents, obsolete };
}
function ambiguousDocuments(form, req) {
  return req.files && Object.values(req.files).flat().length && form.documents?.length === 1 && !form.documents[0].kind;
}

// POST /api/forms/submit
router.post(
  "/submit",
  authMiddleware.verifyToken,
  authMiddleware.requireRole(['Faculty', 'Coordinator', 'HOD']),
  upload.fields([
    { name: "nptelResult", maxCount: 1 },
    { name: "idCard", maxCount: 1 }
  ]), //<<- multer handles file upload
  validateUploadedFiles, //<<- validate file content using magic numbers
  validateSubmission(false),

  async (req, res) => {
    const stagedUploads = [];
    let committed = false;
    try {
      let userId = req.user.userId; // <-- get the logged-in user's ID from JWT

      // Fallback: if userId is null, use email as userId (for old JWT tokens)
      if (!userId && req.user.email) {
        userId = req.user.email;
      }

      // Validate userId is present
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found in token' });
      }

      // Determine initial status based on applicant type
      // HOD applications go directly to Principal (skip HOD review)
      let initialStatus = "Under HOD"; // Default for Faculty/Coordinator
      const rawApplicantType = req.applicantType;
      // Normalize applicantType to match enum: Faculty, Coordinator, HOD
      const applicantTypeMap = { 'faculty': 'Faculty', 'coordinator': 'Coordinator', 'hod': 'HOD' };
      const applicantType = applicantTypeMap[rawApplicantType.toLowerCase()] || 'Faculty';

      if (applicantType === 'HOD') {
        initialStatus = "Under Principal"; // HOD forms bypass HOD review
      }

      // Parse numeric fields — preserving EXACT user input without rounding
      const amount = req.body.amount !== undefined ? Number(req.body.amount) : undefined;
      const marks = req.body.marks !== undefined ? Number(req.body.marks) : undefined;

      // Generate globally unique Application ID (atomic counter — no retries needed)
      // Format: F-COMP-NPT-2026-001 (Faculty, Comp Dept, NPTEL, 2026, Global Sequence 1)
      const normalizedDepartment = getNormalizedDepartment(req.user?.department);
      if (!normalizedDepartment || !DEPARTMENT_LIST.includes(normalizedDepartment)) {
        return res.status(400).json({
          error: 'Department is not configured for your account. Please contact administrator.'
        });
      }
      const applicationId = await generateApplicationId({
        applicantType: applicantType,
        reimbursementType: req.body.reimbursementType || 'NPTEL',
        academicYear: req.body.academicYear,
        department: normalizedDepartment
      });

      // Upload received files to Cloudinary in parallel (if present)
      const uploadPromises = [];
      if (req.files?.nptelResult?.[0]) {
        uploadPromises.push(
          uploadFile(req.files.nptelResult[0], {
            ownerId: String(req.user.userId || req.user.email),
            tracking: stagedUploads,
            folder: "reimbursement-Forms/Faculty_Form",
            resource_type: "image",
            use_filename: true,
            unique_filename: true
          })
        );
      } else {
        uploadPromises.push(Promise.resolve(null));
      }
      if (req.files?.idCard?.[0]) {
        uploadPromises.push(
          uploadFile(req.files.idCard[0], {
            ownerId: String(req.user.userId || req.user.email),
            tracking: stagedUploads,
            folder: "reimbursement-Forms/Faculty_Form",
            resource_type: "image",
            use_filename: true,
            unique_filename: true
          })
        );
      } else {
        uploadPromises.push(Promise.resolve(null));
      }
      const [nptelResultUpload, idCardUpload] = await cloudinary.uploadBatch(uploadPromises);

      const newForm = new Form({
        ...applicantBody(req.body),
        department: normalizedDepartment,
        amount,
        marks,
        applicationId,
        userId,
        applicantType,
        status: initialStatus,
        documents: [
          nptelResultUpload
            ? cloudinary.toDocument(nptelResultUpload, 'nptelResult')
            : null,
          idCardUpload
            ? cloudinary.toDocument(idCardUpload, 'idCard')
            : null
        ].filter(Boolean),
      });

      await newForm.save();
      committed = true;

      // Send email notification for submission
      try {
        await notificationService.createNotification({
          userId: userId,
          applicationId: newForm.applicationId,
          type: 'submission',
          title: 'Application Submitted',
          message: `Your reimbursement application ${newForm.applicationId} has been submitted successfully.`,
          phase: applicantType,
          status: initialStatus,
          userEmail: req.body.email || req.user.email,
          userName: req.body.name,
          amount: req.body.amount,
        }, true); // Send email notification
      } catch (notifErr) {
        console.error('Error sending submission notification:', notifErr);
        // Don't fail the form submission if notification fails
      }

      res.status(201).json({ message: "Form saved successfully!", form: newForm });
    } catch (err) {
      console.error("Error saving form:", err);
      res.status(500).json({ error: "Failed to save form" });
    } finally {
      if (!committed) await cloudinary.rollbackUploads(stagedUploads);
    }
  });

// GET /api/forms/mine - Get all forms for logged-in user (paginated)
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

    // Parse pagination parameters
    const pagination = parsePaginationParams(req.query, { defaultLimit: 20, maxLimit: 100 });

    // Use direct string match (after normalizeUserIds migration)
    const query = { userId: String(userId) };

    // Execute paginated query
    const result = await paginateQuery(
      Form,
      query,
      { sort: { createdAt: -1 } },
      pagination
    );

    res.json({
      forms: result.data,
      pagination: result.pagination,
      summary: await ownerSummary(Form, query)
    });
  } catch (err) {
    console.error("Error fetching user forms:", err);
    res.status(500).json({ error: "Error retrieving forms" });
  }
});

// Department aliases and helpers imported from ../utils/formHelpers

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
    const deptFilter = buildDepartmentFilter(userRole, hodDepartment);

    // Build strict intersection query
    // HODs only see Faculty forms ("Under HOD" status or old forms lacking status)
    const query = {
      $and: [
        {
          $or: [
            { status: "Under HOD" },
            { status: { $exists: false } },
            { status: null }
          ]
        },
        deptFilter
      ]
    };

    const result = await paginatedForms(Form, query, req, { sort: { updatedAt: -1 } });

    return res.json(result);
  } catch (err) {
    console.error("Error fetching HOD faculty forms:", err);
    res.status(500).json({ error: "Failed to fetch HOD faculty forms" });
  }
});

// GET /api/forms/approved - Get approved faculty forms
router.get("/approved", authMiddleware.verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    const userDepartment = req.user.department;
    const userId = req.user.userId || req.user.email;

    if (!['hod', 'principal', 'coordinator', 'faculty'].includes(userRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let query = { status: { $in: ["Under Principal", "Approved", "Reimbursed"] } };

    // Faculty: only see their own forms
    if (userRole === 'faculty') {
      query.userId = String(userId);
    }
    // Coordinator/HOD: only see forms from their department
    else if (['coordinator', 'hod'].includes(userRole)) {
      const deptFilter = buildDepartmentFilter(userRole, userDepartment);
      query = {
        $and: [
          { status: { $in: ["Under Principal", "Approved", "Reimbursed"] } },
          deptFilter
        ]
      };
    }
    // Principal: sees all (no additional filter)

    const result = await paginatedForms(Form, query, req, { sort: { updatedAt: -1 } });

    return res.json(result);
  } catch (err) {
    console.error("Error fetching approved forms:", err);
    res.status(500).json({ error: "Failed to fetch approved forms" });
  }
});

// GET /api/forms/rejected - Get rejected faculty forms based on workflow visibility
// WORKFLOW: Rejected applications only visible up to the level that rejected them
router.get("/rejected", authMiddleware.verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    if (!['hod', 'principal', 'coordinator', 'faculty', 'accounts'].includes(userRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Build visibility query based on role
    // Faculty workflow: Faculty → HOD → Principal → Accounts
    // HOD sees: rejectedBy HOD
    // Principal sees: rejectedBy HOD OR Principal
    // Accounts sees: rejectedBy Accounts only
    let rejectedByFilter = [];

    if (userRole === 'faculty' || userRole === 'coordinator') {
      // Faculty/Coordinator can see all rejections (their own forms)
      rejectedByFilter = ['HOD', 'Principal', 'Accounts'];
    } else if (userRole === 'hod') {
      rejectedByFilter = ['HOD'];
    } else if (userRole === 'principal') {
      rejectedByFilter = ['HOD', 'Principal'];
    } else if (userRole === 'accounts') {
      rejectedByFilter = ['Accounts'];
    }

    const deptFilter = buildDepartmentFilter(userRole, req.user.department);
    const query = {
      $and: [
        { status: "Rejected", rejectedBy: { $in: rejectedByFilter } },
        ['faculty', 'coordinator'].includes(userRole) ? { userId: String(req.user.userId || req.user.email) } : deptFilter
      ]
    };

    const result = await paginatedForms(Form, query, req, { sort: { updatedAt: -1 } });

    return res.json(result);
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

    // Fetch forms with status "Pending" (awaiting coordinator approval)
    // Exclude HOD's own forms from this list as they bypass coordinator
    const deptFilter = buildDepartmentFilter(userRole, req.user.department);
    const query = {
      $and: [
        { status: "Under Principal" },
        deptFilter
      ]
    };

    const result = await paginatedForms(Form, query, req, { sort: { updatedAt: -1 } });
    return res.json(result);
  } catch (err) {
    console.error("Error fetching principal forms:", err);
    res.status(500).json({ error: "Failed to fetch principal forms" });
  }
});

// GET /api/forms/for-accounts - Get approved faculty forms for Accounts department
// WORKFLOW: Accounts only sees applications approved by Principal, plus their own processed ones
router.get("/for-accounts", authMiddleware.verifyToken, async (req, res) => {
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
    const result = await paginatedForms(Form, {
      $or: [
        { status: "Approved" },
        { status: "Reimbursed" },
        { status: "Rejected", rejectedBy: "Accounts" }
      ]
    }, req, { sort: { updatedAt: -1 } });
    return res.json(result);
  } catch (err) {
    console.error("Error fetching accounts forms:", err);
    res.status(500).json({ error: "Failed to fetch accounts forms" });
  }
});


router.get('/history', authMiddleware.verifyToken, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    const allowed = ['faculty', 'coordinator', 'hod', 'principal', 'accounts'];
    if (!allowed.includes(role)) return res.status(403).json({ error: 'Forbidden' });
    const query = { userId: String(req.user.userId || req.user.email) };
    return res.json(await paginatedForms(Form, query, req));
  } catch (_) { res.status(503).json({ error: 'Applications unavailable. Please retry.' }); }
});

// GET /api/forms/:id - Get a specific form by ID
router.get("/:id", authMiddleware.verifyToken, async (req, res) => {
  try {
    const mongoose = require('mongoose');

    // Sanitize the ID parameter to prevent NoSQL injection
    const rawId = req.params.id;

    // Reject IDs that contain MongoDB operators
    if (typeof rawId === 'string' && /[${}]/.test(rawId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Try to find by applicationId first (sanitized), then by MongoDB _id
    const sanitizedAppId = sanitizeApplicationId(rawId);
    let form = null;

    if (sanitizedAppId) {
      form = await Form.findOne({ applicationId: sanitizedAppId });
    }

    if (!form) {
      // Only try findById if it's a valid ObjectId format
      if (isValidObjectId(rawId)) {
        form = await Form.findById(rawId);
      }
    }
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    // Get userId from token (handle both email-based and numeric IDs)
    const tokenUserId = req.user.userId || req.user.email || req.user.id;
    const formUserId = form.userId;
    const userRole = req.user.role?.toLowerCase();

    // Allow access if: owner OR Coordinator/HOD/Principal/Accounts (they can view all forms)
    const isOwner = String(formUserId) === String(tokenUserId);
    const isAuthorizedRole = ['hod', 'principal', 'accounts'].includes(userRole);

    if (!isOwner && !isAuthorizedRole) {
      return res.status(403).json({ error: "Not authorized to view this form" });
    }

    if (!hasDepartmentAccess(userRole, req.user.department, form.department)) {
      return res.status(403).json({ error: 'Not authorized for this department' });
    }

    res.json({ form });
  } catch (err) {
    console.error("Error retrieving form:", err);
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
  validateUploadedFiles, //<<- validate file content using magic numbers
  validateEdit,
  async (req, res) => {
    const stagedUploads = [];
    let committed = false;
    try {
      // Sanitize the ID parameter to prevent NoSQL injection
      const rawId = req.params.id;

      // Reject IDs that contain MongoDB operators
      if (typeof rawId === 'string' && /[${}]/.test(rawId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      // Try to find by applicationId first (sanitized), then by MongoDB _id
      const sanitizedAppId = sanitizeApplicationId(rawId);
      let form = null;

      if (sanitizedAppId) {
        form = await Form.findOne({ applicationId: sanitizedAppId });
      }

      if (!form && isValidObjectId(rawId)) {
        form = await Form.findById(rawId);
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

      if (!hasDepartmentAccess(userRole, req.user.department, form.department)) {
        return res.status(403).json({ error: 'Not authorized for this department' });
      }

      // Determine allowed updates based on user role and form status
      // Faculty/Coordinator/HOD (owners) can only edit their own pending/under-review forms
      // HOD can approve/reject "Under HOD" forms
      // Principal can approve/reject "Under Principal" forms
      let allowedUpdates = [];
      let statusValidation = null;

      if (isOwner && !req.body.status) {
        // Owners can update form details ONLY while the form is at its initial status
        // (i.e., before the first approver has taken any action).
        // Faculty/Coordinator forms start at "Under HOD", HOD forms start at "Under Principal".
        const initialStatus = form.applicantType === 'HOD' ? 'Under Principal' : 'Under HOD';
        if (form.status === initialStatus) {
          allowedUpdates = ['name', 'email', 'facultyId', 'academicYear', 'amount', 'accountName', 'ifscCode', 'accountNumber', 'courseName', 'marks', 'remark'];
        } else {
          return res.status(403).json({ error: 'Form can no longer be edited. Once an approver acts on a form, editing is permanently locked.' });
        }
      } else if (isOwner && req.body.status) {
        // Owners cannot change the status of their own forms
        return res.status(403).json({ error: 'Cannot change the status of your own form' });
      } else if (!isOwner) {
        // Non-owner authorized roles can only change status (approve/reject/reimburse)
        if (userRole === 'hod') {
          if (form.status === 'Under HOD') {
            allowedUpdates = ['status', 'remark'];
            statusValidation = ['Under Principal', 'Rejected'];
          } else {
            return res.status(403).json({ error: 'HOD can only approve/reject forms with status "Under HOD"' });
          }
        } else if (userRole === 'principal') {
          if (form.status === 'Under Principal') {
            allowedUpdates = ['status', 'remark', 'reviewedBy', 'reviewedAt'];
            statusValidation = ['Approved', 'Rejected'];
          } else {
            return res.status(403).json({ error: 'Principal can only approve/reject forms with status "Under Principal"' });
          }
        } else if (userRole === 'accounts') {
          if (form.status === 'Approved') {
            allowedUpdates = ['status', 'accountsComments', 'accountsRemarks'];
            statusValidation = ['Reimbursed', 'Rejected'];
          } else if (form.status === 'Reimbursed') {
            return res.status(400).json({ error: 'This form has already been reimbursed' });
          } else {
            return res.status(403).json({ error: 'Accounts can only process forms with status "Approved"' });
          }
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

      if (req.files && Object.values(req.files).flat().length && !isOwner) {
        return res.status(403).json({ error: 'Only the owner can replace documents' });
      }
      if (ambiguousDocuments(form, req)) return res.status(409).json({ error: 'Legacy attachment type is unknown. Contact administrator before replacing documents.' });

      // Upload new files if provided (parallel with old file cleanup)
      const updateUploadPromises = [];
      if (req.files?.nptelResult?.[0]) {
        updateUploadPromises.push(
          (async () => {
            return uploadFile(req.files.nptelResult[0], {
              ownerId: String(req.user.userId || req.user.email),
            tracking: stagedUploads,
            folder: "reimbursement-Forms/Faculty_Form",
              resource_type: "image",
              use_filename: true,
              unique_filename: true
            });
          })()
        );
      } else {
        updateUploadPromises.push(Promise.resolve(null));
      }
      if (req.files?.idCard?.[0]) {
        updateUploadPromises.push(
          (async () => {
            return uploadFile(req.files.idCard[0], {
              ownerId: String(req.user.userId || req.user.email),
            tracking: stagedUploads,
            folder: "reimbursement-Forms/Faculty_Form",
              resource_type: "image",
              use_filename: true,
              unique_filename: true
            });
          })()
        );
      } else {
        updateUploadPromises.push(Promise.resolve(null));
      }
      const [nptelResultUpload, idCardUpload] = await cloudinary.uploadBatch(updateUploadPromises);

      // Build update object with only allowed fields
      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });
      if (userRole === 'principal' && req.body.status) {
        updates.reviewedBy = String(req.user.userId || req.user.email);
        updates.reviewedAt = new Date();
      }

      const { documents, obsolete } = replacementDocuments(form.documents, [nptelResultUpload, idCardUpload]);
      if (nptelResultUpload || idCardUpload) updates.documents = documents;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update or insufficient permissions' });
      }

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
        if (req.body.rejectionRemarks || req.body.remark || req.body.accountsRemarks) {
          updates.rejectionRemarks = req.body.rejectionRemarks || req.body.remark || req.body.accountsRemarks;
        }
      } else if (req.body.status && req.body.status !== 'Rejected') {
        // Clear rejection fields when approving/forwarding
        updates.rejectedBy = null;
        updates.rejectionRemarks = null;
      }

      // Update form fields
      const updatedForm = await Form.findOneAndUpdate(
        { _id: form._id, status: form.status, updatedAt: form.updatedAt },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!updatedForm) return res.status(409).json({ error: 'Application changed. Refresh and retry.' });
      committed = true;
      for (const document of obsolete) {
        await cloudinary.deleteDocument(document, form.userId).catch(error => console.error('Deferred cleanup:', error.message));
      }
      // Send email notification for status changes
      if (updates.status && updates.status !== form.status) {
        try {
          const newStatus = updates.status;

          // Determine phase based on who made the change
          let phase = '';
          if (userRole === 'hod') {
            phase = 'HOD';
          } else if (userRole === 'principal') {
            phase = 'Principal';
          } else if (userRole === 'accounts') {
            phase = 'Accounts';
          }

          // Determine notification type
          let notificationType = 'status_change';
          if (newStatus === 'Rejected') {
            notificationType = 'rejection';
          } else if (newStatus === 'Reimbursed') {
            notificationType = 'reimbursed';
          } else if (['Under Principal', 'Approved'].includes(newStatus)) {
            notificationType = 'approval';
          }

          const statusWord = newStatus === 'Rejected'
            ? 'rejected'
            : newStatus === 'Reimbursed'
              ? 'reimbursed'
              : 'approved';
          const titleLabel = newStatus === 'Rejected'
            ? 'Rejected'
            : newStatus === 'Reimbursed'
              ? 'Reimbursed'
              : 'Approved';

          // Get user email from form or lookup
          let userEmail = form.email;
          let userName = form.name;

          // Try to get email from database if userId is numeric
          try {
            if (form.userId && !isNaN(form.userId)) {
              const staffUser = await dbUtils.getStaffProfile(form.userId);
              if (staffUser) {
                userEmail = userEmail || staffUser.email;
                userName = userName || staffUser.name;
              }
            }
          } catch (dbError) {
            console.error('Error fetching user details:', dbError);
          }

          // Create notification
          await notificationService.createNotification({
            userId: form.userId,
            applicationId: form.applicationId,
            type: notificationType,
            title: `Application ${titleLabel}`,
            message: `Your reimbursement application ${form.applicationId} has been ${statusWord} at the ${phase} phase.`,
            phase: phase,
            status: newStatus,
            userEmail: userEmail,
            userName: userName,
            amount: form.amount,
            remarks: updates.remark || form.remark,
          }, true); // Send email notification
        } catch (notifErr) {
          console.error('Error sending status notification:', notifErr);
          // Don't fail the update if notification fails
        }
      }

      res.json({ message: "Form updated successfully!", form: updatedForm });
    } catch (err) {
      console.error("Error updating form:", err);
      res.status(500).json({ error: "Failed to update form" });
    } finally {
      if (!committed) await cloudinary.rollbackUploads(stagedUploads);
    }
  }
);

// DELETE /api/forms/:id - Delete a form
router.delete("/:id", authMiddleware.verifyToken, async (req, res) => {
  try {
    // Sanitize the ID parameter to prevent NoSQL injection
    const rawId = req.params.id;

    // Reject IDs that contain MongoDB operators
    if (typeof rawId === 'string' && /[${}]/.test(rawId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Try to find by applicationId first (sanitized), then by MongoDB _id
    const sanitizedAppId = sanitizeApplicationId(rawId);
    let form = null;

    if (sanitizedAppId) {
      form = await Form.findOne({ applicationId: sanitizedAppId });
    }

    if (!form && isValidObjectId(rawId)) {
      form = await Form.findById(rawId);
    }
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    // Get userId from token (handle both email-based and numeric IDs)
    const tokenUserId = req.user.userId || req.user.email || req.user.id;
    const formUserId = form.userId;

    const userRole = req.user.role?.toLowerCase();
    const isOwner = String(formUserId) === String(tokenUserId);

    if (!isOwner) {
      return res.status(403).json({ error: "Only the form owner can delete this form" });
    }

    if (!hasDepartmentAccess(userRole, req.user.department, form.department)) {
      return res.status(403).json({ error: 'Not authorized for this department' });
    }

    const deletableStatuses = ['Under HOD'];
    if (!deletableStatuses.includes(form.status)) {
      return res.status(409).json({
        error: 'Form cannot be deleted after review has started. Use workflow actions instead.'
      });
    }

    const deleted = await Form.findOneAndDelete({ _id: form._id, userId: form.userId, status: form.status, updatedAt: form.updatedAt });
    if (!deleted) return res.status(409).json({ error: 'Application changed. Refresh and retry.' });
    // Delete files from Cloudinary if they exist
    if (form.documents) {
      for (const doc of form.documents) {
        if (doc.publicId) {
          await require('../utils/cloudinary').deleteDocument(doc, form.userId).catch(error => console.error('Deferred document cleanup:', error.message));
        }
      }
    }


    res.json({ message: "Form deleted successfully" });
  } catch (err) {
    console.error("Error deleting form:", err);
    res.status(500).json({ error: "Failed to delete form" });
  }
});

module.exports = router;

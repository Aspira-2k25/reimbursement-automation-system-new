const { FIELD_LENGTH_LIMITS } = require('../middleware/requestValidator');

// The supported NPTEL application has an institutional cap of INR 1,500.
const MAX_AMOUNT = 1500;
const applicantFields = ['name', 'email', 'facultyId', 'studentId', 'division', 'department',
  'academicYear', 'amount', 'accountName', 'ifscCode', 'accountNumber', 'courseName', 'marks',
  'reimbursementType', 'remark', 'remarks'];
const controlledFields = ['userId', 'applicationId', 'status', 'reviewedBy', 'reviewedAt', 'rejectedBy',
  'rejectionRemarks', 'accountsComments', 'accountsRemarks', 'documents'];

function applicantBody(body) {
  return Object.fromEntries(applicantFields.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
}

function validateFields(body, { submission = false, student = false } = {}) {
  if (body?.reimbursementType !== undefined && body.reimbursementType !== 'NPTEL') return 'Only NPTEL reimbursement is currently available';
  for (const [key, value] of Object.entries(body || {})) {
    if (['amount', 'marks'].includes(key)) continue;
    if (typeof value !== 'string' && !['reviewedAt'].includes(key)) return `${key} must be a string`;
    if (typeof value === 'string' && value.length > (FIELD_LENGTH_LIMITS[key] || 1000)) return `${key} is too long`;
  }
  if (submission) {
    for (const key of controlledFields) if (body[key] !== undefined) return `${key} is controlled by the server`;
    const required = ['name', 'email', 'courseName', 'amount', 'marks', 'accountName', 'accountNumber', 'ifscCode'];
    if (student) required.push('studentId', 'division');
    for (const key of required) if (body[key] === undefined || String(body[key]).trim() === '') return `${key} is required`;
  }
  for (const key of ['amount', 'marks']) {
    if (body[key] === undefined) continue;
    if (!['string', 'number'].includes(typeof body[key]) || String(body[key]).trim() === '') return `${key} must be numeric`;
    const value = Number(body[key]);
    if (!Number.isFinite(value)) return `${key} must be finite`;
    if (key === 'amount' && (value <= 0 || value > MAX_AMOUNT || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)) {
      return `Amount must be positive, at most ${MAX_AMOUNT}, with no more than two decimal places`;
    }
    if (key === 'marks' && (value < 0 || value > 100)) return 'Marks must be between 0 and 100';
  }
  if (body.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return 'Invalid email';
  return null;
}

function validateSubmission(student = false) {
  return (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    const type = student ? 'Student' : ({ faculty: 'Faculty', coordinator: 'Coordinator', hod: 'HOD' })[role];
    if (!type || (student && role !== 'student')) return res.status(403).json({ error: 'This applicant role cannot submit this form' });
    if (req.body.applicantType !== undefined && typeof req.body.applicantType !== 'string') return res.status(400).json({ error: 'Applicant type must be a string' });
    if (req.body.applicantType && req.body.applicantType.toLowerCase() !== type.toLowerCase()) {
      return res.status(403).json({ error: 'Applicant type must match your account' });
    }
    req.body.email = req.user.email;
    const error = validateFields(req.body, { submission: true, student });
    if (error) return res.status(400).json({ error });
    req.applicantType = type;
    next();
  };
}

function validateEdit(req, res, next) {
  if (req.body?.documents !== undefined) return res.status(400).json({ error: 'Use the document upload endpoint; storage identifiers cannot be submitted' });
  const error = validateFields(req.body);
  if (error) return res.status(400).json({ error });
  next();
}

async function ownerSummary(Model, ownerFilter) {
  const [row] = await Model.aggregate([
    { $match: ownerFilter },
    { $group: { _id: null, total: { $sum: 1 },
      approved: { $sum: { $cond: [{ $in: ['$status', ['Approved', 'Reimbursed']] }, 1, 0] } },
      pending: { $sum: { $cond: [{ $in: ['$status', ['Pending', 'Under Coordinator', 'Under HOD', 'Under Principal']] }, 1, 0] } },
      rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
      reimbursedAmount: { $sum: { $cond: [{ $eq: ['$status', 'Reimbursed'] }, '$amount', 0] } },
    } },
  ]);
  return row || { total: 0, approved: 0, pending: 0, rejected: 0, reimbursedAmount: 0 };
}

async function paginatedForms(Model, query, req, options = {}) {
  const { parsePaginationParams, paginateQuery } = require('./pagination');
  const pagination = parsePaginationParams(req.query, { defaultLimit: 20, maxLimit: 100 });
  const result = await paginateQuery(Model, query, { sort: options.sort || { updatedAt: -1 },
    select: options.documents ? '' : '-documents -accountNumber -ifscCode -accountName' }, pagination);
  return { forms: result.data, pagination: result.pagination };
}

module.exports = { MAX_AMOUNT, applicantBody, validateFields, validateSubmission, validateEdit, ownerSummary, paginatedForms };

const express = require('express');
const Form = require('../models/Form');
const StudentForm = require('../models/StudentForm');
const auth = require('../middleware/auth');
const { buildDepartmentFilter, getNormalizedDepartment } = require('../utils/formHelpers');
const { DEPARTMENT_LIST, REIMBURSEMENT_STATUS } = require('../constants/statusEnums');
const { parsePaginationParams, createPaginationMeta } = require('../utils/pagination');
const router = express.Router();
const pendingStatuses = ['Pending', 'Under Coordinator', 'Under HOD', 'Under Principal'];
const zeroSummary = { total: 0, pending: 0, approved: 0, rejected: 0, reimbursed: 0, totalAmount: 0, reimbursedAmount: 0 };
const badInput = message => Object.assign(new Error(message), { status: 400 });
const text = (query, key, max = 100) => {
  if (query[key] == null || query[key] === '') return '';
  if (typeof query[key] !== 'string' || query[key].length > max) throw badInput(`Invalid ${key} filter`);
  return query[key].trim();
};
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const visibility = user => {
  const role = user.role.toLowerCase();
  const statuses = role === 'coordinator' ? pendingStatuses.concat(['Approved', 'Reimbursed']) :
    role === 'hod' ? ['Under HOD', 'Under Principal', 'Approved', 'Reimbursed'] :
      role === 'principal' ? ['Under Principal', 'Approved', 'Reimbursed'] : ['Approved', 'Reimbursed'];
  const rejected = role === 'coordinator' ? ['Coordinator'] : role === 'hod' ? ['Coordinator', 'HOD'] :
    role === 'principal' ? ['HOD', 'Principal'] : ['Accounts'];
  if (['hod', 'coordinator'].includes(role) && !user.department) {
    throw Object.assign(new Error('Department is not configured for this account'), { status: 403 });
  }
  return { $and: [buildDepartmentFilter(user.role, user.department),
    { $or: [{ status: { $in: statuses } }, { status: 'Rejected', rejectedBy: { $in: rejected } }] }] };
};
const filters = (user, query) => {
  const clauses = [visibility(user)];
  const role = user.role.toLowerCase();
  const requestedStatus = text(query, 'status');
  if (requestedStatus && requestedStatus.toLowerCase() !== 'all') {
    if (requestedStatus.toLowerCase() === 'pending') {
      clauses.push({ status: { $in: role === 'coordinator' ? ['Pending', 'Under Coordinator'] :
        role === 'hod' ? ['Under HOD'] : role === 'principal' ? ['Under Principal'] : ['Approved'] } });
    } else if (requestedStatus.toLowerCase() === 'approved-history') {
      clauses.push({ status: { $in: role === 'coordinator' ? ['Under HOD', 'Under Principal', 'Approved', 'Reimbursed'] :
        role === 'hod' ? ['Under Principal', 'Approved', 'Reimbursed'] : ['Approved', 'Reimbursed'] } });
    } else {
      const status = Object.values(REIMBURSEMENT_STATUS).find(value => value.toLowerCase() === requestedStatus.toLowerCase());
      if (!status) throw badInput('Invalid status filter');
      clauses.push({ status });
    }
  }
  const requestedDepartment = text(query, 'department');
  if (requestedDepartment && requestedDepartment.toLowerCase() !== 'all') {
    const department = getNormalizedDepartment(requestedDepartment);
    if (!DEPARTMENT_LIST.includes(department)) throw badInput('Invalid department filter');
    if (['principal', 'accounts'].includes(role)) clauses.push(buildDepartmentFilter('HOD', department));
    else if (department !== getNormalizedDepartment(user.department)) {
      throw Object.assign(new Error('Department access denied'), { status: 403 });
    }
  }
  const search = text(query, 'search');
  if (search) {
    const regex = new RegExp(escaped(search), 'i');
    clauses.push({ $or: ['name', 'applicationId', 'email', 'courseName', 'studentId', 'facultyId']
      .map(field => ({ [field]: regex })) });
  }
  const category = text(query, 'category');
  const applicantType = text(query, 'applicantType');
  if (applicantType && applicantType.toLowerCase() !== 'all') {
    const normalized = ['Student', 'Faculty', 'Coordinator', 'HOD'].find(value => value.toLowerCase() === applicantType.toLowerCase());
    if (!normalized) throw badInput('Invalid applicant type');
  }
  if (category && category.toLowerCase() !== 'all') clauses.push({ reimbursementType: new RegExp(`^${escaped(category)}$`, 'i') });
  const createdAt = {};
  for (const [key, operator] of [['startDate', '$gte'], ['endDate', '$lte']]) {
    const value = text(query, key, 40);
    if (!value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badInput(`Invalid ${key}`);
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw badInput(`Invalid ${key}`);
    if (key === 'endDate') date.setUTCHours(23, 59, 59, 999);
    createdAt[operator] = date;
  }
  if (createdAt.$gte && createdAt.$lte && createdAt.$gte > createdAt.$lte) throw badInput('Invalid date range');
  if (Object.keys(createdAt).length) clauses.push({ createdAt });
  return { $and: clauses };
};
const projection = role => {
  const excluded = { documents: 0, __v: 0 };
  if (role !== 'accounts') Object.assign(excluded, { accountName: 0, accountNumber: 0, ifscCode: 0 });
  return { $project: excluded };
};
const collectionPipeline = (filter, student, role, applicantType) => [
  { $match: filter }, projection(role),
  { $set: { formType: student ? 'student' : 'faculty', documenttype: student ? 'student' : 'faculty',
    applicantType: student ? 'Student' : { $ifNull: ['$applicantType', 'Faculty'] } } },
  ...(applicantType ? [{ $match: { applicantType } }] : []),
];
const combined = (user, query) => {
  const role = user.role.toLowerCase();
  const filter = filters(user, query);
  const type = text(query, 'applicantType');
  const applicantType = ['Student', 'Faculty', 'Coordinator', 'HOD'].find(value => value.toLowerCase() === type.toLowerCase());
  if (role === 'coordinator') return { model: StudentForm, pipeline: collectionPipeline(filter, true, role, applicantType) };
  return { model: Form, pipeline: [
    ...collectionPipeline(filter, false, role, applicantType),
    { $unionWith: { coll: StudentForm.collection.name, pipeline: collectionPipeline(filter, true, role, applicantType) } },
  ] };
};
const summaryGroup = { $group: {
  _id: null, total: { $sum: 1 },
  pending: { $sum: { $cond: [{ $in: ['$status', pendingStatuses] }, 1, 0] } },
  approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
  rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
  reimbursed: { $sum: { $cond: [{ $eq: ['$status', 'Reimbursed'] }, 1, 0] } },
  totalAmount: { $sum: '$amount' },
  reimbursedAmount: { $sum: { $cond: [{ $eq: ['$status', 'Reimbursed'] }, '$amount', 0] } },
} };
const summary = data => {
  if (!data?.length) return { ...zeroSummary };
  const { _id, ...counts } = data[0];
  return counts;
};
const bucket = field => [
  { $group: { _id: { $ifNull: [field, 'Unspecified'] }, count: { $sum: 1 }, totalAmount: { $sum: '$amount' },
    reimbursedAmount: { $sum: { $cond: [{ $eq: ['$status', 'Reimbursed'] }, '$amount', 0] } } } },
  { $sort: { _id: 1 } },
];
const handleFailure = (res, error) => {
  const status = [400, 403].includes(error.status) ? error.status : 503;
  return res.status(status).json({ error: status === 503 ? 'Dashboard service unavailable. Please retry.' : error.message });
};
router.use(auth.verifyToken, auth.requireRole(['Coordinator', 'HOD', 'Principal', 'Accounts']));
router.get('/analytics', async (req, res) => {
  try {
    const { model, pipeline } = combined(req.user, req.query);
    const [data = {}] = await model.aggregate([...pipeline, { $facet: {
      summary: [summaryGroup], byStatus: bucket('$status'), byDepartment: bucket('$department'),
      byCategory: bucket('$reimbursementType'),
      monthly: [
        { $match: { createdAt: { $type: 'date' } } },
        ...bucket({ $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } }),
      ],
    } }]).option({ maxTimeMS: 10000 });
    return res.json({ summary: summary(data.summary), byStatus: data.byStatus || [],
      byDepartment: data.byDepartment || [], byCategory: data.byCategory || [], monthly: data.monthly || [] });
  } catch (error) { return handleFailure(res, error); }
});
router.get('/', async (req, res) => {
  try {
    for (const key of ['page', 'limit']) {
      const value = text(req.query, key, 10);
      if (value && (!/^\d+$/.test(value) || Number(value) < 1 || !Number.isSafeInteger(Number(value)))) throw badInput(`Invalid ${key}`);
    }
    const pagination = parsePaginationParams(req.query, { defaultLimit: 20, maxLimit: 100 });
    if (!Number.isSafeInteger(pagination.skip)) throw badInput('Invalid page');
    const { model, pipeline } = combined(req.user, req.query);
    const [data = {}] = await model.aggregate([...pipeline, { $facet: {
      forms: [{ $sort: { createdAt: -1, formType: 1, _id: -1 } }, { $skip: pagination.skip }, { $limit: pagination.limit }],
      summary: [summaryGroup],
    } }]).option({ maxTimeMS: 10000 });
    const totals = summary(data.summary);
    return res.json({ forms: data.forms || [], pagination: createPaginationMeta(pagination.page, pagination.limit, totals.total), summary: totals });
  } catch (error) { return handleFailure(res, error); }
});
module.exports = router;

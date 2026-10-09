export const nptelSteps = [
  { title: 'Applicant', description: 'Check your identity and institutional details.', fields: ['name','email','studentId','facultyId','division','department'] },
  { title: 'Course & claim', description: 'Enter the NPTEL course, result and reimbursement amount.', fields: ['academicYear','courseName','marks','amount','reimbursementType'] },
  { title: 'Bank', description: 'Check the account that should receive the reimbursement.', fields: ['accountName','ifscCode','accountNumber'] },
  { title: 'Documents', description: 'Add your NPTEL result and institute ID. PDF, JPEG or PNG; up to 1 MB each.', fields: ['nptelResult','idCard'] },
];
export const selectFormErrors = (errors, fields) => fields
  ? Object.fromEntries(Object.entries(errors).filter(([field]) => fields.includes(field)))
  : errors;
export function previewDocuments(existing = [], uploads = {}, applicantType = 'Faculty') {
  const labelled = existing.map((document, index) => ({ ...document,
    kind: document.kind || (existing.length === 2 && existing.every(item => !item.kind) ? (index ? 'idCard' : 'nptelResult') : null),
  }));
  const documents = [
    { kind: 'nptelResult', label: 'NPTEL result' },
    { kind: 'idCard', label: applicantType === 'Student' ? 'Student ID card' : 'Institute ID card' },
  ].map(item => ({ ...labelled.find(document => document.kind === item.kind), ...item, file: uploads[item.kind] || null }));
  return [...documents, ...labelled.filter(item => !['nptelResult','idCard'].includes(item.kind)).map(item => ({ ...item, label: 'Existing supporting document' }))];
}

// Initial state defaults for Principal Dashboard
// Contains only essential default values - no mock/sample data

export const initialPrincipalData = {
  // User profile defaults - will be populated from AuthContext
  userProfile: {
    fullName: '',
    college: '',
    designation: 'Principal',
    role: 'Principal',
    email: '',
    phone: '',
    joinDate: '',
    employeeId: ''
  },

  // Standard departments list
  departments: [
    {
      id: 'ce',
      name: 'Computer Engineering',
      hod: { name: '', email: '', phone: '' },
      facultyCount: 0,
      studentCount: 0
    },
    {
      id: 'it',
      name: 'Information Technology',
      hod: { name: '', email: '', phone: '' },
      facultyCount: 0,
      studentCount: 0
    },
    {
      id: 'cse-aiml',
      name: 'CSE AI and ML',
      hod: { name: '', email: '', phone: '' },
      facultyCount: 0,
      studentCount: 0
    },
    {
      id: 'cse-ds',
      name: 'CSE Data Science',
      hod: { name: '', email: '', phone: '' },
      facultyCount: 0,
      studentCount: 0
    },
    {
      id: 'civil',
      name: 'Civil Engineering',
      hod: { name: '', email: '', phone: '' },
      facultyCount: 0,
      studentCount: 0
    },
    {
      id: 'mech',
      name: 'Mechanical Engineering',
      hod: { name: '', email: '', phone: '' },
      facultyCount: 0,
      studentCount: 0
    }
  ],

  // Empty array - populated from API
  allRequests: [],

  notifications: []
}

/**
 * Calculate statistics from requests array
 * @param {Array} requests - Array of request objects
 * @returns {Object} Statistics object
 */
export function calculateStats(requests = []) {
  const total = requests.length
  
  // Count by status
  const pending = requests.filter(r => r.status === 'Under Principal').length
  const approved = requests.filter(r => r.status === 'Approved' || r.status === 'Reimbursed').length
  const rejected = requests.filter(r => r.status === 'Rejected').length

  // Parse amounts - handle both ₹1,000 format and raw numbers
  const parseAmount = (amt) => {
    if (typeof amt === 'number') return amt
    if (typeof amt === 'string') {
      return parseFloat(amt.replace(/[₹,]/g, '')) || 0
    }
    return 0
  }

  // Calculate amounts
  const totalAmount = requests.reduce((sum, r) => sum + parseAmount(r.amount), 0)
  const approvedAmount = requests
    .filter(r => r.status === 'Approved' || r.status === 'Reimbursed')
    .reduce((sum, r) => sum + parseAmount(r.amount), 0)
  const pendingAmount = requests
    .filter(r => r.status === 'Under Principal')
    .reduce((sum, r) => sum + parseAmount(r.amount), 0)

  // Calculate rates
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0

  return {
    total,
    pending,
    approved,
    rejected,
    totalAmount: Math.round(totalAmount),
    approvedAmount: Math.round(approvedAmount),
    pendingAmount: Math.round(pendingAmount),
    approvalRate
  }
}

/**
 * Filter requests by status
 * @param {Array} requests - Array of request objects
 * @param {string} status - Status to filter by
 * @returns {Array} Filtered requests
 */
export function getRequestsByStatus(requests = [], status) {
  if (!status || status === 'All') return requests
  return requests.filter(r => r.status === status)
}

/**
 * Filter requests by department
 * @param {Array} requests - Array of request objects
 * @param {string} department - Department to filter by
 * @returns {Array} Filtered requests
 */
export function getRequestsByDepartment(requests = [], department) {
  if (!department || department === 'All') return requests
  return requests.filter(r => r.department === department)
}

/**
 * Filter requests by applicant type
 * @param {Array} requests - Array of request objects
 * @param {string} type - Type to filter by (Student, Faculty, All)
 * @returns {Array} Filtered requests
 */
export function getRequestsByType(requests = [], type) {
  if (!type || type === 'All') return requests
  return requests.filter(r => r.applicantType === type)
}

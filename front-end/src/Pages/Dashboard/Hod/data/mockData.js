// Initial state defaults for HOD Dashboard
// Contains only essential default values - no mock/sample data

export const initialHodData = {
  // User profile defaults - will be populated from AuthContext
  userProfile: {
    fullName: '',
    department: '',
    designation: 'Head of Department',
    role: 'HOD',
    email: '',
    phone: '',
    joinDate: '',
    employeeId: ''
  },

  // Empty array - populated from API
  allRequests: [],

  // Empty array - populated from API
  departmentMembers: [],

  // All departments data for overview - real data populated dynamically
  allDepartmentsData: [
    {
      id: 1,
      name: 'Information Technology',
      code: 'IT',
      hod: 'HOD',
      totalRequests: 0,
      pendingRequests: 0,
      underPrincipal: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      totalDisbursed: 0,
      approvalRate: 0,
      facultyRequests: 0,
      studentRequests: 0,
      isOwnDepartment: false
    },
    {
      id: 2,
      name: 'Computer Engineering',
      code: 'CE',
      hod: 'HOD',
      totalRequests: 0,
      pendingRequests: 0,
      underPrincipal: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      totalDisbursed: 0,
      approvalRate: 0,
      facultyRequests: 0,
      studentRequests: 0,
      isOwnDepartment: false
    },
    {
      id: 3,
      name: 'CSE AI and ML',
      code: 'AIML',
      hod: 'HOD',
      totalRequests: 0,
      pendingRequests: 0,
      underPrincipal: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      totalDisbursed: 0,
      approvalRate: 0,
      facultyRequests: 0,
      studentRequests: 0,
      isOwnDepartment: false
    },
    {
      id: 4,
      name: 'CSE Data Science',
      code: 'DS',
      hod: 'HOD',
      totalRequests: 0,
      pendingRequests: 0,
      underPrincipal: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      totalDisbursed: 0,
      approvalRate: 0,
      facultyRequests: 0,
      studentRequests: 0,
      isOwnDepartment: false
    },
    {
      id: 5,
      name: 'Civil Engineering',
      code: 'CVL',
      hod: 'HOD',
      totalRequests: 0,
      pendingRequests: 0,
      underPrincipal: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      totalDisbursed: 0,
      approvalRate: 0,
      facultyRequests: 0,
      studentRequests: 0,
      isOwnDepartment: false
    },
    {
      id: 6,
      name: 'Mechanical Engineering',
      code: 'MECH',
      hod: 'HOD',
      totalRequests: 0,
      pendingRequests: 0,
      underPrincipal: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      totalDisbursed: 0,
      approvalRate: 0,
      facultyRequests: 0,
      studentRequests: 0,
      isOwnDepartment: false
    }
  ],

  notifications: []
}

// Standard departments list
export const departments = [
  { id: 1, name: 'Computer Engineering', code: 'CE' },
  { id: 2, name: 'Information Technology', code: 'IT' },
  { id: 3, name: 'CSE AI and ML', code: 'AIML' },
  { id: 4, name: 'CSE Data Science', code: 'DS' },
  { id: 5, name: 'Civil Engineering', code: 'CVL' },
  { id: 6, name: 'Mechanical Engineering', code: 'MECH' }
]

/**
 * Calculate statistics from requests array
 * @param {Array} requests - Array of request objects
 * @returns {Object} Statistics object
 */
export function calculateStats(requests = []) {
  const total = requests.length

  // Parse amounts - handle both ₹1,000 format and raw numbers
  const parseAmount = (amt) => {
    if (typeof amt === 'number') return amt
    if (typeof amt === 'string') {
      return parseFloat(amt.replace(/[₹,]/g, '')) || 0
    }
    return 0
  }

  // Count by status
  const pendingStatuses = ['Pending', 'Under HOD', 'Under Coordinator']
  const postHodStatuses = ['Under Principal', 'Approved', 'Reimbursed']

  const pending = requests.filter(r => pendingStatuses.includes(r.status)).length
  const underPrincipal = requests.filter(r => r.status === 'Under Principal').length
  const approved = requests.filter(r => postHodStatuses.includes(r.status)).length
  const rejected = requests.filter(r => r.status === 'Rejected').length

  // Calculate amounts
  const totalAmount = requests.reduce((sum, r) => sum + parseAmount(r.amount), 0)
  const approvedAmount = requests
    .filter(r => r.status === 'Reimbursed')
    .reduce((sum, r) => sum + parseAmount(r.amount), 0)
  const pendingAmount = requests
    .filter(r => pendingStatuses.includes(r.status))
    .reduce((sum, r) => sum + parseAmount(r.amount), 0)

  // Calculate rates
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0
  const pendingRate = total > 0 ? Math.round((pending / total) * 100) : 0

  return {
    total,
    pending,
    underPrincipal,
    approved,
    rejected,
    totalAmount: Math.round(totalAmount),
    approvedAmount: Math.round(approvedAmount),
    pendingAmount: Math.round(pendingAmount),
    approvalRate,
    pendingRate
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

  if (status === 'Pending') {
    return requests.filter(r =>
      r.status === 'Pending' || r.status === 'Under HOD' || r.status === 'Under Coordinator'
    )
  }

  return requests.filter(r => r.status === status)
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

/**
 * Get members by type from department members
 * @param {Array} members - Array of member objects
 * @param {string} type - Type to filter by (Faculty, Student, All)
 * @returns {Array} Filtered members
 */
export function getMembersByType(members = [], type) {
  if (!type || type === 'All') return members
  return members.filter(m => m.type === type)
}

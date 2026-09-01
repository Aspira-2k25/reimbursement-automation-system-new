// Initial state defaults for Accounts Dashboard
// Contains only essential default values - no mock/sample data

export const initialAccountsData = {
  userProfile: {
    fullName: '',
    college: '',
    designation: 'Accounts Officer',
    role: 'Accounts',
    email: '',
    phone: '',
    joinDate: '',
    employeeId: '',
    department: 'Accounts'
  },

  // Empty array - populated from API
  allRequests: [],

  // Standard departments list
  departments: [
    { id: 1, name: 'Computer Engineering' },
    { id: 2, name: 'Information Technology' },
    { id: 3, name: 'CSE AI and ML' },
    { id: 4, name: 'CSE Data Science' },
    { id: 5, name: 'Civil Engineering' },
    { id: 6, name: 'Mechanical Engineering' }
  ],

  notifications: []
}

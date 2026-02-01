// Initial mock data for Accounts Dashboard
// This provides default state before API data loads

export const initialAccountsData = {
  userProfile: {
    fullName: 'Accounts Officer',
    college: 'Engineering College',
    designation: 'Accounts Officer',
    role: 'Accounts',
    email: 'accounts@apsit.edu.in',
    phone: '',
    joinDate: new Date().toISOString(),
    employeeId: 'ACC001',
    department: 'Accounts'
  },

  allRequests: [],

  departments: [
    { id: 1, name: 'Computer Engineering' },
    { id: 2, name: 'Information Technology' },
    { id: 3, name: 'Electronics & Telecommunication' },
    { id: 4, name: 'Mechanical Engineering' },
    { id: 5, name: 'Civil Engineering' },
    { id: 6, name: 'Electrical Engineering' },
    { id: 7, name: 'Artificial Intelligence & Data Science' },
    { id: 8, name: 'Computer Science & Engineering (Data Science)' }
  ],

  notifications: []
}

// Sample request data for development/testing
export const sampleRequests = [
  {
    id: 'S-NPT-2026-IT-001',
    applicationId: 'S-NPT-2026-IT-001',
    applicantName: 'John Doe',
    applicantType: 'Student',
    department: 'Information Technology',
    amount: 1000,
    status: 'Approved',
    submittedDate: '2025-01-15',
    email: 'john.doe@student.apsit.edu.in',
    bankName: 'State Bank of India',
    accountNumber: '1234567890',
    ifscCode: 'SBIN0001234',
    accountHolderName: 'John Doe'
  },
  {
    id: 'F-NPT-2026-CE-001',
    applicationId: 'F-NPT-2026-CE-001',
    applicantName: 'Dr. Jane Smith',
    applicantType: 'Faculty',
    department: 'Computer Engineering',
    amount: 2500,
    status: 'Approved',
    submittedDate: '2025-01-14',
    email: 'jane.smith@apsit.edu.in',
    bankName: 'HDFC Bank',
    accountNumber: '9876543210',
    ifscCode: 'HDFC0001234',
    accountHolderName: 'Dr. Jane Smith'
  },
  {
    id: 'S-NPT-2026-ME-002',
    applicationId: 'S-NPT-2026-ME-002',
    applicantName: 'Alice Johnson',
    applicantType: 'Student',
    department: 'Mechanical Engineering',
    amount: 1500,
    status: 'Disbursed',
    submittedDate: '2025-01-10',
    email: 'alice.johnson@student.apsit.edu.in',
    bankName: 'ICICI Bank',
    accountNumber: '5555555555',
    ifscCode: 'ICIC0001234',
    accountHolderName: 'Alice Johnson'
  }
]

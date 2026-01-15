// Mock data for HOD Dashboard - Dynamic and reactive data structure
export const initialHodData = {
  // User profile for HOD
  userProfile: {
    fullName: "Dr. Jagan Kumar",
    department: "Information Technology",
    designation: "Head of Department",
    role: "HOD",
    email: "jagan.kumar@college.edu",
    phone: "+91-9876543210",
    joinDate: "August 15, 2018",
    employeeId: "IT-HOD-001"
  },

  // All reimbursement requests (students + faculty)
  allRequests: [
    // Student Requests
    {
      id: "REQ-S001",
      applicantName: "Rajesh Kumar",
      applicantId: "CS21001",
      applicantType: "Student",
      category: "Project Materials",
      amount: "₹3,500",
      status: "Pending",
      submittedDate: "2024-09-25",
      lastUpdated: "2024-09-25",
      year: "Fourth Year",
      description: "Materials for final year project on IoT sensors"
    },
    {
      id: "REQ-S002",
      applicantName: "Sneha Reddy",
      applicantId: "IT21045",
      applicantType: "Student",
      category: "Workshop Fee",
      amount: "₹2,500",
      status: "Pending",
      submittedDate: "2024-09-24",
      lastUpdated: "2024-09-24",
      year: "Third Year",
      description: "Registration fee for AI/ML workshop"
    },
    {
      id: "REQ-S003",
      applicantName: "Arjun Nair",
      applicantId: "CS21002",
      applicantType: "Student",
      category: "Conference Registration",
      amount: "₹4,000",
      status: "Approved",
      submittedDate: "2024-09-22",
      lastUpdated: "2024-09-22",
      year: "Fourth Year",
      description: "Registration for IEEE International Conference"
    },
    // Faculty Requests
    {
      id: "FAC001",
      applicantName: "Dr. Priya Sharma",
      applicantId: "DPS",
      applicantType: "Faculty",
      category: "Research Grant",
      amount: "₹50,000",
      status: "Under Principal",
      submittedDate: "2024-08-10",
      lastUpdated: "2024-08-15",
      designation: "Professor",
      specialization: "Machine Learning & AI",
      description: "Funding for AI research project on neural networks"
    },
    {
      id: "FAC002",
      applicantName: "Dr. Suresh Patel",
      applicantId: "DSP",
      applicantType: "Faculty",
      category: "FDP Program",
      amount: "₹15,000",
      status: "Approved",
      submittedDate: "2024-08-05",
      lastUpdated: "2024-08-20",
      designation: "Associate Professor",
      specialization: "Computer Networks",
      description: "Faculty Development Program on Cloud Computing"
    },
    // Additional sample requests to reach 30-40
    { id: "REQ-S004", applicantName: "Manish Gupta", applicantId: "CS21003", applicantType: "Student", category: "Travel", amount: "₹1,200", status: "Pending", submittedDate: "2024-09-20", lastUpdated: "2024-09-20", year: "Third Year", description: "Local travel for project survey" },
    { id: "REQ-S005", applicantName: "Anita Das", applicantId: "CS21004", applicantType: "Student", category: "Workshop Fee", amount: "₹2,000", status: "Rejected", submittedDate: "2024-09-18", lastUpdated: "2024-09-19", year: "Second Year", description: "UI/UX workshop registration" },
    { id: "REQ-S006", applicantName: "Vikas Yadav", applicantId: "CS21005", applicantType: "Student", category: "Materials", amount: "₹1,800", status: "Approved", submittedDate: "2024-09-15", lastUpdated: "2024-09-16", year: "Fourth Year", description: "Raspberry Pi and sensors" },
    { id: "REQ-S007", applicantName: "Pooja Singh", applicantId: "CS21006", applicantType: "Student", category: "Conference Registration", amount: "₹3,000", status: "Pending", submittedDate: "2024-09-12", lastUpdated: "2024-09-12", year: "Third Year", description: "NLP summit registration" },
    { id: "REQ-S008", applicantName: "Amit Verma", applicantId: "CS21007", applicantType: "Student", category: "Project Materials", amount: "₹2,750", status: "Under HOD", submittedDate: "2024-09-10", lastUpdated: "2024-09-10", year: "Fourth Year", description: "3D printer filament" },
    { id: "REQ-S009", applicantName: "Neha K", applicantId: "CS21008", applicantType: "Student", category: "Workshop Fee", amount: "₹1,500", status: "Approved", submittedDate: "2024-09-09", lastUpdated: "2024-09-11", year: "Second Year", description: "Web security workshop" },
    { id: "REQ-S010", applicantName: "Rahul Jain", applicantId: "CS21009", applicantType: "Student", category: "Travel", amount: "₹2,300", status: "Processing", submittedDate: "2024-09-08", lastUpdated: "2024-09-09", year: "Fourth Year", description: "Travel to industry partner" },
    { id: "REQ-S011", applicantName: "Isha Mehta", applicantId: "CS21010", applicantType: "Student", category: "Materials", amount: "₹900", status: "Pending", submittedDate: "2024-09-06", lastUpdated: "2024-09-06", year: "First Year", description: "Basic electronics kit" },
    { id: "REQ-S012", applicantName: "Karan Patel", applicantId: "CS21011", applicantType: "Student", category: "Conference Registration", amount: "₹4,500", status: "Under Principal", submittedDate: "2024-09-04", lastUpdated: "2024-09-05", year: "Fourth Year", description: "IEEE student congress" },
    { id: "REQ-S013", applicantName: "Deepa Iyer", applicantId: "CS21012", applicantType: "Student", category: "Project Materials", amount: "₹1,600", status: "Approved", submittedDate: "2024-09-03", lastUpdated: "2024-09-04", year: "Third Year", description: "Arduino kits" },
    { id: "REQ-S014", applicantName: "Sanjay Rao", applicantId: "CS21013", applicantType: "Student", category: "Workshop Fee", amount: "₹1,800", status: "Rejected", submittedDate: "2024-09-02", lastUpdated: "2024-09-03", year: "Second Year", description: "Data structures bootcamp" },
    { id: "REQ-S015", applicantName: "Priya N", applicantId: "CS21014", applicantType: "Student", category: "Travel", amount: "₹1,050", status: "Pending", submittedDate: "2024-09-01", lastUpdated: "2024-09-01", year: "Third Year", description: "Visit to research lab" },
    { id: "FAC003", applicantName: "Dr. Kavita Rao", applicantId: "DKR", applicantType: "Faculty", category: "Research", amount: "₹35,000", status: "Pending", submittedDate: "2024-08-15", lastUpdated: "2024-08-15", designation: "Professor", specialization: "AI Ethics", description: "Grant for AI ethics study" },
    { id: "FAC004", applicantName: "Dr. Anil Kumar", applicantId: "DAK", applicantType: "Faculty", category: "Conference", amount: "₹12,000", status: "Approved", submittedDate: "2024-08-14", lastUpdated: "2024-08-16", designation: "Associate Professor", specialization: "Databases", description: "SIGMOD conference" },
    { id: "FAC005", applicantName: "Dr. Ritu Sharma", applicantId: "DRS", applicantType: "Faculty", category: "Workshop", amount: "₹6,500", status: "Under HOD", submittedDate: "2024-08-13", lastUpdated: "2024-08-13", designation: "Assistant Professor", specialization: "Cybersecurity", description: "Ethical hacking workshop" },
    { id: "FAC006", applicantName: "Prof. Ajay Malhotra", applicantId: "PAM", applicantType: "Faculty", category: "Travel", amount: "₹18,000", status: "Under Principal", submittedDate: "2024-08-12", lastUpdated: "2024-08-12", designation: "Professor", specialization: "Distributed Systems", description: "Travel to collaborator" },
    { id: "FAC007", applicantName: "Dr. Nisha Gupta", applicantId: "DNG", applicantType: "Faculty", category: "Research", amount: "₹28,000", status: "Rejected", submittedDate: "2024-08-11", lastUpdated: "2024-08-12", designation: "Associate Professor", specialization: "HCI", description: "Eye-tracking equipment" },
    { id: "FAC008", applicantName: "Dr. Mahesh Iyer", applicantId: "DMI", applicantType: "Faculty", category: "Materials", amount: "₹9,200", status: "Approved", submittedDate: "2024-08-10", lastUpdated: "2024-08-11", designation: "Assistant Professor", specialization: "Embedded Systems", description: "MCU development boards" },
    { id: "REQ-S016", applicantName: "Ayesha Khan", applicantId: "CS21015", applicantType: "Student", category: "Materials", amount: "₹1,250", status: "Approved", submittedDate: "2024-08-29", lastUpdated: "2024-08-30", year: "Second Year", description: "Soldering kit" },
    { id: "REQ-S017", applicantName: "Harish Kumar", applicantId: "CS21016", applicantType: "Student", category: "Travel", amount: "₹1,700", status: "Pending", submittedDate: "2024-08-28", lastUpdated: "2024-08-28", year: "Third Year", description: "Local travel to client" },
    { id: "REQ-S018", applicantName: "Meena R", applicantId: "CS21017", applicantType: "Student", category: "Conference Registration", amount: "₹3,500", status: "Under HOD", submittedDate: "2024-08-27", lastUpdated: "2024-08-27", year: "Fourth Year", description: "Computer vision summit" },
    { id: "REQ-S019", applicantName: "Sagar P", applicantId: "CS21018", applicantType: "Student", category: "Workshop Fee", amount: "₹2,200", status: "Processing", submittedDate: "2024-08-26", lastUpdated: "2024-08-26", year: "Second Year", description: "React.js workshop" },
    { id: "REQ-S020", applicantName: "Bhavna T", applicantId: "CS21019", applicantType: "Student", category: "Project Materials", amount: "₹2,950", status: "Pending", submittedDate: "2024-08-25", lastUpdated: "2024-08-25", year: "Third Year", description: "PCBs and components" },
    { id: "FAC009", applicantName: "Dr. Rakesh Menon", applicantId: "DRM", applicantType: "Faculty", category: "Conference", amount: "₹14,500", status: "Pending", submittedDate: "2024-08-09", lastUpdated: "2024-08-09", designation: "Professor", specialization: "Networking", description: "IEEE ICC travel" },
    { id: "FAC010", applicantName: "Dr. Shalini Roy", applicantId: "DSR", applicantType: "Faculty", category: "Workshop", amount: "₹7,800", status: "Approved", submittedDate: "2024-08-08", lastUpdated: "2024-08-10", designation: "Associate Professor", specialization: "Software Testing", description: "Automation workshop" },
    { id: "FAC011", applicantName: "Prof. Kunal Shah", applicantId: "PKS", applicantType: "Faculty", category: "Travel", amount: "₹10,000", status: "Rejected", submittedDate: "2024-08-07", lastUpdated: "2024-08-08", designation: "Assistant Professor", specialization: "Operating Systems", description: "Industry visit" },
    { id: "FAC012", applicantName: "Dr. Alka S", applicantId: "DAS", applicantType: "Faculty", category: "Materials", amount: "₹5,600", status: "Pending", submittedDate: "2024-08-06", lastUpdated: "2024-08-06", designation: "Professor", specialization: "Analytics", description: "Data acquisition kit" }
  ],

  // Department roster data
  departmentMembers: [
    // Faculty Members
    {
      id: "DPS",
      name: "Dr. Priya Sharma",
      type: "Faculty",
      designation: "Professor",
      specialization: "Machine Learning & AI",
      email: "priya.sharma@college.edu",
      phone: "+91-9876543210",
      joinDate: "2018-08-15",
      totalReimbursements: 8,
      lastReimbursement: "2024-09-10"
    },
    {
      id: "DSP",
      name: "Dr. Suresh Patel",
      type: "Faculty",
      designation: "Associate Professor",
      specialization: "Computer Networks",
      email: "suresh.patel@college.edu",
      phone: "+91-9876543211",
      joinDate: "2020-01-10",
      totalReimbursements: 5,
      lastReimbursement: "2024-09-10"
    },
    {
      id: "PVS",
      name: "Prof. Vikram Singh",
      type: "Faculty",
      designation: "Assistant Professor",
      specialization: "Software Engineering",
      email: "vikram.singh@college.edu",
      phone: "+91-9876543212",
      joinDate: "2021-07-01",
      totalReimbursements: 3,
      lastReimbursement: "2024-08-25"
    },
    {
      id: "MJ",
      name: "Dr. Meera Joshi",
      type: "Faculty",
      designation: "Assistant Professor",
      specialization: "Data Science",
      email: "meera.joshi@college.edu",
      phone: "+91-9876543213",
      joinDate: "2022-01-15",
      totalReimbursements: 6,
      lastReimbursement: "2024-09-15"
    },
    // Student Members (sample)
    {
      id: "CS21001",
      name: "Rajesh Kumar",
      type: "Student",
      year: "Fourth Year",
      department: "Computer Science",
      email: "rajesh.cs21001@college.edu",
      phone: "+91-9876543214",
      joinDate: "2021-08-01",
      totalReimbursements: 2,
      lastReimbursement: "2024-09-25"
    },
    {
      id: "IT21045",
      name: "Sneha Reddy",
      type: "Student",
      year: "Third Year",
      department: "Information Technology",
      email: "sneha.it21045@college.edu",
      phone: "+91-9876543215",
      joinDate: "2021-08-01",
      totalReimbursements: 1,
      lastReimbursement: "2024-09-24"
    },
    {
      id: "CS21002",
      name: "Arjun Nair",
      type: "Student",
      year: "Fourth Year",
      department: "Computer Science",
      email: "arjun.cs21002@college.edu",
      phone: "+91-9876543216",
      joinDate: "2021-08-01",
      totalReimbursements: 3,
      lastReimbursement: "2024-09-22"
    },
    { id: "PKS", name: "Prof. Kunal Shah", type: "Faculty", designation: "Assistant Professor", specialization: "Operating Systems", email: "kunal.shah@college.edu", phone: "+91-9876543220", joinDate: "2021-04-15", totalReimbursements: 4, lastReimbursement: "2024-08-07" },
    { id: "DNG", name: "Dr. Nisha Gupta", type: "Faculty", designation: "Associate Professor", specialization: "HCI", email: "nisha.gupta@college.edu", phone: "+91-9876543221", joinDate: "2019-11-10", totalReimbursements: 7, lastReimbursement: "2024-08-11" },
    { id: "PAM", name: "Prof. Ajay Malhotra", type: "Faculty", designation: "Professor", specialization: "Distributed Systems", email: "ajay.malhotra@college.edu", phone: "+91-9876543222", joinDate: "2017-06-22", totalReimbursements: 9, lastReimbursement: "2024-08-12" },
    { id: "DMI", name: "Dr. Mahesh Iyer", type: "Faculty", designation: "Assistant Professor", specialization: "Embedded Systems", email: "mahesh.iyer@college.edu", phone: "+91-9876543223", joinDate: "2020-09-01", totalReimbursements: 5, lastReimbursement: "2024-08-10" },
    { id: "DKR", name: "Dr. Kavita Rao", type: "Faculty", designation: "Professor", specialization: "AI Ethics", email: "kavita.rao@college.edu", phone: "+91-9876543224", joinDate: "2016-02-19", totalReimbursements: 11, lastReimbursement: "2024-08-15" },
    { id: "DAK", name: "Dr. Anil Kumar", type: "Faculty", designation: "Associate Professor", specialization: "Databases", email: "anil.kumar@college.edu", phone: "+91-9876543225", joinDate: "2015-10-10", totalReimbursements: 10, lastReimbursement: "2024-08-14" },
    // Additional student members
    { id: "CS21015", name: "Ayesha Khan", type: "Student", year: "Second Year", department: "Computer Science", email: "ayesha.cs21015@college.edu", phone: "+91-9876543230", joinDate: "2021-08-01", totalReimbursements: 1, lastReimbursement: "2024-08-30" },
    { id: "CS21016", name: "Harish Kumar", type: "Student", year: "Third Year", department: "Computer Science", email: "harish.cs21016@college.edu", phone: "+91-9876543231", joinDate: "2021-08-01", totalReimbursements: 2, lastReimbursement: "2024-08-28" },
    { id: "CS21017", name: "Meena R", type: "Student", year: "Fourth Year", department: "Computer Science", email: "meena.cs21017@college.edu", phone: "+91-9876543232", joinDate: "2021-08-01", totalReimbursements: 2, lastReimbursement: "2024-08-27" },
    { id: "CS21018", name: "Sagar P", type: "Student", year: "Second Year", department: "Computer Science", email: "sagar.cs21018@college.edu", phone: "+91-9876543233", joinDate: "2021-08-01", totalReimbursements: 1, lastReimbursement: "2024-08-26" },
    { id: "CS21019", name: "Bhavna T", type: "Student", year: "Third Year", department: "Computer Science", email: "bhavna.cs21019@college.edu", phone: "+91-9876543234", joinDate: "2021-08-01", totalReimbursements: 1, lastReimbursement: "2024-08-25" }
  ],

  // Note: reportsData removed - all charts now use dynamic data from allRequests

  // Reimbursement application options for HOD
  reimbursementOptions: [
    {
      id: "research",
      title: "Research Grants",
      description: "Funding for research projects and academic publications",
      icon: "🔬",
      avgAmount: "₹15,000",
      categories: ["Research Equipment", "Publication Fees", "Lab Materials"]
    },
    {
      id: "development",
      title: "Faculty Development Programs (FDPs)",
      description: "Professional development and training programs",
      icon: "🎓",
      avgAmount: "₹8,000",
      categories: ["Training Programs", "Certification Courses", "Skill Development"]
    },
    {
      id: "conference",
      title: "Workshops & Conference",
      description: "Academic conferences and workshop participation",
      icon: "👥",
      avgAmount: "₹5,000",
      categories: ["Conference Registration", "Workshop Fees", "Seminar Participation"]
    },
    {
      id: "travel",
      title: "Travel Allowance",
      description: "Travel expenses for academic purposes",
      icon: "✈️",
      avgAmount: "₹12,000",
      categories: ["Domestic Travel", "International Travel", "Local Travel"]
    }
  ],

  // All departments overview data
  allDepartmentsData: [
    {
      id: 'it',
      name: 'Information Technology',
      hod: 'Dr. Jagan Kumar', // Will be dynamically updated
      totalRequests: 45,
      pendingRequests: 8,
      approvedRequests: 32,
      rejectedRequests: 5,
      totalDisbursed: 125000,
      approvalRate: 86
    },
    {
      id: 'ce',
      name: 'Computer Engineering',
      hod: 'Dr. Rajesh Kumar',
      totalRequests: 52,
      pendingRequests: 8,
      approvedRequests: 38,
      rejectedRequests: 6,
      totalDisbursed: 145000,
      approvalRate: 86
    },
    {
      id: 'cse-aiml',
      name: 'CSE AIML',
      hod: 'Dr. Priya Sharma',
      totalRequests: 38,
      pendingRequests: 5,
      approvedRequests: 28,
      rejectedRequests: 5,
      totalDisbursed: 98000,
      approvalRate: 85
    },
    {
      id: 'cse-ds',
      name: 'CSE DS',
      hod: 'Dr. Amit Singh',
      totalRequests: 42,
      pendingRequests: 7,
      approvedRequests: 30,
      rejectedRequests: 5,
      totalDisbursed: 112000,
      approvalRate: 86
    },
    {
      id: 'mech',
      name: 'Mechanical Engineering',
      hod: 'Dr. Sunita Patel',
      totalRequests: 35,
      pendingRequests: 6,
      approvedRequests: 25,
      rejectedRequests: 4,
      totalDisbursed: 89000,
      approvalRate: 86
    },
    {
      id: 'civil',
      name: 'Civil Engineering',
      hod: 'Dr. Sunil Kumar',
      totalRequests: 28,
      pendingRequests: 4,
      approvedRequests: 20,
      rejectedRequests: 4,
      totalDisbursed: 75000,
      approvalRate: 83
    },
  ]
}

// Utility functions for data manipulation
export const getRequestsByStatus = (requests, status) => {
  return requests.filter(req => req.status === status)
}

export const getRequestsByType = (requests, type) => {
  return requests.filter(req => req.applicantType === type)
}

export const getTotalAmount = (requests) => {
  return requests.reduce((total, req) => {
    const amount = parseFloat(req.amount.replace(/[₹,]/g, ''))
    return total + (isNaN(amount) ? 0 : amount)
  }, 0)
}

export const getMembersByType = (members, type) => {
  return members.filter(member => member.type === type)
}

export const calculateStats = (requests) => {
  const total = requests.length
  // For HOD dashboard, "Under HOD" should be treated as "Pending"
  const pending = getRequestsByStatus(requests, 'Pending').length + getRequestsByStatus(requests, 'Under HOD').length

  // Approved includes "Under Principal" (HOD approved, waiting on Principal) and "Approved" (fully approved)
  const underPrincipal = getRequestsByStatus(requests, 'Under Principal').length
  const fullyApproved = getRequestsByStatus(requests, 'Approved').length
  const approved = underPrincipal + fullyApproved

  const rejected = getRequestsByStatus(requests, 'Rejected').length
  const processing = getRequestsByStatus(requests, 'Processing').length

  // Calculate amounts
  const totalAmount = getTotalAmount(requests)

  // Approved amount includes both "Under Principal" and "Approved"
  const approvedAmount = getTotalAmount(getRequestsByStatus(requests, 'Approved')) +
    getTotalAmount(getRequestsByStatus(requests, 'Under Principal'))

  // Include "Under HOD" in pending amount calculation
  const pendingAmount = getTotalAmount(getRequestsByStatus(requests, 'Pending')) + getTotalAmount(getRequestsByStatus(requests, 'Under HOD'))
  const rejectedAmount = getTotalAmount(getRequestsByStatus(requests, 'Rejected'))
  const processingAmount = getTotalAmount(getRequestsByStatus(requests, 'Processing'))

  // Calculate percentages with proper rounding
  // "Processed" means not pending (either approved, rejected, or processing)
  const processedRequests = approved + rejected
  const approvalRate = processedRequests > 0 ? Math.round((approved / processedRequests) * 100) : 0
  const pendingRate = total > 0 ? Math.round((pending / total) * 100) : 0
  const rejectedRate = total > 0 ? Math.round((rejected / total) * 100) : 0
  const processingRate = total > 0 ? Math.round((processing / total) * 100) : 0

  // Calculate average amounts
  const avgRequestAmount = total > 0 ? Math.round(totalAmount / total) : 0
  const avgApprovedAmount = approved > 0 ? Math.round(approvedAmount / approved) : 0
  const avgPendingAmount = pending > 0 ? Math.round(pendingAmount / pending) : 0
  const avgRejectedAmount = rejected > 0 ? Math.round(rejectedAmount / rejected) : 0

  return {
    // Basic counts
    total,
    pending,
    approved,
    rejected,
    processing,

    // Amounts
    totalAmount: Math.round(totalAmount),
    approvedAmount: Math.round(approvedAmount),
    pendingAmount: Math.round(pendingAmount),
    rejectedAmount: Math.round(rejectedAmount),
    processingAmount: Math.round(processingAmount),

    // Percentages
    approvalRate,
    pendingRate,
    rejectedRate,
    processingRate,

    // Averages
    avgRequestAmount,
    avgApprovedAmount,
    avgPendingAmount,
    avgRejectedAmount
  }
}
// Mock data for Principal Dashboard - Dynamic and reactive data structure
export const initialPrincipalData = {
  // User profile for Principal
  userProfile: {
    fullName: "Dr. Rajesh Kumar",
    college: "Engineering College", 
    designation: "Principal",
    role: "Principal",
    email: "principal@college.edu",
    phone: "+91-9876543210",
    joinDate: "August 15, 2018",
    employeeId: "PRIN-001"
  },

  // All departments data - Standardized 6 departments
  departments: [
    {
      id: 'ce',
      name: 'Computer Engineering',
      hod: { name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@college.edu', phone: '+91-9876543210' },
      facultyCount: 12,
      studentCount: 180
    },
  {
    id: 'it',
    name: 'Information Technology',
      hod: { name: 'Dr. Jagan Kumar', email: 'jagan.kumar@college.edu', phone: '+91-9876543211' },
      facultyCount: 10,
      studentCount: 150
    },
    {
      id: 'cse-aiml',
      name: 'CSE AIML',
      hod: { name: 'Dr. Priya Sharma', email: 'priya.sharma@college.edu', phone: '+91-9876543212' },
    facultyCount: 8,
      studentCount: 120
    },
    {
      id: 'cse-ds',
      name: 'CSE DS',
      hod: { name: 'Dr. Amit Singh', email: 'amit.singh@college.edu', phone: '+91-9876543213' },
      facultyCount: 9,
      studentCount: 140
  },
  {
    id: 'civil',
    name: 'Civil Engineering',
      hod: { name: 'Dr. Sunil Kumar', email: 'sunil.kumar@college.edu', phone: '+91-9876543214' },
      facultyCount: 7,
      studentCount: 110
    },
    {
      id: 'mech',
      name: 'Mechanical Engineering',
      hod: { name: 'Dr. Sunita Patel', email: 'sunita.patel@college.edu', phone: '+91-9876543215' },
      facultyCount: 11,
      studentCount: 160
    }
  ],

  // All reimbursement requests (college-wide)
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
      department: "Computer Engineering",
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
      department: "Information Technology",
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
      department: "Computer Engineering",
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
      department: "Computer Engineering",
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
      department: "Information Technology",
      description: "Faculty Development Program on Cloud Computing"
    },
    // Additional sample requests
    { id: "REQ-S004", applicantName: "Manish Gupta", applicantId: "CS21003", applicantType: "Student", category: "Travel", amount: "₹1,200", status: "Pending", submittedDate: "2024-09-20", lastUpdated: "2024-09-20", year: "Third Year", department: "Computer Science", description: "Local travel for project survey" },
    { id: "REQ-S005", applicantName: "Anita Das", applicantId: "CS21004", applicantType: "Student", category: "Workshop Fee", amount: "₹2,000", status: "Rejected", submittedDate: "2024-09-18", lastUpdated: "2024-09-19", year: "Second Year", department: "Computer Science", description: "UI/UX workshop registration" },
    { id: "REQ-S006", applicantName: "Vikas Yadav", applicantId: "CS21005", applicantType: "Student", category: "Materials", amount: "₹1,800", status: "Approved", submittedDate: "2024-09-15", lastUpdated: "2024-09-16", year: "Fourth Year", department: "Computer Science", description: "Raspberry Pi and sensors" },
    { id: "REQ-S007", applicantName: "Pooja Singh", applicantId: "CS21006", applicantType: "Student", category: "Conference Registration", amount: "₹3,000", status: "Pending", submittedDate: "2024-09-12", lastUpdated: "2024-09-12", year: "Third Year", department: "Computer Science", description: "NLP summit registration" },
    { id: "REQ-S008", applicantName: "Amit Verma", applicantId: "CS21007", applicantType: "Student", category: "Project Materials", amount: "₹2,750", status: "Under Principal", submittedDate: "2024-09-10", lastUpdated: "2024-09-10", year: "Fourth Year", department: "Computer Science", description: "3D printer filament" },
    { id: "REQ-S009", applicantName: "Neha K", applicantId: "CS21008", applicantType: "Student", category: "Workshop Fee", amount: "₹1,500", status: "Approved", submittedDate: "2024-09-09", lastUpdated: "2024-09-11", year: "Second Year", department: "Computer Science", description: "Web security workshop" },
    { id: "REQ-S010", applicantName: "Rahul Jain", applicantId: "CS21009", applicantType: "Student", category: "Travel", amount: "₹2,300", status: "Processing", submittedDate: "2024-09-08", lastUpdated: "2024-09-09", year: "Fourth Year", department: "Computer Science", description: "Travel to industry partner" },
    { id: "REQ-S011", applicantName: "Isha Mehta", applicantId: "CS21010", applicantType: "Student", category: "Materials", amount: "₹900", status: "Pending", submittedDate: "2024-09-06", lastUpdated: "2024-09-06", year: "First Year", department: "Computer Science", description: "Basic electronics kit" },
    { id: "REQ-S012", applicantName: "Karan Patel", applicantId: "CS21011", applicantType: "Student", category: "Conference Registration", amount: "₹4,500", status: "Under Principal", submittedDate: "2024-09-04", lastUpdated: "2024-09-05", year: "Fourth Year", department: "Computer Science", description: "IEEE student congress" },
    { id: "REQ-S013", applicantName: "Deepa Iyer", applicantId: "CS21012", applicantType: "Student", category: "Project Materials", amount: "₹1,600", status: "Approved", submittedDate: "2024-09-03", lastUpdated: "2024-09-04", year: "Third Year", department: "Computer Science", description: "Arduino kits" },
    { id: "REQ-S014", applicantName: "Sanjay Rao", applicantId: "CS21013", applicantType: "Student", category: "Workshop Fee", amount: "₹1,800", status: "Rejected", submittedDate: "2024-09-02", lastUpdated: "2024-09-03", year: "Second Year", department: "Computer Science", description: "Data structures bootcamp" },
    { id: "REQ-S015", applicantName: "Priya N", applicantId: "CS21014", applicantType: "Student", category: "Travel", amount: "₹1,050", status: "Pending", submittedDate: "2024-09-01", lastUpdated: "2024-09-01", year: "Third Year", department: "Computer Science", description: "Visit to research lab" },
    { id: "FAC003", applicantName: "Dr. Kavita Rao", applicantId: "DKR", applicantType: "Faculty", category: "Research", amount: "₹35,000", status: "Pending", submittedDate: "2024-08-15", lastUpdated: "2024-08-15", designation: "Professor", specialization: "AI Ethics", department: "Computer Science", description: "Grant for AI ethics study" },
    { id: "FAC004", applicantName: "Dr. Anil Kumar", applicantId: "DAK", applicantType: "Faculty", category: "Conference", amount: "₹12,000", status: "Approved", submittedDate: "2024-08-14", lastUpdated: "2024-08-16", designation: "Associate Professor", specialization: "Databases", department: "Information Technology", description: "SIGMOD conference" },
    { id: "FAC005", applicantName: "Dr. Ritu Sharma", applicantId: "DRS", applicantType: "Faculty", category: "Workshop", amount: "₹6,500", status: "Under Principal", submittedDate: "2024-08-13", lastUpdated: "2024-08-13", designation: "Assistant Professor", specialization: "Cybersecurity", department: "Information Technology", description: "Ethical hacking workshop" },
    { id: "FAC006", applicantName: "Prof. Ajay Malhotra", applicantId: "PAM", applicantType: "Faculty", category: "Travel", amount: "₹18,000", status: "Under Principal", submittedDate: "2024-08-12", lastUpdated: "2024-08-12", designation: "Professor", specialization: "Distributed Systems", department: "Computer Science", description: "Travel to collaborator" },
    { id: "FAC007", applicantName: "Dr. Nisha Gupta", applicantId: "DNG", applicantType: "Faculty", category: "Research", amount: "₹28,000", status: "Rejected", submittedDate: "2024-08-11", lastUpdated: "2024-08-12", designation: "Associate Professor", specialization: "HCI", department: "Computer Science", description: "Eye-tracking equipment" },
    { id: "FAC008", applicantName: "Dr. Mahesh Iyer", applicantId: "DMI", applicantType: "Faculty", category: "Materials", amount: "₹9,200", status: "Approved", submittedDate: "2024-08-10", lastUpdated: "2024-08-11", designation: "Assistant Professor", specialization: "Embedded Systems", department: "Electronics & Communication", description: "MCU development boards" },
    { id: "REQ-S016", applicantName: "Ayesha Khan", applicantId: "CS21015", applicantType: "Student", category: "Materials", amount: "₹1,250", status: "Approved", submittedDate: "2024-08-29", lastUpdated: "2024-08-30", year: "Second Year", department: "Computer Science", description: "Soldering kit" },
    { id: "REQ-S017", applicantName: "Harish Kumar", applicantId: "CS21016", applicantType: "Student", category: "Travel", amount: "₹1,700", status: "Pending", submittedDate: "2024-08-28", lastUpdated: "2024-08-28", year: "Third Year", department: "Computer Science", description: "Local travel to client" },
    { id: "REQ-S018", applicantName: "Meena R", applicantId: "CS21017", applicantType: "Student", category: "Conference Registration", amount: "₹3,500", status: "Under Principal", submittedDate: "2024-08-27", lastUpdated: "2024-08-27", year: "Fourth Year", department: "Computer Science", description: "Computer vision summit" },
    { id: "REQ-S019", applicantName: "Sagar P", applicantId: "CS21018", applicantType: "Student", category: "Workshop Fee", amount: "₹2,200", status: "Processing", submittedDate: "2024-08-26", lastUpdated: "2024-08-26", year: "Second Year", department: "Computer Science", description: "React.js workshop" },
    { id: "REQ-S020", applicantName: "Bhavna T", applicantId: "CS21019", applicantType: "Student", category: "Project Materials", amount: "₹2,950", status: "Pending", submittedDate: "2024-08-25", lastUpdated: "2024-08-25", year: "Third Year", department: "Computer Science", description: "PCBs and components" },
    { id: "FAC009", applicantName: "Dr. Rakesh Menon", applicantId: "DRM", applicantType: "Faculty", category: "Conference", amount: "₹14,500", status: "Pending", submittedDate: "2024-08-09", lastUpdated: "2024-08-09", designation: "Professor", specialization: "Networking", department: "Information Technology", description: "IEEE ICC travel" },
    { id: "FAC010", applicantName: "Dr. Shalini Roy", applicantId: "DSR", applicantType: "Faculty", category: "Workshop", amount: "₹7,800", status: "Approved", submittedDate: "2024-08-08", lastUpdated: "2024-08-10", designation: "Associate Professor", specialization: "Software Testing", department: "Computer Science", description: "Automation workshop" },
    { id: "FAC011", applicantName: "Prof. Kunal Shah", applicantId: "PKS", applicantType: "Faculty", category: "Travel", amount: "₹10,000", status: "Rejected", submittedDate: "2024-08-07", lastUpdated: "2024-08-08", designation: "Assistant Professor", specialization: "Operating Systems", department: "Computer Science", description: "Industry visit" },
    { id: "FAC012", applicantName: "Dr. Alka S", applicantId: "DAS", applicantType: "Faculty", category: "Materials", amount: "₹5,600", status: "Pending", submittedDate: "2024-08-06", lastUpdated: "2024-08-06", designation: "Professor", specialization: "Analytics", department: "Information Technology", description: "Data acquisition kit" },
    // Additional requests for new departments
    { id: "REQ-S021", applicantName: "Ravi Kumar", applicantId: "CSE-AIML21001", applicantType: "Student", category: "Project Materials", amount: "₹4,200", status: "Approved", submittedDate: "2024-09-15", lastUpdated: "2024-09-16", year: "Fourth Year", department: "CSE AIML", description: "AI/ML project hardware" },
    { id: "REQ-S022", applicantName: "Priya Singh", applicantId: "CSE-DS21001", applicantType: "Student", category: "Workshop Fee", amount: "₹3,000", status: "Pending", submittedDate: "2024-09-14", lastUpdated: "2024-09-14", year: "Third Year", department: "CSE DS", description: "Data Science bootcamp" },
    { id: "FAC013", applicantName: "Dr. Neha Gupta", applicantId: "DNG", applicantType: "Faculty", category: "Research", amount: "₹25,000", status: "Under Principal", submittedDate: "2024-08-20", lastUpdated: "2024-08-20", designation: "Associate Professor", specialization: "Machine Learning", department: "CSE AIML", description: "AI research equipment" },
    { id: "FAC014", applicantName: "Dr. Vikram Singh", applicantId: "DVS", applicantType: "Faculty", category: "Conference", amount: "₹18,000", status: "Approved", submittedDate: "2024-08-18", lastUpdated: "2024-08-19", designation: "Professor", specialization: "Data Science", department: "CSE DS", description: "International data science conference" },
    { id: "REQ-S023", applicantName: "Amit Kumar", applicantId: "CIVIL21001", applicantType: "Student", category: "Materials", amount: "₹2,800", status: "Approved", submittedDate: "2024-09-10", lastUpdated: "2024-09-11", year: "Third Year", department: "Civil Engineering", description: "Civil engineering lab materials" },
    { id: "REQ-S024", applicantName: "Sneha Patel", applicantId: "MECH21001", applicantType: "Student", category: "Workshop Fee", amount: "₹2,200", status: "Pending", submittedDate: "2024-09-08", lastUpdated: "2024-09-08", year: "Second Year", department: "Mechanical Engineering", description: "CAD/CAM workshop" },
    // Additional requests for better department coverage
    { id: "REQ-S025", applicantName: "Deepak Kumar", applicantId: "CSE-AIML21002", applicantType: "Student", category: "Project Materials", amount: "₹3,800", status: "Approved", submittedDate: "2024-09-12", lastUpdated: "2024-09-13", year: "Fourth Year", department: "CSE AIML", description: "Machine learning hardware" },
    { id: "REQ-S026", applicantName: "Kavya Singh", applicantId: "CSE-DS21002", applicantType: "Student", category: "Conference Registration", amount: "₹4,500", status: "Pending", submittedDate: "2024-09-11", lastUpdated: "2024-09-11", year: "Third Year", department: "CSE DS", description: "Data science conference" },
    { id: "FAC015", applicantName: "Dr. Rajesh Verma", applicantId: "DRV", applicantType: "Faculty", category: "Research", amount: "₹30,000", status: "Under Principal", submittedDate: "2024-08-25", lastUpdated: "2024-08-25", designation: "Professor", specialization: "Computer Networks", department: "Computer Engineering", description: "Network research equipment" },
    { id: "FAC016", applicantName: "Dr. Meera Joshi", applicantId: "DMJ", applicantType: "Faculty", category: "Conference", amount: "₹22,000", status: "Approved", submittedDate: "2024-08-22", lastUpdated: "2024-08-23", designation: "Associate Professor", specialization: "Civil Structures", department: "Civil Engineering", description: "International civil engineering conference" }
  ]
}

// Utility functions for data manipulation
export const getRequestsByStatus = (requests, status) => {
  return requests.filter(req => req.status === status)
}

export const getRequestsByType = (requests, type) => {
  return requests.filter(req => req.applicantType === type)
}

export const getRequestsByDepartment = (requests, department) => {
  return requests.filter(req => req.department === department)
}

export const getTotalAmount = (requests) => {
  return requests.reduce((total, req) => {
    // Handle both number and string formats
    let amount = 0
    if (typeof req.amount === 'number') {
      amount = req.amount
    } else if (typeof req.amount === 'string') {
      amount = parseFloat(req.amount.replace(/[₹,]/g, '')) || 0
    }
    return total + (isNaN(amount) ? 0 : amount)
  }, 0)
}

export const getMembersByType = (members, type) => {
  return members.filter(member => member.type === type)
}

export const calculateCollegeStats = (requests) => {
  const total = requests.length
  const pending = getRequestsByStatus(requests, 'Pending').length
  const approved = getRequestsByStatus(requests, 'Approved').length
  const rejected = getRequestsByStatus(requests, 'Rejected').length
  const processing = getRequestsByStatus(requests, 'Under Principal').length + getRequestsByStatus(requests, 'Processing').length
  
  // Calculate amounts
  const totalAmount = getTotalAmount(requests)
  const approvedAmount = getTotalAmount(getRequestsByStatus(requests, 'Approved'))
  const pendingAmount = getTotalAmount(getRequestsByStatus(requests, 'Pending'))
  const rejectedAmount = getTotalAmount(getRequestsByStatus(requests, 'Rejected'))
  const processingAmount = getTotalAmount(requests.filter(r => r.status === 'Processing' || r.status === 'Under Principal'))
  
  // Calculate percentages with proper rounding
  const processedRequests = total - pending
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
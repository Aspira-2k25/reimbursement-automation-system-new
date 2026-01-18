import React, { useState, createContext, useContext, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { useAuth } from '../../../../context/AuthContext'
import { studentFormsAPI, facultyFormsAPI } from '../../../../services/api'
import { toast } from 'react-hot-toast'
import HomeDashboard from './HomeDashboard'
import ReportsAndAnalytics from './ReportsAndAnalytics'
import DepartmentRoster from './DepartmentRoster'
import ProfileSettings from './ProfileSettings'

// Context for sharing Principal state across components
const PrincipalContext = createContext()

export const usePrincipalContext = () => {
  const context = useContext(PrincipalContext)
  if (!context) {
    throw new Error('usePrincipalContext must be used within PrincipalLayout')
  }
  return context
}

const PrincipalLayout = ({ children }) => {
  const { user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [userProfile, setUserProfile] = useState({
    fullName: '',
    college: '',
    designation: '',
    role: 'Principal',
    email: '',
    phone: '',
    joinDate: '',
    employeeId: ''
  })
  const [allRequests, setAllRequests] = useState([])
  const [departments, setDepartments] = useState([
    {
      id: 'it',
      name: 'Information Technology',
      hod: { name: 'Dr. Jagan Kumar', email: 'jagan.kumar@college.edu', phone: '+91-9876543210' },
      totalRequests: 45,
      pendingRequests: 8,
      approvedRequests: 32,
      rejectedRequests: 5,
      totalDisbursed: 125000,
      approvalRate: 86,
      facultyCount: 12,
      studentCount: 200
    },
    {
      id: 'ce',
      name: 'Computer Engineering',
      hod: { name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@college.edu', phone: '+91-9876543211' },
      totalRequests: 52,
      pendingRequests: 8,
      approvedRequests: 38,
      rejectedRequests: 6,
      totalDisbursed: 145000,
      approvalRate: 86,
      facultyCount: 15,
      studentCount: 240
    },
    {
      id: 'cse-aiml',
      name: 'CSE AIML',
      hod: { name: 'Dr. Priya Sharma', email: 'priya.sharma@college.edu', phone: '+91-9876543212' },
      totalRequests: 38,
      pendingRequests: 5,
      approvedRequests: 28,
      rejectedRequests: 5,
      totalDisbursed: 98000,
      approvalRate: 85,
      facultyCount: 10,
      studentCount: 180
    },
    {
      id: 'cse-ds',
      name: 'CSE DS',
      hod: { name: 'Dr. Amit Singh', email: 'amit.singh@college.edu', phone: '+91-9876543213' },
      totalRequests: 42,
      pendingRequests: 7,
      approvedRequests: 30,
      rejectedRequests: 5,
      totalDisbursed: 112000,
      approvalRate: 86,
      facultyCount: 11,
      studentCount: 190
    },
    {
      id: 'mech',
      name: 'Mechanical Engineering',
      hod: { name: 'Dr. Sunita Patel', email: 'sunita.patel@college.edu', phone: '+91-9876543214' },
      totalRequests: 35,
      pendingRequests: 6,
      approvedRequests: 25,
      rejectedRequests: 4,
      totalDisbursed: 89000,
      approvalRate: 86,
      facultyCount: 14,
      studentCount: 220
    },
    {
      id: 'civil',
      name: 'Civil Engineering',
      hod: { name: 'Dr. Sunil Kumar', email: 'sunil.kumar@college.edu', phone: '+91-9876543215' },
      totalRequests: 28,
      pendingRequests: 4,
      approvedRequests: 20,
      rejectedRequests: 4,
      totalDisbursed: 75000,
      approvalRate: 83,
      facultyCount: 10,
      studentCount: 170
    }
  ])
  const [activityLog, setActivityLog] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')

  // Handle responsive behavior - auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true)
      }
    }

    // Set initial state based on screen size
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Global error handler to catch browser extension errors
  useEffect(() => {
    const handleGlobalError = (event) => {
      // Ignore errors from browser extensions
      if (event.error && (
        event.error.message?.includes('translate-page') ||
        event.error.message?.includes('Cannot find menu item') ||
        event.filename?.includes('content-all.js') ||
        event.filename?.includes('extension')
      )) {
        event.preventDefault()
        return false
      }
    }

    window.addEventListener('error', handleGlobalError)
    return () => window.removeEventListener('error', handleGlobalError)
  }, [])

  // Update userProfile when user data from AuthContext changes
  useEffect(() => {
    if (user) {
      console.log('Principal Dashboard - User data:', user)

      // Build email: prefer stored email, otherwise construct from username
      let userEmail = user.email
      if (!userEmail && user.username) {
        // If username looks like an email, use it; otherwise append domain
        userEmail = user.username.includes('@')
          ? user.username
          : `${user.username.toLowerCase()}@apsit.edu.in`
      }

      setUserProfile({
        fullName: user.fullName || user.name,
        college: user.college || 'Engineering College',
        designation: user.designation || user.role,
        role: user.role,
        email: userEmail,
        phone: user.phone,
        joinDate: user.joinDate,
        employeeId: user.employeeId || user.id
      })
    }
  }, [user])

  // Map backend form data to dashboard request format
  const mapFormToRequest = useCallback((f) => {
    const amountNum = typeof f.amount === 'number' ? f.amount : parseFloat(f.amount) || 0

    return {
      id: f.applicationId || f._id || `form-${f._id}`,
      _id: f._id,
      applicationId: f.applicationId,
      userId: f.userId,
      applicantName: f.name || 'N/A',
      applicantId: f.studentId || f.facultyId || 'N/A',
      applicantType: f.applicantType || 'Student',
      applicantEmail: f.email,
      department: f.department || 'N/A',
      category: f.reimbursementType || f.category || 'NPTEL',
      amount: `₹${amountNum.toLocaleString()}`,
      amountNum: amountNum,
      status: f.status || 'Pending',
      submittedDate: f.createdAt ? new Date(f.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      lastUpdated: f.updatedAt ? new Date(f.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      year: f.academicYear || f.year || 'N/A',
      description: f.remarks || f.description || f.name || 'N/A',
      email: f.email,
      division: f.division,
      studentId: f.studentId,
      name: f.name,
      remarks: f.remarks,
      academicYear: f.academicYear,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      documents: f.documents || [],
      reimbursementType: f.reimbursementType,
      hodComments: f.hodComments || '',
      principalComments: f.principalComments || ''
    }
  }, [])

  // Fetch all requests for Principal (Under Principal + Approved only)
  // Note: We don't fetch rejected forms because if HOD rejected, it never reached Principal
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch only approved/under-principal forms (not rejected - those never reached Principal)
      const [
        studentApprovedData,
        facultyApprovedData
      ] = await Promise.allSettled([
        studentFormsAPI.listApproved(),
        facultyFormsAPI.listApproved()
      ])

      let allForms = []

      // Process student forms (Under Principal + Approved status)
      if (studentApprovedData.status === 'fulfilled') {
        const forms = (studentApprovedData.value?.forms || studentApprovedData.value || [])
          .map(f => ({ ...f, applicantType: 'Student' }))
        allForms = [...allForms, ...forms]
      }

      // Process faculty forms (Under Principal + Approved status)
      if (facultyApprovedData.status === 'fulfilled') {
        const forms = (facultyApprovedData.value?.forms || facultyApprovedData.value || [])
          .map(f => ({ ...f, applicantType: f.applicantType || 'Faculty' }))
        allForms = [...allForms, ...forms]
      }

      // Map backend data to dashboard format
      const mappedRequests = allForms.map(mapFormToRequest)

      console.log('Fetched Principal requests - Total:', mappedRequests.length)
      console.log('By status:', {
        'Under Principal': mappedRequests.filter(r => r.status === 'Under Principal').length,
        'Approved': mappedRequests.filter(r => r.status === 'Approved').length
      })

      setAllRequests(mappedRequests)
    } catch (error) {
      console.error('Error fetching Principal requests:', error)
      toast.error(error?.error || 'Failed to fetch requests')
      setAllRequests([])
    } finally {
      setLoading(false)
    }
  }, [mapFormToRequest])

  // Fetch requests on component mount
  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Calculate college-wide statistics
  const collegeStats = useMemo(() => {
    const total = allRequests.length
    const pending = allRequests.filter(r => r.status === 'Under Principal').length
    const approved = allRequests.filter(r => r.status === 'Approved').length
    const rejected = allRequests.filter(r => r.status === 'Rejected').length
    const approvedAmount = allRequests
      .filter(r => r.status === 'Approved')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

    const processedRequests = approved + rejected
    const approvalRate = processedRequests > 0 ? Math.round((approved / processedRequests) * 100) : 0
    // Calculate dynamic budget utilization
    const ANNUAL_BUDGET = 50000000 // ₹5 Crores annual reimbursement budget
    const budgetUtilization = ANNUAL_BUDGET > 0
      ? Math.min(Math.round((approvedAmount / ANNUAL_BUDGET) * 100), 100)
      : 0

    return {
      total,
      pending,
      approved,
      rejected,
      approvedAmount,
      approvalRate,
      budgetUtilization
    }
  }, [allRequests])

  // Function to render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeDashboard />
      case 'reports':
        return <ReportsAndAnalytics />
      case 'roster':
        return <DepartmentRoster />
      case 'profile':
        return <ProfileSettings />
      default:
        return <HomeDashboard />
    }
  }

  // Context value with all shared state and methods
  const contextValue = {
    // UI State
    activeTab,
    setActiveTab,
    isCollapsed,
    setIsCollapsed,

    // Data State
    userProfile,
    setUserProfile,
    allRequests,
    setAllRequests,
    departments,
    setDepartments,
    activityLog,
    setActivityLog,

    // Computed values
    collegeStats,
    loading,
    fetchRequests,

    // UI State
    notifications,
    setNotifications,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    departmentFilter,
    setDepartmentFilter,
    typeFilter,
    setTypeFilter,

    // Helper methods
    updateRequestStatus: useCallback((requestId, newStatus, comments = '') => {
      setAllRequests(prev => {
        const updatedRequests = prev.map(req =>
          req.id === requestId
            ? {
              ...req,
              status: newStatus,
              lastUpdated: new Date().toISOString().split('T')[0],
              principalComments: comments
            }
            : req
        )

        // Find the updated request for notifications and activity log
        const updatedRequest = updatedRequests.find(req => req.id === requestId)
        if (updatedRequest) {
          // Add notification for status change
          const newNotification = {
            id: Date.now(),
            type: 'status_change',
            title: `Request ${newStatus}`,
            message: `${updatedRequest.applicantName}'s request has been ${newStatus.toLowerCase()}`,
            time: 'Just now',
            unread: true,
            timestamp: new Date().toISOString()
          }
          setNotifications(prev => [newNotification, ...prev])

          // Add to activity log
          const newActivity = {
            id: Date.now(),
            action: `Request ${newStatus}`,
            user: userProfile.fullName,
            target: updatedRequest.applicantName,
            details: `Request ${requestId} ${newStatus.toLowerCase()}${comments ? ` - ${comments}` : ''}`,
            timestamp: new Date().toISOString(),
            type: newStatus.toLowerCase(),
            department: updatedRequest.department
          }
          setActivityLog(prev => [newActivity, ...prev])
        }

        return updatedRequests
      })
    }, [userProfile]),

    addComment: useCallback((requestId, comment) => {
      setAllRequests(prev =>
        prev.map(req =>
          req.id === requestId
            ? {
              ...req,
              principalComments: comment,
              lastUpdated: new Date().toISOString().split('T')[0]
            }
            : req
        )
      )
    }, []),

    addNewRequest: useCallback((newRequest) => {
      setAllRequests(prev => [newRequest, ...prev])

      // Add notification for new request
      const newNotification = {
        id: Date.now(),
        type: 'request',
        title: 'New Reimbursement Request',
        message: `${newRequest.applicantName} submitted a new request for ${newRequest.amount}`,
        time: 'Just now',
        unread: true,
        timestamp: new Date().toISOString()
      }
      setNotifications(prev => [newNotification, ...prev])
    }, []),

    deleteRequest: useCallback((requestId) => {
      setAllRequests(prev => prev.filter(req => req.id !== requestId))
    }, []),


    // Notification management
    markNotificationAsRead: useCallback((notificationId) => {
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, unread: false }
            : notification
        )
      )
    }, []),

    markAllNotificationsAsRead: useCallback(() => {
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, unread: false }))
      )
    }, []),

    addNotification: useCallback((notification) => {
      const newNotification = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...notification
      }
      setNotifications(prev => [newNotification, ...prev])
    }, []),

    // Filtering and search
    getFilteredRequests: useCallback(() => {
      return allRequests.filter(request => {
        const matchesSearch =
          request.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.department.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'All' || request.status === statusFilter
        const matchesDepartment = departmentFilter === 'All' || request.department === departmentFilter
        const matchesType = typeFilter === 'All' || request.applicantType === typeFilter

        return matchesSearch && matchesStatus && matchesDepartment && matchesType
      })
    }, [allRequests, searchQuery, statusFilter, departmentFilter, typeFilter]),


  }

  return (
    <PrincipalContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50/30">
        {/* Sidebar - Fixed positioned, independent of main content scroll */}
        <motion.div
          initial={false}
          animate={{ width: isCollapsed ? 64 : 256 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed left-0 top-0 h-full z-30"
        >
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            userProfile={userProfile}
          />
        </motion.div>

        {/* Main Content Area - Has left margin to account for fixed sidebar */}
        <div className={`min-h-screen flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-16' : 'ml-64'
          }`}>
          {/* Header */}
          <Header
            userProfile={userProfile}
            currentPage={
              activeTab === 'home' ? 'Principal Dashboard' :
                activeTab === 'reports' ? 'Reports & Analytics' :
                  activeTab === 'roster' ? 'Department Roster' :
                    activeTab === 'profile' ? 'Profile Settings' :
                      'Principal Dashboard'
            }
          />

          {/* Page Content - Scrollable area */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1],
                    scale: { duration: 0.3 }
                  }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Mobile Overlay for Sidebar - Only on mobile devices */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
              onClick={() => setIsCollapsed(true)}
            />
          )}
        </AnimatePresence>
      </div>
    </PrincipalContext.Provider>
  )
}

export default PrincipalLayout

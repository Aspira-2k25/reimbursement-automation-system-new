import Pagination from '../../../../components/Pagination'
import useDashboardTab from '../../../../hooks/useDashboardTab'
import usePersistentNotifications from '../../../../hooks/usePersistentNotifications'
import { lazy } from 'react';
import { useState, createContext, useContext, useCallback, useMemo, useEffect, useRef } from "react";
import { motion as Motion, AnimatePresence } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { initialPrincipalData } from '../data/mockData'
import { useAuth } from '../../../../context/AuthContext'
import { studentFormsAPI, facultyFormsAPI, dashboardAPI } from '../../../../services/api'
import { toast } from 'react-hot-toast'
import { resolveDepartment } from '../../../../utils/departmentResolver'
import HomeDashboard from './HomeDashboard'
const ReportsAndAnalytics = lazy(() => import("./ReportsAndAnalytics"))
import DepartmentRoster from './DepartmentRoster'
const ProfileSettings = lazy(() => import("./ProfileSettings"))
const ChangePassword = lazy(() => import("../../../../components/ChangePassword"))

// Context for sharing Principal state across components
const PrincipalContext = createContext()

export const usePrincipalContext = () => {
  const context = useContext(PrincipalContext)
  if (!context) {
    throw new Error('usePrincipalContext must be used within PrincipalLayout')
  }
  return context
}

const PrincipalLayout = () => {
  const { user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 1024)
  const [activeTab, setActiveTab] = useDashboardTab('/dashboard/principal', ["home","reports","roster","profile","change-password"])
  const [userProfile, setUserProfile] = useState(initialPrincipalData.userProfile)
  const [allRequests, setAllRequests] = useState([])
  const [departments, setDepartments] = useState(initialPrincipalData.departments)
  const [activityLog, setActivityLog] = useState([])
  const [notifications, setNotifications] = useState([])
  const persistentNotifications = usePersistentNotifications()
  const [loading, setLoading] = useState(false)
  const [searchQuery, updateSearchQuery] = useState('')
  const [statusFilter, updateStatusFilter] = useState('Under Principal')
  const [departmentFilter, updateDepartmentFilter] = useState('All')
  const [typeFilter, updateTypeFilter] = useState('All')
  const [queuePage, setQueuePage] = useState(1)
  const [queuePagination, setQueuePagination] = useState(null)
  const [summary, setSummary] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [requestError, setRequestError] = useState(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const requestGeneration = useRef(0)
  const setSearchQuery = useCallback(value => { setQueuePage(1); updateSearchQuery(value) }, [])
  const setStatusFilter = useCallback(value => { setQueuePage(1); updateStatusFilter(value) }, [])
  const setTypeFilter = useCallback(value => { setQueuePage(1); updateTypeFilter(value) }, [])
  const setDepartmentFilter = useCallback(value => { setQueuePage(1); updateDepartmentFilter(value) }, [])
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200)
    return () => clearTimeout(timer)
  }, [searchQuery])


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
        employeeId: user.employeeId || user.id,
        department: resolveDepartment(user.department)
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
      facultyId: f.facultyId,
      name: f.name,
      remarks: f.remarks,
      academicYear: f.academicYear,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      documents: f.documents || [],
      reimbursementType: f.reimbursementType,
      hodComments: f.hodComments || '',
      principalComments: f.principalComments || '',
      courseName: f.courseName || 'N/A',
      marks: f.marks ?? 'N/A',
    }
  }, [])

  // Role-scoped queue pages and full filtered aggregates come from one backend policy.
  const fetchRequests = useCallback(async () => {
    const generation = ++requestGeneration.current
    if (!user) return
    setLoading(true)
    setRequestError(null)
    const filters = { department: departmentFilter, applicantType: typeFilter, search: debouncedSearch }
    try {
      const [pageData, aggregateData] = await Promise.all([
        dashboardAPI.list({ ...filters, page: queuePage, limit: 15, status: statusFilter === 'Under Accounts' ? 'Approved' : statusFilter }),
        dashboardAPI.analytics(filters)
      ])
      if (generation !== requestGeneration.current) return
      setAllRequests((pageData.forms || []).map(mapFormToRequest))
      setQueuePagination(pageData.pagination)
      if (queuePage > Math.max(1, pageData.pagination?.totalPages || 1)) setQueuePage(Math.max(1, pageData.pagination?.totalPages || 1))
      setSummary(aggregateData.summary)
      setAnalytics(aggregateData)
    } catch (error) {
      if (generation !== requestGeneration.current) return
      setRequestError(error.error || error.message || 'Unable to load dashboard data. Please retry.')
    } finally {
      if (generation === requestGeneration.current) setLoading(false)
    }
  }, [user, queuePage, statusFilter, typeFilter, debouncedSearch, departmentFilter, mapFormToRequest])
  useEffect(() => {
    fetchRequests()
    return () => { requestGeneration.current += 1 }
  }, [fetchRequests])

  const collegeStats = useMemo(() => {
    const counts = summary || {}
    const approved = (counts.approved || 0) + (counts.reimbursed || 0)
    const processed = approved + (counts.rejected || 0)
    return {
      total: counts.total || 0,
      pending: analytics?.byStatus?.find(bucket => bucket._id === 'Under Principal')?.count || 0,
      approved, rejected: counts.rejected || 0,
      approvedAmount: counts.reimbursedAmount || 0,
      approvalRate: processed ? Math.round(approved / processed * 100) : 0,
      budgetUtilization: null,
    }
  }, [summary, analytics])

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
      case 'change-password':
        return <ChangePassword />
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
    queuePage,
    setQueuePage,
    queuePagination,
    summary,
    analytics,
    requestError,
    refreshRequests: fetchRequests,
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
    updateRequestStatus: useCallback(async (requestId, newStatus, comments = '') => {
      try {
        // Find the request to determine which API to use
        const request = allRequests.find(req =>
          req.id === requestId ||
          req._id === requestId ||
          req.applicationId === requestId
        )

        if (!request) {
          toast.error('Request not found')
          return false
        }

        // Validate status - Principal can only update "Under Principal" requests
        if (request.status !== 'Under Principal') {
          toast.error(`Cannot update request. Current status is "${request.status}". Only requests with status "Under Principal" can be approved/rejected by Principal.`)
          return false
        }

        // Get the correct form ID
        const formId = request._id || request.applicationId || request.id

        // Prepare update data
        const updateData = {
          status: newStatus,
          reviewedBy: userProfile.fullName,
          reviewedAt: new Date().toISOString()
        }
        if (comments) {
          updateData.remarks = comments
          // Add rejectionRemarks for workflow tracking when rejecting
          if (newStatus === 'Rejected') {
            updateData.rejectionRemarks = comments
          }
        }

        // Call the correct API based on applicant type
        if (request.applicantType === 'Student') {
          await studentFormsAPI.updateById(formId, updateData)
        } else {
          await facultyFormsAPI.updateById(formId, updateData)
        }

        // Refresh requests from server
        await fetchRequests()

        // Add notification for status change
        const newNotification = {
          id: Date.now(),
          type: 'status_change',
          title: `Request ${newStatus}`,
          message: `${request.applicantName}'s request has been ${newStatus.toLowerCase()}`,
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
          target: request.applicantName,
          details: `Request ${requestId} ${newStatus.toLowerCase()}${comments ? ` - ${comments}` : ''}`,
          timestamp: new Date().toISOString(),
          type: newStatus.toLowerCase(),
          department: request.department
        }
        setActivityLog(prev => [newActivity, ...prev])

        toast.success(`Request ${newStatus.toLowerCase()} successfully`)
        return true
      } catch (error) {
        console.error('Error updating request status:', error)
        const errorMessage = error?.response?.data?.error || error?.error || error?.message || 'Failed to update request status'
        toast.error(errorMessage)
        return false
      }
    }, [allRequests, fetchRequests, userProfile]),

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

    getFilteredRequests: useCallback(() => allRequests, [allRequests]),
    ...persistentNotifications

  }

  return (
    <PrincipalContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50/30">
        {/* Sidebar - Fixed positioned, independent of main content scroll */}
        <Motion.div
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
        </Motion.div>

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
                      activeTab === 'change-password' ? 'Change Password' :
                        'Principal Dashboard'
            }
          />

          {/* Page Content - Scrollable area */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6">
              {requestError && <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                <p>{requestError}</p>
                <button type="button" onClick={fetchRequests} className="mt-2 underline">Retry dashboard</button>
              </div>}

              <AnimatePresence mode="wait">
                <Motion.div
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
              {activeTab === 'home' && queuePagination && <Pagination page={queuePagination.page} totalPages={queuePagination.totalPages} total={queuePagination.total} pageSize={15} noun="requests" busy={loading} onPageChange={setQueuePage} />}
                </Motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Mobile Overlay for Sidebar - Only on mobile devices */}
        <AnimatePresence>
          {!isCollapsed && (
            <Motion.div
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

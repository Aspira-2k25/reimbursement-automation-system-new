import Pagination from '../../../../components/Pagination'
import useDashboardTab from '../../../../hooks/useDashboardTab'
import usePersistentNotifications from '../../../../hooks/usePersistentNotifications'
import { lazy } from 'react';
import { useState, createContext, useContext, useCallback, useMemo, useEffect, useRef } from "react";
import { motion as Motion, AnimatePresence } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { initialHodData } from '../data/mockData'
import { useAuth } from '../../../../context/AuthContext'
import { studentFormsAPI, facultyFormsAPI, dashboardAPI } from '../../../../services/api'
import { toast } from 'react-hot-toast'
import { resolveDepartment } from '../../../../utils/departmentResolver'
import HomeDashboard from './HomeDashboard'
const ReportsAndAnalytics = lazy(() => import("./ReportsAndAnalytics"))
const ApplyForReimbursement = lazy(() => import("./ApplyForReimbursement"))
const ProfileSettings = lazy(() => import("./ProfileSettings"))
import RequestStatus from './RequestStatus'
const AllDepartmentOverview = lazy(() => import("./AllDepartmentOverview"))
const ChangePassword = lazy(() => import("../../../../components/ChangePassword"))

// Context for sharing HOD state across components
const HODContext = createContext()

export const useHODContext = () => {
  const context = useContext(HODContext)
  if (!context) {
    throw new Error('useHODContext must be used within HODLayout')
  }
  return context
}

const HODLayout = () => {
  const { user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 1024)
  const [activeTab, setActiveTab] = useDashboardTab('/dashboard/hod', ["home","reports","apply","request-status","all-departments","profile","change-password"])
  const [userProfile, setUserProfile] = useState(initialHodData.userProfile)
  const [allRequests, setAllRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [departmentMembers, setDepartmentMembers] = useState([])
  const [notifications, setNotifications] = useState([])
  const persistentNotifications = usePersistentNotifications()
  const [searchQuery, updateSearchQuery] = useState('')
  const [statusFilter, updateStatusFilter] = useState('Pending') // Default to show pending/Under HOD requests
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

  // Helper function to map backend data to HOD dashboard format
  const mapFormToRequest = useCallback((f) => {
    // Ensure amount is a number for calculations, but format as string for display
    const amountNum = typeof f.amount === 'number' ? f.amount : parseFloat(f.amount) || 0

    // Ensure _id is preserved as a string for API calls
    const mongoId = f._id ? String(f._id) : null

    return {
      id: f.applicationId || f._id || `form-${f._id}`,
      _id: mongoId, // Always preserve MongoDB _id as string
      applicationId: f.applicationId,
      userId: f.userId,
      applicantName: f.name || 'N/A',
      applicantId: f.studentId || f.facultyId || 'N/A',
      applicantType: f.applicantType || 'Student',
      applicantEmail: f.email,
      department: f.department || 'N/A',
      category: f.reimbursementType || f.category || "NPTEL",
      amount: `₹${amountNum.toLocaleString()}`,
      amountNum: amountNum,
      status: f.status || "Pending", // Preserve exact status from backend
      submittedDate: f.createdAt ? new Date(f.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      lastUpdated: f.updatedAt ? new Date(f.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      year: f.academicYear || f.year || 'N/A',
      description: f.remarks || f.description || f.name || 'N/A',
      // Preserve all backend fields for the view modal
      email: f.email,
      division: f.division,
      studentId: f.studentId,
      facultyId: f.facultyId,
      name: f.name,
      remarks: f.remarks,
      academicYear: f.academicYear,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      documents: f.documents || [], // Very important for viewing documents!
      reimbursementType: f.reimbursementType,
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
    const filters = {  applicantType: typeFilter, search: debouncedSearch }
    try {
      const [pageData, aggregateData] = await Promise.all([
        dashboardAPI.list({ ...filters, page: queuePage, limit: 10, status: statusFilter === 'Under Accounts' ? 'Approved' : statusFilter }),
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
  }, [user, queuePage, statusFilter, typeFilter, debouncedSearch, mapFormToRequest])
  useEffect(() => {
    fetchRequests()
    return () => { requestGeneration.current += 1 }
  }, [fetchRequests])

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
        department: resolveDepartment(user.department),
        designation: user.designation || user.role,
        role: user.role,
        email: userEmail,
        phone: user.phone,
        joinDate: user.joinDate,
        employeeId: user.employeeId || user.id
      })
    }
  }, [user])

  const dashboardStats = useMemo(() => {
    const counts = summary || {}
    const bucket = status => analytics?.byStatus?.find(item => item._id === status) || {}
    const pending = bucket('Under HOD').count || 0
    const underPrincipal = bucket('Under Principal').count || 0
    const approved = underPrincipal + (counts.approved || 0) + (counts.reimbursed || 0)
    const total = counts.total || 0
    return {
      total, pending, underPrincipal, approved, rejected: counts.rejected || 0,
      totalAmount: counts.totalAmount || 0, approvedAmount: counts.reimbursedAmount || 0,
      pendingAmount: bucket('Under HOD').totalAmount || 0,
      approvalRate: total ? Math.round(approved / total * 100) : 0,
      pendingRate: total ? Math.round(pending / total * 100) : 0,
    }
  }, [summary, analytics])

  // Function to render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeDashboard />
      case 'reports':
        return <ReportsAndAnalytics />
      case 'apply':
        return <ApplyForReimbursement />
      case 'request-status':
        return <RequestStatus />
      case 'all-departments':
        return <AllDepartmentOverview />
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
    loading,
    departmentMembers,
    setDepartmentMembers,
    fetchRequests,

    // Computed values
    dashboardStats,
    calculateStats: () => dashboardStats,
    reimbursementOptions: initialHodData.reimbursementOptions,

    // UI State
    notifications,
    setNotifications,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,

    // Helper methods
    updateRequestStatus: useCallback(async (requestId, newStatus, remarks = '') => {
      try {
        // Try to find request by multiple ID fields
        const request = allRequests.find(req =>
          req.id === requestId ||
          req._id === requestId ||
          req.applicationId === requestId ||
          String(req.id) === String(requestId) ||
          String(req._id) === String(requestId) ||
          String(req.applicationId) === String(requestId)
        )

        if (!request) {
          console.error('Request not found:', requestId)
          console.error('Available requests:', allRequests.map(r => ({
            id: r.id,
            _id: r._id,
            applicationId: r.applicationId,
            applicantName: r.applicantName,
            status: r.status
          })))
          toast.error(`Request ${requestId} not found. Please refresh the page.`)
          return false
        }

        // Validate request status - Backend requires exactly "Under HOD" for updates
        const currentStatus = String(request.status || '').trim()

        // CRITICAL: Backend validation requires exactly "Under HOD" status
        // Student forms backend (line 385 in StudentFormRoutes.js) requires exactly "Under HOD"
        // Faculty forms backend (line 252 in formRoutes.js) doesn't check status, but we validate for consistency
        if (currentStatus !== 'Under HOD') {
          const statusMap = {
            'Pending': 'Request is still pending coordinator approval. Coordinator must approve it first to change status to "Under HOD".',
            'Under Coordinator': 'Request is under coordinator review. Coordinator must approve it first.',
            'Under Principal': 'Request has already been sent to Principal and cannot be modified.',
            'Approved': 'Request has already been approved and cannot be modified.',
            'Rejected': 'Request has already been rejected and cannot be modified.'
          }

          const errorMsg = statusMap[currentStatus] || `Cannot update request. Current status is "${currentStatus}". Only requests with status "Under HOD" can be approved/rejected by HOD.`
          toast.error(errorMsg)
          console.error('Invalid status for HOD update:', {
            currentStatus,
            requestId,
            formId: request._id || request.applicationId,
            applicantType: request.applicantType,
            applicantName: request.applicantName,
            request: {
              id: request.id,
              _id: request._id,
              applicationId: request.applicationId,
              status: request.status
            },
            expectedStatus: 'Under HOD',
            allRequestStatuses: allRequests.map(r => ({ id: r.id, status: r.status }))
          })
          return false
        }

        // Get the correct form ID - backend expects MongoDB _id for student forms
        // For faculty forms, it can use either _id or applicationId
        let formId = null

        if (request.applicantType === 'Student') {
          // Student forms: backend uses MongoDB _id (line 336 in StudentFormRoutes.js)
          formId = request._id
          if (!formId) {
            // Fallback: try to extract from id if it's a MongoDB ObjectId format
            const idStr = String(request.id || request.applicationId || '')
            // MongoDB ObjectId is 24 hex characters
            if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
              formId = idStr
            } else if (idStr.startsWith('form-')) {
              formId = idStr.replace('form-', '')
            }
          }
        } else {
          // Faculty forms: backend tries applicationId first, then _id (line 252 in formRoutes.js)
          formId = request.applicationId || request._id || request.id
        }

        // If formId is still a string like "form-123", extract the actual ID
        if (formId && String(formId).startsWith('form-')) {
          formId = String(formId).replace('form-', '')
        }

        if (!formId) {
          console.error('No valid form ID found for request:', {
            request,
            _id: request._id,
            applicationId: request.applicationId,
            id: request.id,
            applicantType: request.applicantType
          })
          toast.error('Invalid request ID. Please refresh the page.')
          return false
        }

        // Ensure formId is a string
        formId = String(formId)


        // Update status via API - choose correct API based on applicantType
        const updateData = { status: newStatus }
        if (remarks) {
          updateData.remarks = remarks
          // Add rejectionRemarks for workflow tracking when rejecting
          if (newStatus === 'Rejected') {
            updateData.rejectionRemarks = remarks
          }
        }

        // Use correct API based on request type
        try {
          if (request.applicantType === 'Student') {
            await studentFormsAPI.updateById(formId, updateData)
          } else {
            await facultyFormsAPI.updateById(formId, updateData)
          }
        } catch (apiError) {
          console.error('API call failed:', apiError)
          const apiErrorMessage = apiError?.response?.data?.error || apiError?.error || apiError?.message || 'API call failed'
          throw new Error(apiErrorMessage)
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

        return true
      } catch (error) {
        console.error('Error updating request status:', error)
        console.error('Error details:', {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
          statusText: error?.response?.statusText
        })
        const errorMessage = error?.response?.data?.error || error?.error || error?.message || 'Failed to update request status'
        toast.error(errorMessage)
        return false
      }
    }, [allRequests, fetchRequests]),

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
    <HODContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#65CCB8]/10">
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
              activeTab === 'home' ? 'HOD Dashboard' :
                activeTab === 'reports' ? 'Reports & Analytics' :
                  activeTab === 'roster' ? 'Department Roster' :
                    activeTab === 'apply' ? 'Apply for Reimbursement' :
                      activeTab === 'request-status' ? 'Request Status' :
                        activeTab === 'all-departments' ? 'ALL Department Overview' :
                          activeTab === 'profile' ? 'Profile Settings' :
                            activeTab === 'change-password' ? 'Change Password' :
                              'HOD Dashboard'
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
              {activeTab === 'home' && queuePagination && <Pagination page={queuePagination.page} totalPages={queuePagination.totalPages} total={queuePagination.total} pageSize={10} noun="requests" busy={loading} onPageChange={setQueuePage} />}
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
    </HODContext.Provider>
  )
}

export default HODLayout

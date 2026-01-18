import React, { useState, createContext, useContext, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { initialHodData } from '../data/mockData'
import { useAuth } from '../../../../context/AuthContext'
import { studentFormsAPI, facultyFormsAPI } from '../../../../services/api'
import { toast } from 'react-hot-toast'
import HomeDashboard from './HomeDashboard'
import ReportsAndAnalytics from './ReportsAndAnalytics'
import ApplyForReimbursement from './ApplyForReimbursement'
import ProfileSettings from './ProfileSettings'
import RequestStatus from './RequestStatus'
import AllDepartmentOverview from './AllDepartmentOverview'

// Context for sharing HOD state across components
const HODContext = createContext()

export const useHODContext = () => {
  const context = useContext(HODContext)
  if (!context) {
    throw new Error('useHODContext must be used within HODLayout')
  }
  return context
}

const HODLayout = ({ children }) => {
  const { user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [userProfile, setUserProfile] = useState(initialHodData.userProfile)
  const [allRequests, setAllRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [departmentMembers, setDepartmentMembers] = useState([])
  const [notifications, setNotifications] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('Pending') // Default to show pending/Under HOD requests
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
      name: f.name,
      remarks: f.remarks,
      academicYear: f.academicYear,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      documents: f.documents || [], // Very important for viewing documents!
      reimbursementType: f.reimbursementType,
    }
  }, [])

  // Fetch both student AND faculty requests from API
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch student forms AND faculty forms in parallel
      const [
        studentHodData, studentApprovedData, studentRejectedData,
        facultyHodData, facultyApprovedData, facultyRejectedData
      ] = await Promise.allSettled([
        studentFormsAPI.listForHOD(),
        studentFormsAPI.listApproved(),
        studentFormsAPI.listRejected(),
        facultyFormsAPI.listForHOD(),
        facultyFormsAPI.listApproved(),
        facultyFormsAPI.listRejected()
      ])

      let allForms = []

      // Process student forms (add applicantType: 'Student')
      if (studentHodData.status === 'fulfilled') {
        const forms = (studentHodData.value?.forms || studentHodData.value || [])
          .map(f => ({ ...f, applicantType: 'Student' }))
        allForms = [...allForms, ...forms]
      }

      if (studentApprovedData.status === 'fulfilled') {
        const forms = (studentApprovedData.value?.forms || studentApprovedData.value || [])
          .filter(f => f.status === 'Under Principal')
          .map(f => ({ ...f, applicantType: 'Student' }))
        allForms = [...allForms, ...forms]
      }

      if (studentRejectedData.status === 'fulfilled') {
        const forms = (studentRejectedData.value?.forms || studentRejectedData.value || [])
          .map(f => ({ ...f, applicantType: 'Student' }))
        allForms = [...allForms, ...forms]
      }

      // Process faculty forms (already have applicantType from backend)
      if (facultyHodData.status === 'fulfilled') {
        const forms = (facultyHodData.value?.forms || facultyHodData.value || [])
          .map(f => ({ ...f, applicantType: f.applicantType || 'Faculty' }))
        allForms = [...allForms, ...forms]
      }

      if (facultyApprovedData.status === 'fulfilled') {
        const forms = (facultyApprovedData.value?.forms || facultyApprovedData.value || [])
          .filter(f => f.status === 'Under Principal')
          .map(f => ({ ...f, applicantType: f.applicantType || 'Faculty' }))
        allForms = [...allForms, ...forms]
      }

      if (facultyRejectedData.status === 'fulfilled') {
        const forms = (facultyRejectedData.value?.forms || facultyRejectedData.value || [])
          .map(f => ({ ...f, applicantType: f.applicantType || 'Faculty' }))
        allForms = [...allForms, ...forms]
      }

      // Map backend data to HOD dashboard format
      const mappedRequests = allForms.map(mapFormToRequest)

      console.log('Fetched HOD requests - Total:', mappedRequests.length)
      console.log('By type:', {
        'Student': mappedRequests.filter(r => r.applicantType === 'Student').length,
        'Faculty': mappedRequests.filter(r => r.applicantType === 'Faculty').length
      })
      console.log('By status:', {
        'Under HOD': mappedRequests.filter(r => r.status === 'Under HOD').length,
        'Pending': mappedRequests.filter(r => r.status === 'Pending').length,
        'Under Coordinator': mappedRequests.filter(r => r.status === 'Under Coordinator').length,
        'Under Principal': mappedRequests.filter(r => r.status === 'Under Principal').length,
        'Rejected': mappedRequests.filter(r => r.status === 'Rejected').length
      })
      
      // Log sample requests to debug ID and status issues
      if (mappedRequests.length > 0) {
        console.log('Sample requests:', mappedRequests.slice(0, 3).map(r => ({
          id: r.id,
          _id: r._id,
          applicationId: r.applicationId,
          status: r.status,
          applicantType: r.applicantType,
          applicantName: r.applicantName
        })))
      }
      
      setAllRequests(mappedRequests)
    } catch (error) {
      console.error('Error fetching HOD requests:', error)
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

  // Update userProfile when user data from AuthContext changes
  useEffect(() => {
    if (user) {
      console.log('HOD Dashboard - User data:', user)

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
        department: user.department,
        designation: user.designation || user.role,
        role: user.role,
        email: userEmail,
        phone: user.phone,
        joinDate: user.joinDate,
        employeeId: user.employeeId || user.id
      })
    }
  }, [user])

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
    loading,
    departmentMembers,
    setDepartmentMembers,
    fetchRequests,

    // Computed values
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

        console.log('Updating request:', { 
          requestId, 
          formId, 
          currentStatus,
          newStatus, 
          applicantType: request.applicantType,
          applicantName: request.applicantName 
        })

        // Update status via API - choose correct API based on applicantType
        const updateData = { status: newStatus }
        if (remarks) {
          updateData.remarks = remarks
        }

        // Use correct API based on request type
        let response
        try {
          if (request.applicantType === 'Faculty' || request.applicantType === 'Coordinator') {
            console.log('Calling facultyFormsAPI.updateById with:', { formId, updateData })
            response = await facultyFormsAPI.updateById(formId, updateData)
          } else {
            console.log('Calling studentFormsAPI.updateById with:', { formId, updateData })
            response = await studentFormsAPI.updateById(formId, updateData)
          }
          console.log('API response:', response)
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

    // Filtering and search
    getFilteredRequests: useCallback(() => {
      const filtered = allRequests.filter(request => {
        const matchesSearch =
          request.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.category.toLowerCase().includes(searchQuery.toLowerCase())

        // Handle status filtering - "Under HOD" should match "Pending" filter for HOD dashboard
        let matchesStatus = false
        if (statusFilter === 'All') {
          matchesStatus = true
        } else if (statusFilter === 'Pending') {
          // For HOD, "Under HOD" status means pending
          matchesStatus = request.status === 'Pending' || request.status === 'Under HOD'
        } else if (statusFilter === 'Under HOD') {
          // Explicitly handle "Under HOD" filter
          matchesStatus = request.status === 'Under HOD'
        } else {
          matchesStatus = request.status === statusFilter
        }

        const matchesType = typeFilter === 'All' || request.applicantType === typeFilter

        return matchesSearch && matchesStatus && matchesType
      })

      console.log('Filtered requests:', {
        totalRequests: allRequests.length,
        statusFilter,
        typeFilter,
        searchQuery,
        filteredCount: filtered.length,
        filteredRequests: filtered
      })

      return filtered
    }, [allRequests, searchQuery, statusFilter, typeFilter])
  }

  return (
    <HODContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#65CCB8]/10">
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
              activeTab === 'home' ? 'HOD Dashboard' :
                activeTab === 'reports' ? 'Reports & Analytics' :
                  activeTab === 'roster' ? 'Department Roster' :
                    activeTab === 'apply' ? 'Apply for Reimbursement' :
                      activeTab === 'request-status' ? 'Request Status' :
                        activeTab === 'all-departments' ? 'ALL Department Overview' :
                          activeTab === 'profile' ? 'Profile Settings' :
                            'HOD Dashboard'
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
    </HODContext.Provider>
  )
}

export default HODLayout

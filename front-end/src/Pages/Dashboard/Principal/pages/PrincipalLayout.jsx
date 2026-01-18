import React, { useState, createContext, useContext, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { initialPrincipalData, calculateCollegeStats } from '../data/mockData'
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
  const [userProfile, setUserProfile] = useState(initialPrincipalData.userProfile)
  const [allRequests, setAllRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState(initialPrincipalData.departments)
  const [activityLog, setActivityLog] = useState([])
  const [notifications, setNotifications] = useState([])
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

  // Helper function to map backend data to Principal dashboard format
  const mapFormToRequest = useCallback((f) => {
    // Ensure amount is a number for calculations, but format as string for display
    const amountNum = typeof f.amount === 'number' ? f.amount : parseFloat(f.amount) || 0

    return {
      id: f.applicationId || f._id || `form-${f._id}`,
      _id: f._id,
      applicationId: f.applicationId,
      userId: f.userId,
      applicantName: f.name || 'N/A',
      applicantId: f.studentId || f.facultyId || 'N/A',
      applicantType: f.applicantType || (f.studentId ? 'Student' : 'Faculty'),
      applicantEmail: f.email,
      category: f.reimbursementType || f.category || "NPTEL",
      amount: amountNum,
      amountFormatted: `₹${amountNum.toLocaleString()}`,
      status: f.status || "Pending",
      submittedDate: f.createdAt ? new Date(f.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      lastUpdated: f.updatedAt ? new Date(f.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      year: f.academicYear || f.year || 'N/A',
      department: f.department || 'N/A',
      description: f.remarks || f.description || f.name || 'N/A',
    }
  }, [])

  // Fetch ALL requests (student and faculty) from API
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch ALL student and faculty forms in parallel (all statuses)
      const [
        studentPendingData, studentHodData, studentApprovedData, studentRejectedData,
        facultyHodData, facultyApprovedData, facultyRejectedData
      ] = await Promise.allSettled([
        studentFormsAPI.listPending(),
        studentFormsAPI.listForHOD(),
        studentFormsAPI.listApproved(),
        studentFormsAPI.listRejected(),
        facultyFormsAPI.listForHOD(),
        facultyFormsAPI.listApproved(),
        facultyFormsAPI.listRejected()
      ])

      let allForms = []
      const seenIds = new Set() // To avoid duplicates

      // Process student forms
      const processStudentForms = (data, status) => {
        if (data.status === 'fulfilled') {
          const forms = (data.value?.forms || data.value || [])
            .map(f => ({ ...f, applicantType: 'Student' }))
            .filter(f => {
              const id = f.applicationId || f._id
              if (seenIds.has(id)) return false
              seenIds.add(id)
              return true
            })
          allForms = [...allForms, ...forms]
        }
      }

      processStudentForms(studentPendingData, 'Pending')
      processStudentForms(studentHodData, 'Under HOD')
      processStudentForms(studentApprovedData, 'Approved')
      processStudentForms(studentRejectedData, 'Rejected')

      // Process faculty forms
      const processFacultyForms = (data, status) => {
        if (data.status === 'fulfilled') {
          const forms = (data.value?.forms || data.value || [])
            .map(f => ({ ...f, applicantType: f.applicantType || 'Faculty' }))
            .filter(f => {
              const id = f.applicationId || f._id
              if (seenIds.has(id)) return false
              seenIds.add(id)
              return true
            })
          allForms = [...allForms, ...forms]
        }
      }

      processFacultyForms(facultyHodData, 'Under HOD')
      processFacultyForms(facultyApprovedData, 'Approved')
      processFacultyForms(facultyRejectedData, 'Rejected')

      // Map backend data to Principal dashboard format
      const mappedRequests = allForms.map(mapFormToRequest)

      console.log('Fetched Principal requests - Total:', mappedRequests.length)
      console.log('By type:', {
        'Student': mappedRequests.filter(r => r.applicantType === 'Student').length,
        'Faculty': mappedRequests.filter(r => r.applicantType === 'Faculty').length
      })
      console.log('By status:', {
        'Pending': mappedRequests.filter(r => r.status === 'Pending').length,
        'Under HOD': mappedRequests.filter(r => r.status === 'Under HOD').length,
        'Under Principal': mappedRequests.filter(r => r.status === 'Under Principal').length,
        'Approved': mappedRequests.filter(r => r.status === 'Approved').length,
        'Rejected': mappedRequests.filter(r => r.status === 'Rejected').length
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

  // Update userProfile when user data from AuthContext changes
  useEffect(() => {
    if (user) {
      setUserProfile({
        fullName: user.fullName || user.name ,
        college: user.college ,
        designation: user.designation || user.role ,
        role: user.role,
        email: user.email,
        phone: user.phone ,
        joinDate: user.joinDate ,
        employeeId: user.employeeId || user.id 
      })
    }
  }, [user])

  // Calculate college-wide statistics
  const collegeStats = useMemo(() => {
    return calculateCollegeStats(allRequests, departments)
  }, [allRequests, departments])

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
    loading,
    departments,
    setDepartments,
    activityLog,
    setActivityLog,
    fetchRequests,

    // Computed values
    collegeStats,

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
        // Find the request to update
        const request = allRequests.find(req => req.id === requestId || req._id === requestId || req.applicationId === requestId)
        if (!request) {
          toast.error('Request not found')
          return
        }

        // Determine which API to use based on applicant type
        const isStudent = request.applicantType === 'Student'
        const api = isStudent ? studentFormsAPI : facultyFormsAPI
        const formId = request._id || request.applicationId || requestId

        // Update via API
        await api.updateById(formId, {
          status: newStatus,
          remarks: comments || request.description
        })

        // Update local state
        setAllRequests(prev => {
          const updatedRequests = prev.map(req =>
            (req.id === requestId || req._id === requestId || req.applicationId === requestId)
              ? {
                  ...req,
                  status: newStatus,
                  lastUpdated: new Date().toISOString().split('T')[0],
                  principalComments: comments,
                  description: comments || req.description
                }
              : req
          )

          // Find the updated request for notifications and activity log
          const updatedRequest = updatedRequests.find(req => req.id === requestId || req._id === requestId || req.applicationId === requestId)
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

        toast.success(`Request ${newStatus.toLowerCase()} successfully`)
      } catch (error) {
        console.error('Error updating request status:', error)
        toast.error(error?.error || 'Failed to update request status')
      }
    }, [userProfile, allRequests]),

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
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
        <div className={`min-h-screen flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'ml-16' : 'ml-64'
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

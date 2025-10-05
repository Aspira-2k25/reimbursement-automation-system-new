import React, { useState, createContext, useContext, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { initialPrincipalData, calculateCollegeStats } from '../data/mockData'
import { useAuth } from '../../../../context/AuthContext'
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
  const [allRequests, setAllRequests] = useState(initialPrincipalData.allRequests)
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

  // Update userProfile when user data from AuthContext changes
  useEffect(() => {
    if (user) {
      setUserProfile({
        fullName: user.fullName || user.name || 'Dr. Rajesh Kumar',
        college: user.college || 'Engineering College',
        designation: user.designation || user.role || 'Principal',
        role: user.role || 'Principal',
        email: user.email || 'principal@college.edu',
        phone: user.phone || '+91-9876543210',
        joinDate: user.joinDate || 'August 15, 2018',
        employeeId: user.employeeId || user.id || 'PRIN-001'
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
    departments,
    setDepartments,
    activityLog,
    setActivityLog,
    
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

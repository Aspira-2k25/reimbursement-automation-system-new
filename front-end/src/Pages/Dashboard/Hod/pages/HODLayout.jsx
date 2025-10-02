import React, { useState, createContext, useContext, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { initialHodData } from '../data/mockData'

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
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [userProfile, setUserProfile] = useState(initialHodData.userProfile)
  const [allRequests, setAllRequests] = useState(initialHodData.allRequests)
  const [departmentMembers, setDepartmentMembers] = useState(initialHodData.departmentMembers)
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'request',
      title: 'New Reimbursement Request',
      message: 'Rajesh Kumar submitted a new request for ₹3,500',
      time: '5 min ago',
      unread: true,
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      type: 'approval',
      title: 'Request Approved',
      message: 'Dr. Priya Sharma\'s research grant has been approved',
      time: '1 hour ago',
      unread: true,
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      type: 'reminder',
      title: 'Pending Reviews',
      message: '3 requests are pending your review',
      time: '2 hours ago',
      unread: false,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 4,
      type: 'system',
      title: 'System Update',
      message: 'New features have been added to the dashboard',
      time: '1 day ago',
      unread: false,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }
  ])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
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
    departmentMembers,
    setDepartmentMembers,
    
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
  updateRequestStatus: useCallback((requestId, newStatus) => {
    setAllRequests(prev => 
      prev.map(req => 
        req.id === requestId 
          ? { ...req, status: newStatus, lastUpdated: new Date().toISOString().split('T')[0] }
          : req
      )
    )
    
    // Add notification for status change
    const request = allRequests.find(req => req.id === requestId)
    if (request) {
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
    }
  }, [allRequests]),
    
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
          request.category.toLowerCase().includes(searchQuery.toLowerCase())
        
        const matchesStatus = statusFilter === 'All' || request.status === statusFilter
        const matchesType = typeFilter === 'All' || request.applicantType === typeFilter
        
        return matchesSearch && matchesStatus && matchesType
      })
    }, [allRequests, searchQuery, statusFilter, typeFilter])
  }

  return (
    <HODContext.Provider value={contextValue}>
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
                  {children}
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

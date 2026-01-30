import React, { useState, createContext, useContext, useCallback, useMemo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { initialAccountsData } from '../data/mockData'
import { useAuth } from '../../../../context/AuthContext'
import { studentFormsAPI, facultyFormsAPI } from '../../../../services/api'
import { toast } from 'react-hot-toast'
import HomeDashboard from './HomeDashboard'
import ProfileSettings from './ProfileSettings'

// Context for sharing Accounts state across components
const AccountsContext = createContext()

export const useAccountsContext = () => {
  const context = useContext(AccountsContext)
  if (!context) {
    throw new Error('useAccountsContext must be used within AccountsLayout')
  }
  return context
}

const AccountsLayout = () => {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Get initial tab from URL hash
  const getTabFromHash = () => {
    const hash = location.hash.replace('#', '')
    return hash || 'home'
  }

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState(getTabFromHash())
  const [userProfile, setUserProfile] = useState(initialAccountsData.userProfile)
  const [allRequests, setAllRequests] = useState(initialAccountsData.allRequests)
  const [departments] = useState(initialAccountsData.departments)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })

  // Sync activeTab with URL hash for browser navigation support
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash && hash !== activeTab) {
      setActiveTab(hash)
    } else if (!hash && activeTab !== 'home') {
      setActiveTab('home')
    }
  }, [location.hash])

  // Custom setActiveTab that also updates URL
  const handleSetActiveTab = useCallback((tab) => {
    setActiveTab(tab)
    navigate(tab === 'home' ? '/dashboard/accounts' : `/dashboard/accounts#${tab}`, { replace: false })
  }, [navigate])

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
      console.log('Accounts Dashboard - User data:', user)

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
        designation: user.designation || 'Accounts Officer',
        role: user.role,
        email: userEmail,
        phone: user.phone,
        joinDate: user.joinDate,
        employeeId: user.employeeId || user.id,
        department: user.department || 'Accounts'
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
      status: f.status || 'Approved',
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
      principalComments: f.principalComments || '',
      // Bank details for disbursement
      bankName: f.bankName || '',
      accountNumber: f.accountNumber || '',
      ifscCode: f.ifscCode || '',
      accountHolderName: f.accountHolderName || f.name || ''
    }
  }, [])

  // Fetch all requests for Accounts (Approved + Disbursed)
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch forms for accounts (Approved and Disbursed status)
      const [
        studentAccountsData,
        facultyAccountsData
      ] = await Promise.allSettled([
        studentFormsAPI.listForAccounts(),
        facultyFormsAPI.listForAccounts()
      ])

      let allForms = []

      // Process student forms
      if (studentAccountsData.status === 'fulfilled') {
        const forms = (studentAccountsData.value?.forms || studentAccountsData.value || [])
          .map(f => ({ ...f, applicantType: 'Student' }))
        allForms = [...allForms, ...forms]
      }

      // Process faculty forms
      if (facultyAccountsData.status === 'fulfilled') {
        const forms = (facultyAccountsData.value?.forms || facultyAccountsData.value || [])
          .map(f => ({ ...f, applicantType: f.applicantType || 'Faculty' }))
        allForms = [...allForms, ...forms]
      }

      // Map backend data to dashboard format
      const mappedRequests = allForms.map(mapFormToRequest)

      console.log('Fetched Accounts requests - Total:', mappedRequests.length)
      console.log('By status:', {
        'Approved': mappedRequests.filter(r => r.status === 'Approved').length,
        'Disbursed': mappedRequests.filter(r => r.status === 'Disbursed').length
      })

      setAllRequests(mappedRequests)
    } catch (error) {
      console.error('Error fetching Accounts requests:', error)
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

  // Calculate statistics
  const accountsStats = useMemo(() => {
    const total = allRequests.length
    const approved = allRequests.filter(r => r.status === 'Approved').length
    const disbursed = allRequests.filter(r => r.status === 'Disbursed').length
    const pendingDisbursement = approved // Approved but not yet disbursed
    const totalAmount = allRequests.reduce((sum, r) => sum + (r.amountNum || 0), 0)
    const disbursedAmount = allRequests
      .filter(r => r.status === 'Disbursed')
      .reduce((sum, r) => sum + (r.amountNum || 0), 0)
    const pendingAmount = allRequests
      .filter(r => r.status === 'Approved')
      .reduce((sum, r) => sum + (r.amountNum || 0), 0)

    return {
      total,
      approved,
      disbursed,
      pendingDisbursement,
      totalAmount,
      disbursedAmount,
      pendingAmount,
      disbursementRate: total > 0 ? Math.round((disbursed / total) * 100) : 0
    }
  }, [allRequests])

  // Update request status (mark as disbursed)
  const updateRequestStatus = useCallback(async (requestId, newStatus, comments = '') => {
    try {
      // Find the request to determine if it's student or faculty
      const request = allRequests.find(r => r.id === requestId || r.applicationId === requestId || r._id === requestId)

      if (!request) {
        toast.error('Request not found')
        return
      }

      // Determine which API to call based on applicant type
      const isStudent = request.applicantType === 'Student'
      const apiCall = isStudent ? studentFormsAPI : facultyFormsAPI
      const formId = request._id || request.id

      console.log(`Accounts: Updating ${isStudent ? 'student' : 'faculty'} form ${formId} to ${newStatus}`)

      // Call the API to update the status
      await apiCall.updateById(formId, {
        status: newStatus,
        accountsComments: comments
      })

      // Update local state
      setAllRequests(prev => prev.map(r => {
        if (r.id === requestId || r.applicationId === requestId || r._id === requestId) {
          return { ...r, status: newStatus }
        }
        return r
      }))

      toast.success(`Request marked as ${newStatus}`)
    } catch (error) {
      console.error('Error updating request status:', error)
      toast.error(error?.error || 'Failed to update request status')
    }
  }, [allRequests])

  // Filter requests based on search and filters
  const getFilteredRequests = useCallback(() => {
    return allRequests.filter(request => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          request.id?.toLowerCase().includes(searchLower) ||
          request.applicationId?.toLowerCase().includes(searchLower) ||
          request.applicantName?.toLowerCase().includes(searchLower) ||
          request.department?.toLowerCase().includes(searchLower) ||
          request.email?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'All' && request.status !== statusFilter) {
        return false
      }

      // Department filter
      if (departmentFilter !== 'All' && request.department !== departmentFilter) {
        return false
      }

      // Type filter (Student/Faculty)
      if (typeFilter !== 'All' && request.applicantType !== typeFilter) {
        return false
      }

      // Date filter
      if (dateFilter.from && new Date(request.submittedDate) < new Date(dateFilter.from)) {
        return false
      }
      if (dateFilter.to && new Date(request.submittedDate) > new Date(dateFilter.to)) {
        return false
      }

      return true
    })
  }, [allRequests, searchQuery, statusFilter, departmentFilter, typeFilter, dateFilter])

  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, unread: false } : n)
    )
  }, [])

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }, [])

  // Render active page based on tab
  const renderActiveTab = useCallback(() => {
    switch (activeTab) {
      case 'home':
        return <HomeDashboard />
      case 'profile':
        return <ProfileSettings />
      default:
        return <HomeDashboard />
    }
  }, [activeTab])

  // Context value
  const contextValue = useMemo(() => ({
    userProfile,
    setUserProfile,
    allRequests,
    setAllRequests,
    departments,
    accountsStats,
    updateRequestStatus,
    getFilteredRequests,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    departmentFilter,
    setDepartmentFilter,
    typeFilter,
    setTypeFilter,
    dateFilter,
    setDateFilter,
    loading,
    setLoading,
    activeTab,
    setActiveTab: handleSetActiveTab,
    isCollapsed,
    setIsCollapsed,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    fetchRequests
  }), [
    userProfile, allRequests, departments, accountsStats, updateRequestStatus,
    getFilteredRequests, searchQuery, statusFilter, departmentFilter, typeFilter,
    dateFilter, loading, activeTab, isCollapsed, notifications,
    markNotificationAsRead, markAllNotificationsAsRead, fetchRequests
  ])

  return (
    <AccountsContext.Provider value={contextValue}>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          userProfile={userProfile}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <Header userProfile={userProfile} currentPage={
            activeTab === 'home' ? 'Accounts Dashboard' :
              activeTab === 'profile' ? 'Profile Settings' :
                'Dashboard'
          } />

          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderActiveTab()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </AccountsContext.Provider>
  )
}

export default AccountsLayout

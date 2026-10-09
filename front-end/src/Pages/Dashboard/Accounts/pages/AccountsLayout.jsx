import usePersistentNotifications from '../../../../hooks/usePersistentNotifications'
import { useState, createContext, useContext, useCallback, useMemo, useEffect, useRef } from "react";
import { AnimatePresence, motion as Motion } from 'framer-motion'
import useDashboardTab from '../../../../hooks/useDashboardTab'
import { ArrowLeft } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { initialAccountsData } from '../data/mockData'
import { useAuth } from '../../../../context/AuthContext'
import { studentFormsAPI, facultyFormsAPI, dashboardAPI } from '../../../../services/api'
import { toast } from 'react-hot-toast'
import { resolveDepartment } from '../../../../utils/departmentResolver'
import HomeDashboard from './HomeDashboard'
import ProfileSettings from './ProfileSettings'
import ReimbursedList from './ReimbursedList'
import ChangePassword from '../../../../components/ChangePassword'

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
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 1024)
  const [activeTab, handleSetActiveTab] = useDashboardTab('/dashboard/accounts', ['home','reimbursed','profile','change-password'])
  const [userProfile, setUserProfile] = useState(initialAccountsData.userProfile)
  const [allRequests, setAllRequests] = useState(initialAccountsData.allRequests)
  const [departments] = useState(initialAccountsData.departments)
  const [notifications, setNotifications] = useState([])
  const persistentNotifications = usePersistentNotifications()
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })
  const [queuePage, setQueuePage] = useState(1)
  const [queuePagination, setQueuePagination] = useState({ total: 0, totalPages: 1 })
  const [summary, setSummary] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [requestError, setRequestError] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const requestGeneration = useRef(0)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200)
    return () => clearTimeout(timer)
  }, [searchQuery])
  useEffect(() => { setQueuePage(1) }, [activeTab, debouncedSearch, statusFilter, departmentFilter, typeFilter, dateFilter.from, dateFilter.to])

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
        designation: user.designation || 'Accounts Officer',
        role: user.role,
        email: userEmail,
        phone: user.phone,
        joinDate: user.joinDate,
        employeeId: user.employeeId || user.id,
        department: resolveDepartment(user.department) || 'Accounts'
      })
    }
  }, [user])

  // Map backend form data to dashboard request format
  const mapFormToRequest = useCallback((f) => {
    const amountNum = typeof f.amount === 'number' ? f.amount : parseFloat(f.amount) || 0

    return {
      id: f._id,
      _id: f._id,
      applicationId: f.applicationId || f._id, // Prefer applicationId, fallback to _id
      userId: f.userId,
      formType: f.formType,
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
      // Bank details for disbursement
      bankName: f.bankName || '',
      accountNumber: f.accountNumber || '',
      ifscCode: f.ifscCode || '',
      accountHolderName: f.accountHolderName || f.name || '',
      courseName: f.courseName || 'N/A',
      marks: f.marks ?? 'N/A',
    }
  }, [])

  const fetchRequests = useCallback(async () => {
    const generation = ++requestGeneration.current
    setLoading(true)
    try {
      const [data, aggregates] = await Promise.all([
        dashboardAPI.list({ page: queuePage, limit: 20,
          status: activeTab === 'reimbursed' ? 'Reimbursed' : statusFilter === 'All' ? 'Approved' : statusFilter,
          search: debouncedSearch, department: departmentFilter, applicantType: typeFilter,
          startDate: dateFilter.from, endDate: dateFilter.to }),
        dashboardAPI.analytics()
      ])
      if (generation !== requestGeneration.current) return
      setAllRequests((data.forms || []).map(mapFormToRequest))
      setQueuePagination(data.pagination)
      setSummary(aggregates.summary)
      setAnalytics(aggregates)
      setRequestError('')
      if (queuePage > Math.max(1, data.pagination.totalPages)) setQueuePage(Math.max(1, data.pagination.totalPages))
    } catch (error) {
      if (generation === requestGeneration.current) setRequestError(error?.error || 'Failed to fetch requests. Please retry.')
    } finally {
      if (generation === requestGeneration.current) setLoading(false)
    }
  }, [queuePage, activeTab, statusFilter, debouncedSearch, departmentFilter, typeFilter, dateFilter.from, dateFilter.to, mapFormToRequest])

  useEffect(() => {
    void fetchRequests()
    return () => { requestGeneration.current += 1 }
  }, [fetchRequests])

  const accountsStats = useMemo(() => {
    const totals = summary || { total: 0, approved: 0, reimbursed: 0, totalAmount: 0, reimbursedAmount: 0 }
    const pendingAmount = analytics?.byStatus?.find(bucket => bucket._id === 'Approved')?.totalAmount || 0
    return { ...totals, pendingDisbursement: totals.approved,
      disbursedAmount: totals.reimbursedAmount, pendingAmount,
      disbursementRate: totals.total ? Math.round(totals.reimbursed / totals.total * 100) : 0 }
  }, [summary, analytics])

  // Update request status (mark as reimbursed or rejected)
  const updateRequestStatus = useCallback(async (requestId, newStatus, comments = '') => {
    try {
      // Find the request to determine if it's student or faculty
      const request = allRequests.find(r => r.id === requestId || r.applicationId === requestId || r._id === requestId)

      if (!request) {
        throw new Error('Request not found')
      }

      // Determine which API to call based on applicant type
      const isStudent = request.formType === 'student' || request.applicantType === 'Student'
      const apiCall = isStudent ? studentFormsAPI : facultyFormsAPI
      const formId = request._id || request.id

      // Call the API to update the status with appropriate field
      const updateData = {
        status: newStatus,
        accountsComments: comments
      }

      // If rejecting, also set rejectionRemarks for workflow visibility
      if (newStatus === 'Rejected') {
        updateData.accountsRemarks = comments
        updateData.rejectionRemarks = comments // Required for backend workflow tracking
      }

      await apiCall.updateById(formId, updateData)

      // Update local state
      setAllRequests(prev => prev.map(r => {
        if (r.id === requestId || r.applicationId === requestId || r._id === requestId) {
          return { ...r, status: newStatus, accountsRemarks: newStatus === 'Rejected' ? comments : r.accountsRemarks }
        }
        return r
      }))

      await fetchRequests()

      if (newStatus === 'Rejected') {
        toast.error(`Request rejected`)
      } else {
        toast.success(`Request marked as ${newStatus}`)
      }
    } catch (error) {
      toast.error(error?.error || error?.message || 'Failed to update request status')
      throw error
    }
  }, [allRequests, fetchRequests])

  // Server applies filters before pagination; never filter a bounded page again.
  const getFilteredRequests = useCallback(() => allRequests, [allRequests])

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
      case 'reimbursed':
        return <ReimbursedList />
      case 'profile':
        return <ProfileSettings />
      case 'change-password':
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => handleSetActiveTab('profile')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profile Settings
            </button>
            <ChangePassword />
          </div>
        )
      default:
        return <HomeDashboard />
    }
  }, [activeTab, handleSetActiveTab])

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
    fetchRequests,
    refreshRequests: fetchRequests,
    queuePage, setQueuePage, queuePagination, summary, analytics, requestError,
    ...persistentNotifications
  }), [
    userProfile, allRequests, departments, accountsStats, updateRequestStatus,
    getFilteredRequests, searchQuery, statusFilter, departmentFilter, typeFilter,
    dateFilter, loading, activeTab, isCollapsed, notifications,
    markNotificationAsRead, markAllNotificationsAsRead, fetchRequests, handleSetActiveTab,
    queuePage, queuePagination, summary, analytics, requestError, persistentNotifications
  ])

  return (
    <AccountsContext.Provider value={contextValue}>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-[#65CCB8]/10">
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
              activeTab === 'reimbursed' ? 'Reimbursed List' :
              activeTab === 'profile' ? 'Profile Settings' :
              activeTab === 'change-password' ? 'Change Password' :
                'Dashboard'
          } />

          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            {requestError && <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-red-800">
              {requestError} <button onClick={() => void fetchRequests()} className="ml-3 underline">Retry</button>
            </div>}
            <AnimatePresence mode="wait">
              <Motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderActiveTab()}
              </Motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </AccountsContext.Provider>
  )
}

export default AccountsLayout

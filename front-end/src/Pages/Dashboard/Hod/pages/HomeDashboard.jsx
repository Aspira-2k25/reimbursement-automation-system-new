import React, { useMemo, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText,
  TrendingUp,
  Building,
  Loader2,
  Search
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import StatCard from '../components/StatCard'
import RequestTable from '../components/RequestTable'
import { useHODContext } from './HODLayout'
import { calculateStats, getRequestsByStatus } from '../data/mockData'

const HomeDashboard = () => {
  const { 
    userProfile, 
    allRequests, 
    updateRequestStatus, 
    getFilteredRequests,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter
  } = useHODContext()
  const [rejectModal, setRejectModal] = useState({ show: false, request: null })
  const [rejectReason, setRejectReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Handler functions - declared first to avoid hoisting issues
  const handleViewRequest = useCallback((request) => {
    toast.info(`Viewing request ${request.id} for ${request.applicantName}`)
    // In a real app, this would navigate to a detailed view or open a modal
  }, [])

  const handleApproveRequest = useCallback(async (request) => {
    setIsLoading(true)
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateRequestStatus(request.id, 'Approved')
      toast.success(`Request ${request.id} approved for ${request.applicantName}`)
    } catch (error) {
      toast.error('Failed to approve request. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [updateRequestStatus])

  const handleRejectRequest = useCallback((request) => {
    setRejectModal({ show: true, request })
  }, [])

  const handleStatCardClick = useCallback((statType) => {
    // Filter based on stat card clicked
    switch (statType) {
      case 'Total Requests':
        setStatusFilter('All')
        setTypeFilter('All')
        setSearchQuery('')
        break
      case 'Pending Requests':
        setStatusFilter('Pending')
        setTypeFilter('All')
        setSearchQuery('')
        break
      case 'Approved Requests':
        setStatusFilter('Approved')
        setTypeFilter('All')
        setSearchQuery('')
        break
      case 'Rejected Requests':
        setStatusFilter('Rejected')
        setTypeFilter('All')
        setSearchQuery('')
        break
      default:
        break
    }
    toast.info(`Filtered to show ${statType.toLowerCase()}`)
  }, [setStatusFilter, setTypeFilter, setSearchQuery])

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const stats = calculateStats(allRequests)
    
    // Calculate dynamic trends based on actual data
    const processedRequests = stats.total - stats.pending
    const approvalRate = processedRequests > 0 ? Math.round((stats.approved / processedRequests) * 100) : 0
    const avgAmount = stats.approved > 0 ? Math.round(stats.approvedAmount / stats.approved) : 0
    
    return [
      {
        title: "Total Requests",
        value: stats.total.toString(),
        subtitle: `${approvalRate}% approval rate`,
        icon: FileText,
        color: 'blue',
        onClick: () => handleStatCardClick('Total Requests')
      },
      {
        title: "Pending Requests", 
        value: stats.pending.toString(),
        subtitle: "Awaiting approval",
        icon: Clock,
        color: 'orange',
        onClick: () => handleStatCardClick('Pending Requests')
      },
      {
        title: "Approved Requests",
        value: stats.approved.toString(), 
        subtitle: `₹${stats.approvedAmount.toLocaleString()} disbursed`,
        icon: CheckCircle,
        color: 'green',
        onClick: () => handleStatCardClick('Approved Requests')
      },
      {
        title: "Rejected Requests",
        value: stats.rejected.toString(),
        subtitle: "Need revision", 
        icon: XCircle,
        color: 'red',
        onClick: () => handleStatCardClick('Rejected Requests')
      }
    ]
  }, [allRequests, handleStatCardClick])

  // Get filtered and recent requests for the table
  const filteredRequests = useMemo(() => {
    return getFilteredRequests()
  }, [getFilteredRequests])

  const recentRequests = useMemo(() => {
    return filteredRequests
      .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))
      .slice(0, 10)
  }, [filteredRequests])

  const confirmReject = useCallback(async () => {
    if (rejectReason.trim()) {
      setIsLoading(true)
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        updateRequestStatus(rejectModal.request.id, 'Rejected')
        toast.error(`Request ${rejectModal.request.id} rejected: ${rejectReason}`)
        setRejectModal({ show: false, request: null })
        setRejectReason('')
      } catch (error) {
        toast.error('Failed to reject request. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
  }, [rejectReason, rejectModal.request, updateRequestStatus])

  const closeRejectModal = useCallback(() => {
    setRejectModal({ show: false, request: null })
    setRejectReason('')
  }, [])

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div 
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 sm:p-6 text-white shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">
              Welcome back, {userProfile?.fullName || 'Dr. Jagan Kumar'} 👋
            </h1>
            <p className="text-blue-100 mb-4 text-sm sm:text-base">
              Head of Department • {userProfile?.department || 'Civil Engineering'}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-blue-100">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span>Engineering College</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{allRequests.length} Total Requests</span>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <motion.div 
              className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Building className="w-10 h-10 sm:w-12 sm:h-12 text-white/80" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {dashboardStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Department Overview */}
      <motion.div 
        className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Department Overview</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {(() => {
            const stats = calculateStats(allRequests)
            const processedRequests = stats.total - stats.pending
            const approvalRate = processedRequests > 0 ? Math.round((stats.approved / processedRequests) * 100) : 0
            
            return [
              { 
                value: allRequests.filter(r => r.applicantType === 'Faculty').length,
                label: 'Faculty Requests',
                color: 'blue'
              },
              { 
                value: allRequests.filter(r => r.applicantType === 'Student').length,
                label: 'Student Requests',
                color: 'green'
              },
              { 
                value: `₹${stats.approvedAmount.toLocaleString()}`,
                label: 'Total Disbursed',
                color: 'purple'
              },
              { 
                value: `${approvalRate}%`,
                label: 'Approval Rate',
                color: 'orange'
              }
            ]
          })().map((item, index) => (
            <motion.div 
              key={index}
              className={`text-center p-3 sm:p-4 bg-${item.color}-50 rounded-lg`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className={`text-lg sm:text-2xl font-bold text-${item.color}-600`}>
                {item.value}
            </div>
              <div className="text-xs sm:text-sm text-gray-600">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Reimbursement Requests</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredRequests.length} of {allRequests.length} requests
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-full sm:w-64"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Under HOD">Under HOD</option>
                <option value="Under Principal">Under Principal</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="All">All Types</option>
                <option value="Faculty">Faculty</option>
                <option value="Student">Student</option>
                <option value="HOD">HOD</option>
              </select>
            </div>
          </div>
        </div>

        <RequestTable
          requests={recentRequests}
          title=""
          onView={handleViewRequest}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
          showActions={true}
          isLoading={isLoading}
        />
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
      {rejectModal.show && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeRejectModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className="bg-white rounded-lg p-6 w-full max-w-md mx-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Request {rejectModal.request?.id}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting {rejectModal.request?.applicantName}'s request:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              rows="3"
              placeholder="Enter rejection reason..."
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={closeRejectModal}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim() || isLoading}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
            </motion.div>
          </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}

export default HomeDashboard

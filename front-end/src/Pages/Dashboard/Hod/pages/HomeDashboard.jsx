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
  Search,
  X
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
  const [viewModal, setViewModal] = useState({ show: false, request: null })
  const [rejectReason, setRejectReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [requestDetails, setRequestDetails] = useState(null)

  // Handler functions - declared first to avoid hoisting issues
  const handleViewRequest = useCallback(async (request) => {
    setViewModal({ show: true, request })
    setViewLoading(true)
    
    try {
      // Fetch full request details from API
      const { studentFormsAPI } = await import('../../../../services/api')
      const formId = request._id || request.applicationId || request.id
      const data = await studentFormsAPI.getById(formId)
      setRequestDetails(data?.form || data)
    } catch (error) {
      console.error('Error fetching request details:', error)
      toast.error('Failed to load request details')
      setRequestDetails(request) // Fallback to basic request data
    } finally {
      setViewLoading(false)
    }
  }, [])
  
  const closeViewModal = useCallback(() => {
    setViewModal({ show: false, request: null })
    setRequestDetails(null)
  }, [])

  const handleApproveRequest = useCallback(async (request) => {
    setIsLoading(true)
    try {
      const success = await updateRequestStatus(request.id, 'Under Principal')
      if (success) {
        toast.success(`Request ${request.id} approved and sent to Principal for ${request.applicantName}`)
      }
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
        const success = await updateRequestStatus(rejectModal.request.id, 'Rejected', rejectReason)
        if (success) {
          toast.error(`Request ${rejectModal.request.id} rejected: ${rejectReason}`)
          setRejectModal({ show: false, request: null })
          setRejectReason('')
        }
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
                <option value="Pending">Pending / Under HOD</option>
                <option value="Under Principal">Under Principal</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
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

      {/* View Modal */}
      <AnimatePresence>
        {viewModal.show && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center z-[100] p-4"
            onClick={closeViewModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }}
          >
            <motion.div 
              className="bg-white rounded-lg p-6 w-full max-w-3xl mx-auto shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Request Details
                </h3>
                <button
                  onClick={closeViewModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {viewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Request ID</label>
                      <p className="text-sm text-gray-900 mt-1">{requestDetails?.applicationId || viewModal.request?.id || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p className="text-sm text-gray-900 mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          requestDetails?.status === 'Approved' || viewModal.request?.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          requestDetails?.status === 'Rejected' || viewModal.request?.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          requestDetails?.status === 'Under Principal' || viewModal.request?.status === 'Under Principal' ? 'bg-blue-100 text-blue-800' :
                          requestDetails?.status === 'Under HOD' || viewModal.request?.status === 'Under HOD' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {requestDetails?.status || viewModal.request?.status || 'N/A'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Applicant Name</label>
                      <p className="text-sm text-gray-900 mt-1">{requestDetails?.name || viewModal.request?.applicantName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Student ID</label>
                      <p className="text-sm text-gray-900 mt-1">{requestDetails?.studentId || viewModal.request?.applicantId || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Category</label>
                      <p className="text-sm text-gray-900 mt-1">{requestDetails?.reimbursementType || requestDetails?.category || viewModal.request?.category || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Amount</label>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {requestDetails?.amount ? `₹${requestDetails.amount.toLocaleString()}` : viewModal.request?.amount || '₹0'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm text-gray-900 mt-1">{requestDetails?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Academic Year</label>
                      <p className="text-sm text-gray-900 mt-1">{requestDetails?.academicYear || viewModal.request?.year || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Division</label>
                      <p className="text-sm text-gray-900 mt-1">{requestDetails?.division || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Submitted Date</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {requestDetails?.createdAt 
                          ? new Date(requestDetails.createdAt).toLocaleDateString()
                          : viewModal.request?.submittedDate || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Updated</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {requestDetails?.updatedAt 
                          ? new Date(requestDetails.updatedAt).toLocaleDateString()
                          : viewModal.request?.lastUpdated || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Remarks/Description */}
                  {(requestDetails?.remarks || viewModal.request?.description) && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Remarks / Description</label>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg">
                        {requestDetails?.remarks || viewModal.request?.description || 'N/A'}
                      </p>
                    </div>
                  )}

                  {/* Documents */}
                  {requestDetails?.documents && requestDetails.documents.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Documents</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {requestDetails.documents.map((doc, index) => (
                          <a
                            key={index}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-blue-600 hover:underline">
                              Document {index + 1}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Close Button */}
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={closeViewModal}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
      {rejectModal.show && (
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={closeRejectModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <motion.div 
              className="bg-white rounded-lg p-6 w-full max-w-md mx-auto shadow-2xl relative z-[101]"
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

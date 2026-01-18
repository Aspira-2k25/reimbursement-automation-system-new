import React, { useMemo, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  Building2,
  Loader2,
  Search,
  IndianRupee,
  Eye,
  Download
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import StatCard from '../components/StatCard'
import { usePrincipalContext } from './PrincipalLayout'

const HomeDashboard = () => {
  const {
    userProfile,
    allRequests,
    departments,
    collegeStats,
    updateRequestStatus,
    getFilteredRequests,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    departmentFilter,
    setDepartmentFilter,
    typeFilter,
    setTypeFilter
  } = usePrincipalContext()

  const [rejectModal, setRejectModal] = useState({ show: false, request: null })
  const [rejectReason, setRejectReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Handler functions
  const handleViewRequest = useCallback((request) => {
    toast.info(`Viewing request ${request.id} for ${request.applicantName}`)
  }, [])

  const handleApproveRequest = useCallback(async (request) => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateRequestStatus(request.id, 'Approved', 'Approved by Principal')
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
    switch (statType) {
      case 'Total Requests':
        setStatusFilter('All')
        setDepartmentFilter('All')
        setTypeFilter('All')
        setSearchQuery('')
        break
      case 'Pending Requests':
        setStatusFilter('Under Principal')
        setDepartmentFilter('All')
        setTypeFilter('All')
        setSearchQuery('')
        break
      case 'Approved Requests':
        setStatusFilter('Approved')
        setDepartmentFilter('All')
        setTypeFilter('All')
        setSearchQuery('')
        break
      case 'Rejected Requests':
        setStatusFilter('Rejected')
        setDepartmentFilter('All')
        setTypeFilter('All')
        setSearchQuery('')
        break
      default:
        break
    }
    toast.info(`Filtered to show ${statType.toLowerCase()}`)
  }, [setStatusFilter, setDepartmentFilter, setTypeFilter, setSearchQuery])

  // Get filtered requests
  const filteredRequests = useMemo(() => {
    return getFilteredRequests()
  }, [getFilteredRequests])

  const handleExportToCSV = useCallback(() => {
    const headers = ['ID', 'Applicant', 'Department', 'Type', 'Category', 'Amount', 'Status', 'Submitted Date']
    const csvContent = [
      headers.join(','),
      ...filteredRequests.map(request => [
        request.id,
        request.applicantName,
        request.department,
        request.applicantType,
        request.category,
        request.amountFormatted || `₹${request.amount?.toLocaleString() || 0}`,
        request.status,
        request.submittedDate
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `principal-requests-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Requests exported to CSV successfully!')
  }, [filteredRequests])

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const rejectedRequests = allRequests.filter(r => r.status === 'Rejected')

    return [
      {
        title: "Total Requests",
        value: collegeStats.total.toString(),
        subtitle: `Across ${departments.length} departments`,
        icon: FileText,
        color: 'green',
        onClick: () => handleStatCardClick('Total Requests')
      },
      {
        title: "Pending Requests",
        value: collegeStats.pending.toString(),
        subtitle: "Awaiting approval",
        icon: Clock,
        color: 'green',
        onClick: () => handleStatCardClick('Pending Requests')
      },
      {
        title: "Approved Requests",
        value: collegeStats.approved.toString(),
        subtitle: `₹${collegeStats.approvedAmount.toLocaleString()} disbursed`,
        icon: CheckCircle,
        color: 'green',
        onClick: () => handleStatCardClick('Approved Requests')
      },
      {
        title: "Rejected Requests",
        value: rejectedRequests.length.toString(),
        subtitle: "Declined requests",
        icon: XCircle,
        color: 'green',
        onClick: () => handleStatCardClick('Rejected Requests')
      }
    ]
  }, [collegeStats, departments.length, allRequests, handleStatCardClick])

  const recentRequests = useMemo(() => {
    return filteredRequests
      .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))
      .slice(0, 15)
  }, [filteredRequests])


  const confirmReject = useCallback(async () => {
    if (rejectReason.trim()) {
      setIsLoading(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        updateRequestStatus(rejectModal.request.id, 'Rejected', rejectReason)
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
        className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-4 sm:p-6 text-white shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">
              Welcome back, {userProfile?.fullName || 'Dr. Rajesh Kumar'} 👋
            </h1>
            <p className="text-green-100 mb-4 text-sm sm:text-base">
              Principal • {userProfile?.college || 'Engineering College'}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-green-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>{departments.length} Departments</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{collegeStats.total} Total Requests</span>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                <span>{collegeStats.approvedAmount.toLocaleString()} Disbursed</span>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <motion.div
              className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-white/80" />
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

      {/* College Overview */}
      <motion.div
        className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">College Overview</h3>
          <TrendingUp className="w-5 h-5 text-green-600" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              value: departments.length,
              label: 'Departments',
              color: 'blue'
            },
            {
              value: `${collegeStats.approvalRate}%`,
              label: 'Approval Rate',
              color: 'green'
            },
            {
              value: `₹${collegeStats.approvedAmount.toLocaleString()}`,
              label: 'Total Disbursed',
              color: 'purple'
            },
            {
              value: `${collegeStats.budgetUtilization}%`,
              label: 'Budget Utilization',
              color: 'orange'
            }
          ].map((item, index) => (
            <motion.div
              key={index}
              className={`text-center p-3 sm:p-4 rounded-lg ${item.color === 'teal' ? 'bg-teal-50' :
                item.color === 'green' ? 'bg-green-50' :
                  item.color === 'purple' ? 'bg-purple-50' :
                    item.color === 'orange' ? 'bg-orange-50' :
                      'bg-gray-50'
                }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className={`text-lg sm:text-2xl font-bold ${item.color === 'teal' ? 'text-teal-600' :
                item.color === 'green' ? 'text-green-600' :
                  item.color === 'purple' ? 'text-purple-600' :
                    item.color === 'orange' ? 'text-orange-600' :
                      'text-gray-600'
                }`}>
                {item.value}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Advanced Request Table */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">College-Wide Requests</h3>
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
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm w-full sm:w-64"
              />
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="All">All Status</option>
                <option value="Under Principal">Under Principal</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="All">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="All">All Types</option>
                <option value="Faculty">Faculty</option>
                <option value="Student">Student</option>
              </select>
            </div>
          </div>
        </div>

        {/* Request Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Request ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Applicant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Submitted</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((request, index) => (
                <motion.tr
                  key={request.id}
                  className="hover:bg-slate-50/60"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm text-slate-900">{request.id}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-slate-900">{request.applicantName}</div>
                      <div className="text-sm text-slate-500">{request.department}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-700">{request.applicantType}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-700">{request.category}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{request.amountFormatted || (String(request.amount).includes('₹') ? request.amount : `₹${request.amount?.toLocaleString() || 0}`)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          request.status === 'Under Principal' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-slate-800'
                      }`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-700">{request.submittedDate}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewRequest(request)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {request.status === 'Under Principal' && (
                        <>
                          <button
                            onClick={() => handleApproveRequest(request)}
                            disabled={isLoading}
                            className="p-1 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request)}
                            className="p-1 text-red-600 hover:text-red-700 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
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

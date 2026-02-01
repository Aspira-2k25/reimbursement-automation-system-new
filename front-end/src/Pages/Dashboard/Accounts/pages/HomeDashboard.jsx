import React, { useMemo, useCallback, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Wallet,
  Clock,
  CheckCircle,
  FileText,
  TrendingUp,
  Loader2,
  Search,
  IndianRupee,
  Eye,
  Edit,
  Download,
  Printer,
  Check,
  X,
  Calendar,
  Filter,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import StatCard from '../components/StatCard'
import PrintableForm from '../components/PrintableForm'
import { useAccountsContext } from './AccountsLayout'

const HomeDashboard = () => {
  const navigate = useNavigate()
  const {
    userProfile,
    allRequests,
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
    loading
  } = useAccountsContext()

  const [printModal, setPrintModal] = useState({ show: false, request: null })
  const [rejectModal, setRejectModal] = useState({ show: false, request: null })
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRequests, setSelectedRequests] = useState(new Set())
  const printRef = useRef(null)

  // Handler functions
  const handleViewRequest = useCallback((request) => {
    // Open form in view mode - use _id for API fetch
    const formId = request._id || request.id
    if (request.applicantType === 'Student') {
      navigate(`/student-form/view/${formId}`)
    } else {
      navigate(`/nptel-form/view/${formId}`)
    }
  }, [navigate])

  const handleEditRequest = useCallback((request) => {
    // Open form in edit mode for bank details verification
    const formId = request._id || request.id
    if (request.applicantType === 'Student') {
      navigate(`/student-form/edit/${formId}`)
    } else {
      navigate(`/nptel-form/edit/${formId}`)
    }
  }, [navigate])

  const handlePrintRequest = useCallback((request) => {
    setPrintModal({ show: true, request })
  }, [])

  const handleRejectRequest = useCallback((request) => {
    setRejectModal({ show: true, request })
    setRejectRemarks('')
  }, [])

  const closeRejectModal = useCallback(() => {
    setRejectModal({ show: false, request: null })
    setRejectRemarks('')
  }, [])

  const confirmReject = useCallback(async () => {
    if (!rejectRemarks.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    if (!rejectModal.request) return

    setIsLoading(true)
    try {
      await updateRequestStatus(rejectModal.request._id, 'Rejected', rejectRemarks)
      toast.success(`Request ${rejectModal.request.applicationId || rejectModal.request.id} rejected`)
      closeRejectModal()
    } catch {
      toast.error('Failed to reject request')
    } finally {
      setIsLoading(false)
    }
  }, [rejectRemarks, rejectModal.request, updateRequestStatus, closeRejectModal])

  const handleMarkReimbursed = useCallback(async (request) => {
    if (request.status === 'Reimbursed') {
      toast.info('This request has already been reimbursed')
      return
    }

    setIsLoading(true)
    try {
      await updateRequestStatus(request._id, 'Reimbursed', 'Marked as reimbursed by Accounts')
    } finally {
      setIsLoading(false)
    }
  }, [updateRequestStatus])

  const handleBulkMarkReimbursed = useCallback(async () => {
    if (selectedRequests.size === 0) {
      toast.error('Please select at least one request')
      return
    }

    const selectedIds = Array.from(selectedRequests)
    const approvedRequests = allRequests.filter(
      r => selectedIds.includes(r.id) && r.status === 'Approved'
    )

    if (approvedRequests.length === 0) {
      toast.error('No approved requests selected for reimbursement')
      return
    }

    setIsLoading(true)
    try {
      for (const request of approvedRequests) {
        await updateRequestStatus(request._id, 'Reimbursed', 'Bulk reimbursement by Accounts')
      }
      setSelectedRequests(new Set())
      toast.success(`${approvedRequests.length} requests marked as reimbursed`)
    } catch {
      toast.error('Failed to process some requests')
    } finally {
      setIsLoading(false)
    }
  }, [selectedRequests, allRequests, updateRequestStatus])

  const handleSelectAll = useCallback((checked) => {
    const allIds = getFilteredRequests().map(r => r.id)
    if (checked) {
      setSelectedRequests(new Set(allIds))
    } else {
      setSelectedRequests(new Set())
    }
  }, [getFilteredRequests])

  const handleSelectRequest = useCallback((requestId, checked) => {
    setSelectedRequests(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(requestId)
      } else {
        newSet.delete(requestId)
      }
      return newSet
    })
  }, [])

  const handleStatCardClick = useCallback((statType) => {
    switch (statType) {
      case 'Total Requests':
        setStatusFilter('All')
        setDepartmentFilter('All')
        setTypeFilter('All')
        setSearchQuery('')
        break
      case 'Pending Reimbursement':
        setStatusFilter('Approved')
        setDepartmentFilter('All')
        setTypeFilter('All')
        setSearchQuery('')
        break
      case 'Reimbursed':
        setStatusFilter('Reimbursed')
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
    const headers = ['Application ID', 'Applicant', 'Type', 'Department', 'Amount', 'Status', 'Bank Name', 'Account No', 'IFSC', 'Date']
    const csvContent = [
      headers.join(','),
      ...filteredRequests.map(request => [
        request.applicationId || request.id,
        `"${request.applicantName}"`,
        request.applicantType,
        request.department,
        request.amountNum || 0,
        request.status,
        `"${request.bankName || 'N/A'}"`,
        `"${request.accountNumber || 'N/A'}"`,
        `"${request.ifscCode || 'N/A'}"`,
        request.submittedDate
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accounts-reimbursements-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Exported to CSV successfully!')
  }, [filteredRequests])

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    return [
      {
        title: "Total Requests",
        value: accountsStats.total.toString(),
        subtitle: `₹${accountsStats.totalAmount.toLocaleString()} total value`,
        icon: FileText,
            color: 'teal',
        onClick: () => handleStatCardClick('Total Requests')
      },
      {
        title: "Pending Reimbursement",
        value: accountsStats.pendingDisbursement.toString(),
        subtitle: `₹${accountsStats.pendingAmount.toLocaleString()} pending`,
        icon: Clock,
            color: 'teal',
        onClick: () => handleStatCardClick('Pending Reimbursement')
      },
      {
        title: "Reimbursed",
        value: accountsStats.reimbursed.toString(),
        subtitle: `₹${accountsStats.reimbursedAmount.toLocaleString()} completed`,
        icon: CheckCircle,
            color: 'teal',
        onClick: () => handleStatCardClick('Reimbursed')
      },
      {
        title: "Reimbursement Rate",
        value: `${accountsStats.disbursementRate}%`,
        subtitle: "Completion rate",
        icon: TrendingUp,
            color: 'teal',
        onClick: () => {}
      }
    ]
  }, [accountsStats, handleStatCardClick])

  const closePrintModal = useCallback(() => {
    setPrintModal({ show: false, request: null })
  }, [])

  // Get status badge color
  const getStatusBadge = (status) => {
    const statusConfig = {
      'Approved': { bg: 'bg-[#65CCB8]/30', text: 'text-[#3B945E]', border: 'border-[#65CCB8]/50' },
      'Reimbursed': { bg: 'bg-[#57BA98]/30', text: 'text-[#3B945E]', border: 'border-[#57BA98]/50' },
      'Rejected': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
    }
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        className="bg-gradient-to-r from-[#57BA98] to-[#3B945E] rounded-xl p-4 sm:p-6 text-white shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-white">
              Welcome, {userProfile?.fullName || 'Accounts Officer'} 👋
            </h1>
            <p className="text-white/80 mb-4 text-sm sm:text-base">
              {userProfile?.designation || 'Accounts Officer'} • Reimbursement Dashboard
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-white/90">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                <span>{accountsStats.pendingDisbursement} Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{accountsStats.reimbursed} Reimbursed</span>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                <span>₹{accountsStats.reimbursedAmount.toLocaleString()} Completed</span>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <motion.div
              className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Wallet className="w-10 h-10 sm:w-12 sm:h-12 text-white/80" />
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

      {/* Request Table with Filters */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
              <h3 className="text-lg font-semibold text-gray-900">Reimbursement Queue</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredRequests.length} of {allRequests.length} requests
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Bulk Actions */}
            {selectedRequests.size > 0 && (
              <button
                onClick={handleBulkMarkReimbursed}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#57BA98] text-white rounded-lg hover:bg-[#3B945E] transition-colors text-sm disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Mark {selectedRequests.size} as Reimbursed
              </button>
            )}

            {/* Export Button */}
            <button
              onClick={handleExportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-[#57BA98] text-white rounded-lg hover:bg-[#3B945E] transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, name, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57BA98] focus:border-[#57BA98] text-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57BA98] text-sm"
          >
            <option value="All">All Status</option>
            <option value="Approved">Pending Reimbursement</option>
            <option value="Reimbursed">Reimbursed</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57BA98] text-sm"
          >
            <option value="All">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.name}>{dept.name}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57BA98] text-sm"
          >
            <option value="All">All Types</option>
            <option value="Student">Student</option>
            <option value="Faculty">Faculty</option>
            <option value="Coordinator">Coordinator</option>
            <option value="HOD">HOD</option>
          </select>

          {/* Date From */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateFilter.from}
              onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
              max={dateFilter.to || new Date().toISOString().split('T')[0]}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57BA98] text-sm"
              placeholder="From"
            />
          </div>

          {/* Date To */}
          <input
            type="date"
            value={dateFilter.to}
            onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
            min={dateFilter.from || ''}
            max={new Date().toISOString().split('T')[0]}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57BA98] text-sm"
            placeholder="To"
          />

          {/* Clear Filters */}
          {(searchQuery || statusFilter !== 'All' || departmentFilter !== 'All' || typeFilter !== 'All' || dateFilter.from || dateFilter.to) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('All')
                setDepartmentFilter('All')
                setTypeFilter('All')
                setDateFilter({ from: '', to: '' })
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Request Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRequests.size === filteredRequests.length && filteredRequests.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-[#3B945E] focus:ring-[#57BA98]"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Request ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Applicant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#57BA98]" />
                    <p className="mt-2 text-sm text-gray-500">Loading requests...</p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No requests found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request, index) => (
                  <motion.tr
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className={`hover:bg-slate-50 transition-colors ${
                      request.status === 'Reimbursed' ? 'bg-[#65CCB8]/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRequests.has(request.id)}
                        onChange={(e) => handleSelectRequest(request.id, e.target.checked)}
                        className="rounded border-gray-300 text-[#3B945E] focus:ring-[#57BA98]"
                        disabled={request.status === 'Reimbursed'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-[#3B945E]">{request.applicationId || request.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.applicantName}</div>
                        <div className="text-xs text-gray-500">{request.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        request.applicantType === 'Student'
                          ? 'bg-blue-100 text-blue-700'
                          : request.applicantType === 'Faculty'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {request.applicantType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{request.department}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">{request.amount}</span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(request.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{request.submittedDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewRequest(request)}
                          className="p-1.5 text-gray-500 hover:text-[#3B945E] hover:bg-[#65CCB8]/20 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditRequest(request)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Form"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintRequest(request)}
                          className="p-1.5 text-gray-500 hover:text-[#3B945E] hover:bg-[#65CCB8]/20 rounded-lg transition-colors"
                          title="Print Form"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {request.status === 'Approved' && (
                          <>
                            <button
                              onClick={() => handleMarkReimbursed(request)}
                              disabled={isLoading}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Mark as Reimbursed"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request)}
                              disabled={isLoading}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject with Remarks"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {request.status === 'Reimbursed' && (
                          <span className="p-1.5 text-green-600" title="Reimbursed">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                        {request.status === 'Rejected' && (
                          <span className="p-1.5 text-red-600" title="Rejected">
                            <XCircle className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Modal */}
      <AnimatePresence>
        {printModal.show && printModal.request && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePrintModal}
          >
            <motion.div
              className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-lg font-semibold text-gray-900">Print Reimbursement Form</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      window.print()
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#57BA98] text-white rounded-lg hover:bg-[#3B945E] transition-colors text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={closePrintModal}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div ref={printRef} className="p-6">
                <PrintableForm request={printModal.request} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal.show && rejectModal.request && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeRejectModal}
          >
            <motion.div
              className="bg-white rounded-xl max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Reject Request</h3>
                    <p className="text-sm text-gray-500">
                      {rejectModal.request.applicationId || rejectModal.request.id}
                    </p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Applicant:</strong> {rejectModal.request.applicantName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Amount:</strong> {rejectModal.request.amount}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectRemarks}
                    onChange={(e) => setRejectRemarks(e.target.value)}
                    placeholder="Please provide detailed reason for rejection (e.g., incorrect bank details, missing documents, etc.)"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This reason will be visible to the applicant.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeRejectModal}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmReject}
                    disabled={isLoading || !rejectRemarks.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Reject Request
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default HomeDashboard

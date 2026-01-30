import React, { useMemo, useCallback, useState, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
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
  Download,
  Printer,
  Check,
  X,
  Calendar,
  Filter
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
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRequests, setSelectedRequests] = useState(new Set())
  const printRef = useRef(null)

  // Handler functions
  const handleViewRequest = useCallback((request) => {
    // Open form in view mode
    if (request.applicantType === 'Student') {
      navigate(`/student-form/view/${request.id}`)
    } else {
      navigate(`/nptel-form/view/${request.id}`)
    }
  }, [navigate])

  const handlePrintRequest = useCallback((request) => {
    setPrintModal({ show: true, request })
  }, [])

  const handleMarkDisbursed = useCallback(async (request) => {
    if (request.status === 'Disbursed') {
      toast.info('This request has already been disbursed')
      return
    }
    
    setIsLoading(true)
    try {
      await updateRequestStatus(request.id, 'Disbursed', 'Marked as disbursed by Accounts')
    } finally {
      setIsLoading(false)
    }
  }, [updateRequestStatus])

  const handleBulkMarkDisbursed = useCallback(async () => {
    if (selectedRequests.size === 0) {
      toast.error('Please select at least one request')
      return
    }

    const selectedIds = Array.from(selectedRequests)
    const approvedRequests = allRequests.filter(
      r => selectedIds.includes(r.id) && r.status === 'Approved'
    )

    if (approvedRequests.length === 0) {
      toast.error('No approved requests selected for disbursement')
      return
    }

    setIsLoading(true)
    try {
      for (const request of approvedRequests) {
        await updateRequestStatus(request.id, 'Disbursed', 'Bulk disbursement by Accounts')
      }
      setSelectedRequests(new Set())
      toast.success(`${approvedRequests.length} requests marked as disbursed`)
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
      case 'Pending Disbursement':
        setStatusFilter('Approved')
        setDepartmentFilter('All')
        setTypeFilter('All')
        setSearchQuery('')
        break
      case 'Disbursed':
        setStatusFilter('Disbursed')
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
    const headers = ['ID', 'Applicant', 'Type', 'Department', 'Amount', 'Status', 'Bank Name', 'Account No', 'IFSC', 'Date']
    const csvContent = [
      headers.join(','),
      ...filteredRequests.map(request => [
        request.id,
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
    a.download = `accounts-disbursements-${new Date().toISOString().split('T')[0]}.csv`
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
        color: 'amber',
        onClick: () => handleStatCardClick('Total Requests')
      },
      {
        title: "Pending Disbursement",
        value: accountsStats.pendingDisbursement.toString(),
        subtitle: `₹${accountsStats.pendingAmount.toLocaleString()} pending`,
        icon: Clock,
        color: 'amber',
        onClick: () => handleStatCardClick('Pending Disbursement')
      },
      {
        title: "Disbursed",
        value: accountsStats.disbursed.toString(),
        subtitle: `₹${accountsStats.disbursedAmount.toLocaleString()} completed`,
        icon: CheckCircle,
        color: 'amber',
        onClick: () => handleStatCardClick('Disbursed')
      },
      {
        title: "Disbursement Rate",
        value: `${accountsStats.disbursementRate}%`,
        subtitle: "Completion rate",
        icon: TrendingUp,
        color: 'amber',
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
      'Approved': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
      'Disbursed': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' }
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
        className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-4 sm:p-6 text-white shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">
              Welcome, {userProfile?.fullName || 'Accounts Officer'} 👋
            </h1>
            <p className="text-amber-100 mb-4 text-sm sm:text-base">
              {userProfile?.designation || 'Accounts Officer'} • Disbursement Dashboard
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-amber-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                <span>{accountsStats.pendingDisbursement} Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{accountsStats.disbursed} Disbursed</span>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                <span>₹{accountsStats.disbursedAmount.toLocaleString()} Completed</span>
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
            <h3 className="text-lg font-semibold text-gray-900">Disbursement Queue</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredRequests.length} of {allRequests.length} requests
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Bulk Actions */}
            {selectedRequests.size > 0 && (
              <button
                onClick={handleBulkMarkDisbursed}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Mark {selectedRequests.size} as Disbursed
              </button>
            )}

            {/* Export Button */}
            <button
              onClick={handleExportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
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
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          >
            <option value="All">All Status</option>
            <option value="Approved">Pending Disbursement</option>
            <option value="Disbursed">Disbursed</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
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
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
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
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              placeholder="From"
            />
          </div>

          {/* Date To */}
          <input
            type="date"
            value={dateFilter.to}
            onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
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
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
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
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600" />
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
                      request.status === 'Disbursed' ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRequests.has(request.id)}
                        onChange={(e) => handleSelectRequest(request.id, e.target.checked)}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        disabled={request.status === 'Disbursed'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-amber-600">{request.id || request.applicationId}</span>
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
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintRequest(request)}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Print Form"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {request.status === 'Approved' && (
                          <button
                            onClick={() => handleMarkDisbursed(request)}
                            disabled={isLoading}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Mark as Disbursed"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {request.status === 'Disbursed' && (
                          <span className="p-1.5 text-green-600" title="Disbursed">
                            <CheckCircle className="w-4 h-4" />
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
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
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
    </div>
  )
}

export default HomeDashboard

import React, { useMemo, useCallback, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle,
  FileText,
  Loader2,
  Search,
  IndianRupee,
  Eye,
  Download,
  Printer,
  X,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import StatCard from '../components/StatCard'
import PrintableForm from '../components/PrintableForm'
import { useAccountsContext } from './AccountsLayout'

const ReimbursedList = () => {
  const navigate = useNavigate()
  const {
    allRequests,
    departments,
    loading
  } = useAccountsContext()

  const [printModal, setPrintModal] = useState({ show: false, request: null })
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })
  const printRef = useRef(null)

  // Get only reimbursed requests
  const reimbursedRequests = useMemo(() => {
    return allRequests.filter(r => r.status === 'Reimbursed')
  }, [allRequests])

  // Filter reimbursed requests
  const filteredRequests = useMemo(() => {
    return reimbursedRequests.filter(request => {
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
  }, [reimbursedRequests, searchQuery, departmentFilter, typeFilter, dateFilter])

  // Calculate stats for reimbursed only
  const reimbursedStats = useMemo(() => {
    const total = reimbursedRequests.length
    const totalAmount = reimbursedRequests.reduce((sum, r) => sum + (r.amountNum || 0), 0)
    const studentCount = reimbursedRequests.filter(r => r.applicantType === 'Student').length
    const facultyCount = reimbursedRequests.filter(r => r.applicantType === 'Faculty').length
    const avgAmount = total > 0 ? Math.round(totalAmount / total) : 0

    return {
      total,
      totalAmount,
      studentCount,
      facultyCount,
      avgAmount
    }
  }, [reimbursedRequests])

  const handleViewRequest = useCallback((request) => {
    const formId = request._id || request.id
    if (request.applicantType === 'Student') {
      navigate(`/student-form/view/${formId}`)
    } else {
      navigate(`/nptel-form/view/${formId}`)
    }
  }, [navigate])

  const handlePrintRequest = useCallback((request) => {
    setPrintModal({ show: true, request })
  }, [])

  const handleExportToCSV = useCallback(() => {
    const headers = ['Application ID', 'Applicant', 'Type', 'Course Name', 'Marks', 'Department', 'Amount', 'Status', 'Bank Name', 'Account No', 'IFSC', 'Date']
    const csvContent = [
      headers.join(','),
      ...filteredRequests.map(request => [
        request.applicationId || request.id,
        `"${request.applicantName}"`,
        request.applicantType,
        `"${request.courseName || 'N/A'}"`,
        request.marks !== undefined && request.marks !== 'N/A' ? `${request.marks}%` : 'N/A',
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
    a.download = `reimbursed-requests-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Exported to CSV successfully!')
  }, [filteredRequests])

  const closePrintModal = useCallback(() => {
    setPrintModal({ show: false, request: null })
  }, [])

  // Stats cards
  const dashboardStats = useMemo(() => [
    {
      title: "Total Reimbursed",
      value: reimbursedStats.total.toString(),
      subtitle: "Completed requests",
      icon: CheckCircle,
      color: 'teal'
    },
    {
      title: "Total Amount",
      value: `₹${reimbursedStats.totalAmount.toLocaleString()}`,
      subtitle: "Successfully reimbursed",
      icon: IndianRupee,
      color: 'teal'
    },
    {
      title: "Student Requests",
      value: reimbursedStats.studentCount.toString(),
      subtitle: "Student reimbursements",
      icon: FileText,
      color: 'teal'
    },
    {
      title: "Faculty Requests",
      value: reimbursedStats.facultyCount.toString(),
      subtitle: "Faculty reimbursements",
      icon: TrendingUp,
      color: 'teal'
    }
  ], [reimbursedStats])

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        className="bg-gradient-to-r from-[#57BA98] to-[#3B945E] rounded-xl p-4 sm:p-6 text-white shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-white">
              Reimbursed Requests 
            </h1>
            <p className="text-white/80 mb-4 text-sm sm:text-base">
              Successfully completed reimbursements
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-white/90">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{reimbursedStats.total} Total Reimbursed</span>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                <span>₹{reimbursedStats.totalAmount.toLocaleString()} Total Value</span>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <motion.div
              className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white/80" />
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
            <h3 className="text-lg font-semibold text-gray-900">Reimbursed Requests</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredRequests.length} of {reimbursedRequests.length} reimbursed requests
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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
          {(searchQuery || departmentFilter !== 'All' || typeFilter !== 'All' || dateFilter.from || dateFilter.to) && (
            <button
              onClick={() => {
                setSearchQuery('')
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Request ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Applicant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Course Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Marks</th>
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
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#57BA98]" />
                    <p className="mt-2 text-sm text-gray-500">Loading requests...</p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No reimbursed requests found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request, index) => (
                  <motion.tr
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="hover:bg-slate-50 transition-colors bg-[#65CCB8]/10"
                  >
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
                    <td className="px-4 py-3 text-sm text-gray-600">{request.courseName || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{request.marks !== undefined && request.marks !== 'N/A' ? `${request.marks}%` : 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{request.department}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">{request.amount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#57BA98]/30 text-[#3B945E] border border-[#57BA98]/50">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Reimbursed
                      </span>
                    </td>
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
                          onClick={() => handlePrintRequest(request)}
                          className="p-1.5 text-gray-500 hover:text-[#3B945E] hover:bg-[#65CCB8]/20 rounded-lg transition-colors"
                          title="Print Form"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
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
    </div>
  )
}

export default ReimbursedList

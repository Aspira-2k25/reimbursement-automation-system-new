import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  Check,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  GraduationCap,
  FileText
} from 'lucide-react'
import StatusPill from './StatusPill'
import ActionButtons from './ActionButtons'

/**
 * RequestTable Component
 * Displays a table of reimbursement requests with sorting, pagination, and actions
 * @param {Array} requests - Array of request objects
 * @param {Function} onView - Callback for view action
 * @param {Function} onApprove - Callback for approve action
 * @param {Function} onReject - Callback for reject action
 * @param {boolean} showActions - Whether to show action buttons
 * @param {string} title - Table title
 * @param {boolean} isLoading - Loading state
 */
const RequestTable = ({
  requests = [],
  onView,
  onApprove,
  onReject,
  showActions = true,
  title = "All Requests",
  isLoading = false
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState({ key: 'submittedDate', direction: 'desc' })

  const itemsPerPage = 10

  // Use filtered requests from context if available, otherwise use local filtering
  const filteredRequests = useMemo(() => {
    return requests
  }, [requests])

  // Sorting logic
  const sortedRequests = useMemo(() => {
    const sorted = [...filteredRequests].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (sortConfig.key === 'amount') {
        const aAmount = parseFloat(aValue.replace(/[₹,]/g, ''))
        const bAmount = parseFloat(bValue.replace(/[₹,]/g, ''))
        return sortConfig.direction === 'asc' ? aAmount - bAmount : bAmount - aAmount
      }

      if (sortConfig.key === 'submittedDate') {
        const aDate = new Date(aValue)
        const bDate = new Date(bValue)
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate
      }

      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    })

    return sorted
  }, [filteredRequests, sortConfig])

  // Pagination logic
  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRequests = sortedRequests.slice(startIndex, startIndex + itemsPerPage)

  // Filter dropdowns removed - now handled by parent components

  /**
   * Handle column sorting
   */
  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  /**
   * Handle pagination page change
   */
  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  /**
   * Format date string for display
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  /**
   * Export table data to CSV format
   */
  const exportToCSV = () => {
    const headers = ['ID', 'Applicant', 'Type', 'Category', 'Amount', 'Status', 'Submitted Date']

    // Helper function to escape CSV fields (wrap in quotes if contains comma or quotes)
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }

    // Helper function to clean amount - remove currency symbol and format as plain number
    const cleanAmount = (amount) => {
      if (!amount) return '0'
      // Remove rupee symbol, commas, and any other non-numeric characters except decimal
      const cleaned = String(amount).replace(/[₹,\s]/g, '').replace(/[^\d.]/g, '')
      return cleaned || '0'
    }

    // Format date for export (DD-MM-YYYY)
    const formatExportDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}-${month}-${year}`
    }

    const csvContent = [
      headers.join(','),
      ...sortedRequests.map(request => [
        escapeCSV(request.id),
        escapeCSV(request.applicantName),
        escapeCSV(request.applicantType),
        escapeCSV(request.category),
        cleanAmount(request.amount),
        escapeCSV(request.status),
        formatExportDate(request.submittedDate)
      ].join(','))
    ].join('\n')

    // Add UTF-8 BOM for proper Excel encoding
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reimbursement-requests-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm">
      {/* Header with Search and Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {sortedRequests.length} of {requests.length} requests
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('id')}
              >
                Request ID
                {sortConfig.key === 'id' && (
                  <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('applicantName')}
              >
                Applicant
                {sortConfig.key === 'applicantName' && (
                  <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('category')}
              >
                Category
                {sortConfig.key === 'category' && (
                  <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('amount')}
              >
                Amount
                {sortConfig.key === 'amount' && (
                  <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('submittedDate')}
              >
                Submitted
                {sortConfig.key === 'submittedDate' && (
                  <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              {showActions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <AnimatePresence>
              {paginatedRequests.map((request, index) => (
                <motion.tr
                  key={request.id}
                  className="hover:bg-gray-50 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{request.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${request.applicantType === 'Student' ? 'bg-blue-600' : 'bg-green-600'
                        }`}>
                        {request.applicantType === 'Student' ? (
                          <GraduationCap className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.applicantName}</div>
                        <div className="text-sm text-gray-500">
                          {request.applicantType === 'Student' ? request.year : request.designation}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${request.applicantType === 'Student'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                      }`}>
                      {request.applicantType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{request.amount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusPill status={request.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {formatDate(request.submittedDate)}
                    </div>
                  </td>
                  {showActions && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ActionButtons
                        request={request}
                        onView={onView}
                        onApprove={onApprove}
                        onReject={onReject}
                        isLoading={isLoading}
                      />
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedRequests.length)} of {sortedRequests.length} results
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      <AnimatePresence>
        {paginatedRequests.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-gray-400 mb-4">
              <FileText className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-500">
              No reimbursement requests have been submitted yet
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RequestTable
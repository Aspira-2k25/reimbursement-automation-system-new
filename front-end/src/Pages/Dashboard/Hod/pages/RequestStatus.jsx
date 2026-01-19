import React, { useState, useEffect, useMemo } from 'react'
import { Clock, CheckCircle, XCircle, FileText, Search, Download, Loader2, Eye, Pencil, Trash2, X, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { facultyFormsAPI } from '../../../../services/api'
import { toast } from 'react-hot-toast'

/**
 * SummaryCard Component
 * Displays a summary statistic with icon, value and subtitle
 */
function SummaryCard({ title, value, sub, icon: Icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-slate-600 text-sm font-medium">{title}</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
          <div className="text-slate-500 text-xs mt-1">{sub}</div>
        </div>
        <div className={`h-12 w-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

/**
 * StatusBadge Component - matches Faculty design
 */
function StatusBadge({ status }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800'
      case 'Pending':
      case 'Under HOD':
        return 'bg-orange-100 text-orange-800'
      case 'Under Principal':
        return 'bg-blue-100 text-blue-800'
      case 'Rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
      {status}
    </span>
  )
}

/**
 * HOD RequestStatus Component
 * Displays HOD's own reimbursement request statistics and table - matching Faculty design
 */
const RequestStatus = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)

  // Fetch HOD's own forms on mount
  const fetchRequests = async () => {
    try {
      setLoading(true)
      const data = await facultyFormsAPI.listMine()

      // Map backend data to frontend model
      const forms = data?.forms || data || []
      const mapped = Array.isArray(forms) ? forms.map(f => ({
        id: f.applicationId || f._id,
        category: f.reimbursementType || 'NPTEL',
        status: f.status || 'Under HOD',
        amount: parseFloat(f.amount) || 0,
        submittedDate: f.createdAt || new Date().toISOString(),
        updatedDate: f.updatedAt || new Date().toISOString(),
        description: f.remarks || f.name || 'NPTEL Reimbursement',
        documents: f.documents || []
      })) : []

      setRequests(mapped)
      setError(null)
    } catch (err) {
      console.error('Failed to load requests:', err)
      setError('Failed to load your requests. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  // Calculate summary statistics from dynamic data
  const summary = useMemo(() => {
    const total = requests.length
    const approved = requests.filter(r =>
      r.status === 'Approved' || r.status === 'Under Principal'
    ).length
    const pending = requests.filter(r =>
      r.status === 'Pending' || r.status === 'Under HOD' || r.status === 'Under Coordinator'
    ).length
    const rejected = requests.filter(r => r.status === 'Rejected').length
    const totalAmount = requests
      .filter(r => r.status === 'Approved' || r.status === 'Under Principal')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

    return { total, approved, pending, rejected, totalAmount }
  }, [requests])

  // Filter requests based on search
  const filteredRequests = useMemo(() => {
    if (!search.trim()) return requests
    const searchLower = search.toLowerCase()
    return requests.filter(r =>
      r.id?.toLowerCase().includes(searchLower) ||
      r.category?.toLowerCase().includes(searchLower) ||
      r.status?.toLowerCase().includes(searchLower) ||
      r.description?.toLowerCase().includes(searchLower)
    )
  }, [requests, search])

  // Export function
  const handleExport = () => {
    if (requests.length === 0) {
      toast.error('No requests to export')
      return
    }

    const headers = ['Application ID', 'Category', 'Amount', 'Status', 'Submitted Date', 'Last Updated']
    const csvContent = [
      headers.join(','),
      ...requests.map(r => [
        r.id,
        r.category,
        r.amount,
        r.status,
        new Date(r.submittedDate).toLocaleDateString(),
        new Date(r.updatedDate).toLocaleDateString()
      ].join(','))
    ].join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-requests-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Requests exported successfully!')
  }

  // Handle delete
  const handleDelete = async (item) => {
    try {
      const token = localStorage.getItem('token')
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/forms/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast.success('Request deleted successfully')
        setDeleteItem(null)
        fetchRequests() // Refresh the list
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete request')
      }
    } catch (error) {
      console.error('Error deleting request:', error)
      toast.error('Failed to delete request. Please try again.')
    }
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-4" />
          <p className="text-gray-500">Loading your requests...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-red-800 mb-1">Error Loading Data</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Request Status</h1>
          <p className="text-gray-600 mt-1">Track your own reimbursement requests and their current status</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Applications"
          value={summary.total}
          sub="All time"
          icon={FileText}
          color="blue"
        />
        <SummaryCard
          title="Approved"
          value={summary.approved}
          sub={`₹${summary.totalAmount.toLocaleString()} approved`}
          icon={CheckCircle}
          color="green"
        />
        <SummaryCard
          title="Pending Review"
          value={summary.pending}
          sub="Under review"
          icon={Clock}
          color="orange"
        />
        <SummaryCard
          title="Rejected"
          value={summary.rejected}
          sub="Not approved"
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Requests Table - Faculty Style */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your Faculty Requests</h3>
          <p className="text-sm text-gray-500">Complete list of your reimbursement applications</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Application ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Submitted Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Last Updated</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRequests.length > 0 ? filteredRequests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.id}</td>
                  <td className="px-4 py-3 text-slate-700">{r.category}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">₹{r.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(r.submittedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(r.updatedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Download */}
                      <button
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors disabled:opacity-50"
                        onClick={() => {
                          const docUrl = r.documents?.[0]?.url
                          if (docUrl) window.open(docUrl, '_blank')
                        }}
                        disabled={!r.documents?.[0]?.url}
                        title={r.documents?.[0]?.url ? 'Download Document' : 'No Document'}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {/* View */}
                      <button
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                        onClick={() => navigate(`/nptel-form/view/${r.id}`)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {/* Edit */}
                      <button
                        className="p-1.5 rounded-lg hover:bg-green-50 text-slate-600 hover:text-green-600 transition-colors"
                        onClick={() => navigate(`/nptel-form/edit/${r.id}`)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {/* Delete */}
                      <button
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                        onClick={() => setDeleteItem(r)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <div className="text-lg font-medium text-gray-900 mb-1">No requests found</div>
                    <div className="text-sm text-gray-500">
                      {requests.length === 0
                        ? "You haven't submitted any reimbursement requests yet."
                        : "Try adjusting your search or check back later"}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/30 transition-opacity duration-200"
            onClick={() => setDeleteItem(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Confirmation</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this request? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setDeleteItem(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                onClick={() => handleDelete(deleteItem)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RequestStatus

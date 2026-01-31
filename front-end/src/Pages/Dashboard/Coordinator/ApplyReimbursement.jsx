"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { toast } from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../../context/AuthContext"
import { facultyFormsAPI } from "../../../services/api"
import { Atom, GraduationCap, Users, PlaneTakeoff, Clock, CheckCircle, XCircle, FileText, Loader2, Eye, Pencil, Trash2, Download, X, AlertCircle } from "lucide-react"
import ReminderBanner from "./components/ReminderBanner"

// Reimbursement categories for coordinators (same as faculty)
const reimbursementOptions = [
  {
    id: "nptel",
    title: "NPTEL Certification",
    description: "Reimbursement for NPTEL course completion certificates",
    icon: "SchoolOutlined"
  },
  {
    id: "fdp-program",
    title: "Faculty Development Programs",
    description: "Professional development and training programs",
    icon: "ScienceOutlined"
  },
  {
    id: "conference-workshop",
    title: "Conferences & Workshops",
    description: "Academic conferences and workshop participation",
    icon: "Groups2Outlined"
  },
  {
    id: "travel-alliance",
    title: "Travel Alliance",
    description: "Travel expenses for academic purposes",
    icon: "FlightTakeoffOutlined"
  },
]

// Icon mapping for consistent icon usage (same as Faculty)
const iconMap = {
  ScienceOutlined: (props) => <Atom {...props} className="text-white" />,
  SchoolOutlined: (props) => <GraduationCap {...props} className="text-white" />,
  Groups2Outlined: (props) => <Users {...props} className="text-white" />,
  FlightTakeoffOutlined: (props) => <PlaneTakeoff {...props} className="text-white" />,
}

// StatCard component matching Faculty Dashboard style exactly
function StatCard({ option, onApply }) {
  if (!option) {
    return (
      <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 shadow-sm">
        <div className="relative p-6 h-full flex flex-col">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 mb-4">
            <div className="h-6 w-6 rounded bg-slate-300"></div>
          </div>
          <div className="h-6 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 bg-slate-200 rounded mb-4 flex-1"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  const Icon = iconMap[option?.icon] || ((props) => <Atom {...props} className="text-white" />)
  const title = option?.title || "Reimbursement Option"
  const description = option?.description || "Apply for this reimbursement option"

  const handleApply = () => {
    if (onApply) {
      onApply(option)
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1" style={{ border: '1px solid var(--color-light-teal)' }}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, var(--color-light-teal)/20, var(--color-medium-teal)/20)' }}></div>

      <div className="relative p-4 sm:p-5 lg:p-6 h-full flex flex-col">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 items-center justify-center rounded-lg sm:rounded-xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300" style={{ background: 'linear-gradient(135deg, var(--color-medium-teal), var(--color-light-teal))' }}>
          <Icon size={20} className="sm:hidden text-white" />
          <Icon size={24} className="hidden sm:block lg:hidden text-white" />
          <Icon size={28} className="hidden lg:block text-white" />
        </div>

        <h3 className="font-semibold text-base sm:text-lg lg:text-xl mb-2" style={{ color: 'var(--color-dark-gray)' }}>{title}</h3>
        <p className="text-xs sm:text-sm lg:text-base flex-1 leading-relaxed" style={{ color: 'var(--color-dark-gray)' }}>{description}</p>

        <button
          onClick={handleApply}
          className="mt-4 sm:mt-6 w-full rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white font-medium text-sm sm:text-base shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
          style={{ background: 'linear-gradient(135deg, var(--color-medium-teal), var(--color-light-teal), var(--color-dark-green))' }}
        >
          Apply Now
        </button>
      </div>
    </div>
  )
}

// InfoTipBox component matching Faculty style
function InfoTipBox() {
  return (
    <div className="rounded-xl sm:rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--color-light-teal)', border: '1px solid var(--color-medium-teal)' }}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-medium-teal)' }}>
          <span className="text-white text-sm sm:text-base">💡</span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm sm:text-base" style={{ color: 'var(--color-dark-gray)' }}>Pro Tip</span>
            <div className="h-1 w-1 rounded-full" style={{ backgroundColor: 'var(--color-dark-gray)' }}></div>
            <span className="text-xs sm:text-sm" style={{ color: 'var(--color-dark-gray)' }}>Faculty Tip</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--color-dark-gray)' }}>
            Submit your certificates and documentation within 7 days of completion to ensure faster processing of your reimbursement request.
          </p>
        </div>
      </div>
    </div>
  )
}

// Summary Card for stats section
function SummaryCard({ title, value, subtitle, icon: Icon, color }) {
  const colorStyles = {
    blue: { bg: 'bg-slate-50', text: 'text-slate-700' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
    red: { bg: 'bg-rose-50', text: 'text-rose-600' },
  }

  const style = colorStyles[color] || colorStyles.blue

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5" style={{ border: '1px solid var(--color-light-teal)' }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-slate-600 text-sm font-medium">{title}</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{value}</div>
          <div className="text-slate-500 text-xs mt-1">{subtitle}</div>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${style.bg} ${style.text} flex items-center justify-center`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  )
}

// Status Badge component (same as Faculty)
function StatusBadge({ status }) {
  const getStatusClass = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-700"
      case "Pending":
      case "Under HOD":
      case "Under Principal":
      case "Under Coordinator":
        return "bg-yellow-100 text-yellow-700"
      case "Rejected":
        return "bg-red-100 text-red-700"
      default:
        return "bg-yellow-100 text-yellow-700"
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(status)}`}>
      {status}
    </span>
  )
}

export default function ApplyReimbursement() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [search, setSearch] = useState("")
  const [deleteItem, setDeleteItem] = useState(null)

  // Fetch faculty requests from API on component mount
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const data = await facultyFormsAPI.listMine()

      // Handle different response structures
      let forms = []
      if (Array.isArray(data)) {
        forms = data
      } else if (data?.forms) {
        forms = data.forms
      } else if (data?.data) {
        forms = data.data
      }

      // Map backend data to table format
      const mappedRequests = forms.map((f) => ({
        id: f.applicationId || f._id,
        _id: f._id,
        applicationId: f.applicationId,
        category: f.reimbursementType || f.category || "NPTEL",
        status: f.status || "Pending",
        amount: f.amount || 0,
        submittedDate: f.createdAt || new Date().toISOString(),
        updatedDate: f.updatedAt || new Date().toISOString(),
        description: f.remarks || f.name || "Reimbursement Request",
        documents: f.documents || [],
      }))

      setRequests(mappedRequests)
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error(error?.error || 'Failed to fetch your requests')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Handle applying for a reimbursement option
  const handleApply = useCallback((option) => {
    if (option.id === "nptel") {
      navigate("/faculty-nptel-form")
    } else {
      toast.success(`Application started for ${option.title}`)
      // TODO: Implement actual application logic for other categories
    }
  }, [navigate])

  // Handle delete request
  const handleDelete = useCallback(async () => {
    if (!deleteItem) return

    try {
      await facultyFormsAPI.deleteById(deleteItem._id || deleteItem.id)
      toast.success('Request deleted successfully')
      setDeleteItem(null)
      fetchRequests() // Refresh the list
    } catch (error) {
      console.error('Error deleting request:', error)
      toast.error(error?.error || 'Failed to delete request')
    }
  }, [deleteItem, fetchRequests])

  // Calculate summary statistics
  const summary = useMemo(() => {
    const approved = requests.filter(r => r.status === "Approved")
    const pending = requests.filter(r =>
      r.status === "Pending" ||
      r.status === "Under Coordinator" ||
      r.status === "Under HOD" ||
      r.status === "Under Principal"
    )
    const rejected = requests.filter(r => r.status === "Rejected")

    const totalDisbursed = approved.reduce((sum, r) => sum + (r.amount || 0), 0)

    return {
      total: requests.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      disbursed: totalDisbursed
    }
  }, [requests])

  // Filter requests based on search
  const filteredRequests = useMemo(() => {
    if (!search.trim()) return requests
    const q = search.toLowerCase()
    return requests.filter(r =>
      r.id?.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    )
  }, [requests, search])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-[#65CCB8]/10 page-content">
      <ReminderBanner />

      <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Welcome section with greeting and main title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-[#65CCB8]/20 text-[#3B945E] text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#3B945E] animate-pulse"></div>
            APPLY FOR REIMBURSEMENT
          </div>

          <h1 className="text-slate-900 font-bold text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3">
            Faculty Reimbursement Portal
          </h1>

          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto px-4 sm:px-0">
            Submit and track your academic reimbursement requests
          </p>
        </div>

        {/* Section header for available options */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-slate-900 font-semibold text-lg sm:text-xl lg:text-2xl mb-2">Available Reimbursement Options</h2>
          <p className="text-slate-600 text-sm sm:text-base">Choose from the faculty-specific reimbursement categories below</p>
        </div>

        {/* Grid of reimbursement option cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {reimbursementOptions.map((opt) => (
            <StatCard
              key={opt.id}
              option={opt}
              onApply={() => handleApply(opt)}
            />
          ))}
        </div>

        {/* Information tip box */}
        <InfoTipBox />

        {/* Request Status Section */}
        <div className="mt-8 sm:mt-10">
          <div className="mb-6">
            <h2 className="text-slate-900 font-semibold text-lg sm:text-xl lg:text-2xl mb-2">
              Your Request Status
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Track and manage your reimbursement applications
            </p>
          </div>

          {/* Summary cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <SummaryCard
              title="Total Applications"
              value={loading ? "..." : summary.total}
              subtitle="All time"
              icon={FileText}
              color="blue"
            />
            <SummaryCard
              title="Total Approved"
              value={loading ? "..." : summary.approved}
              subtitle={`₹${summary.disbursed.toLocaleString()} disbursed`}
              icon={CheckCircle}
              color="green"
            />
            <SummaryCard
              title="Pending Review"
              value={loading ? "..." : summary.pending}
              subtitle="Awaiting approval"
              icon={Clock}
              color="orange"
            />
            <SummaryCard
              title="Rejected"
              value={loading ? "..." : summary.rejected}
              subtitle="Need revision"
              icon={XCircle}
              color="red"
            />
          </div>

          {/* Search input */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 mb-4" style={{ border: '1px solid var(--color-light-teal)' }}>
            <input
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65CCB8] focus:border-transparent transition-all"
              placeholder="Search by ID, category, or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Requests table section - exactly like Faculty */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid var(--color-light-teal)' }}>
            <div className="p-4 sm:p-5 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 text-base sm:text-lg">Your Faculty Requests</h3>
              <p className="text-slate-500 text-sm mt-1">Complete list of your reimbursement applications</p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#3B945E] mx-auto mb-3" />
                <p className="text-slate-500">Loading your requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-lg font-medium text-slate-700 mb-1">No requests yet</p>
                <p className="text-sm text-slate-500">Apply for a reimbursement above to get started!</p>
              </div>
            ) : (
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
                    {filteredRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 text-sm">{r.id}</td>
                        <td className="px-4 py-3 text-slate-700 text-sm">{r.category}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-sm">₹{(r.amount || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-slate-500 text-sm">{new Date(r.submittedDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-slate-500 text-sm">{new Date(r.updatedDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Download button */}
                            <button
                              className="p-1.5 rounded-lg hover:bg-[#65CCB8]/20 transition-colors disabled:opacity-50"
                              onClick={() => {
                                const docUrl = r.documents?.[0]?.url
                                if (docUrl) window.open(docUrl, '_blank')
                              }}
                              disabled={!r.documents?.[0]?.url}
                              title={r.documents?.[0]?.url ? "Download Document" : "No Document"}
                            >
                              <Download className="h-4 w-4 text-slate-600" />
                            </button>
                            {/* View button */}
                            <button
                              className="p-1.5 rounded-lg hover:bg-[#65CCB8]/20 transition-colors"
                              onClick={() => navigate(`/nptel-form/view/${r.id}`)}
                              title="View"
                            >
                              <Eye className="h-4 w-4 text-slate-600" />
                            </button>
                            {/* Edit button */}
                            <button
                              className="p-1.5 rounded-lg hover:bg-[#65CCB8]/20 transition-colors"
                              onClick={() => navigate(`/nptel-form/edit/${r.id}`)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-slate-600" />
                            </button>
                            {/* Delete button */}
                            <button
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              onClick={() => setDeleteItem(r)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
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
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

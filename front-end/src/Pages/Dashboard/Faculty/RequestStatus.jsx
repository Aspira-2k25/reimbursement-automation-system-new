import React from "react"
import "../Dashboard.css"
import { Clock, CheckCircle, XCircle, FileText } from "lucide-react"
import RequestsTable from "./components/RequestsTable.jsx"

// Dummy data removed, using dynamic API
import { facultyFormsAPI } from "../../../services/api"

/**
 * SummaryCard Component
 * Displays a summary statistic with icon, value and subtitle
 * @param {string} title - The title of the summary card
 * @param {number} value - The numeric value to display
 * @param {string} sub - The subtitle text
 */
function SummaryCard({ title, value, sub }) {
  // Icon mapping for consistent icons across summary cards
  const iconMap = {
    "Total Applications": <FileText className="h-5 w-5 text-slate-700" />,
    "Total Approved": <CheckCircle className="h-5 w-5 text-green-600" />,
    "Pending Review": <Clock className="h-5 w-5 text-yellow-600" />,
    "Rejected": <XCircle className="h-5 w-5 text-rose-600" />
  }

  const icon = iconMap[title] || <FileText className="h-5 w-5 text-slate-700" />

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-slate-900 font-medium">{title}</div>
          <div className="text-2xl font-semibold text-slate-900 mt-1">{value}</div>
          <div className="text-slate-500 text-xs mt-1">{sub}</div>
        </div>
        <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  )
}

/**
 * Faculty RequestStatus Component
 * Displays faculty's reimbursement request statistics and table
 */
export default function RequestStatus() {
  // State for search functionality
  const [search, setSearch] = React.useState("")
  const [requests, setRequests] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  // Fetch data on mount
  React.useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true)
        const data = await facultyFormsAPI.listMine()

        // Map backend data to frontend model
        // Assuming backend returns array of forms
        const mapped = Array.isArray(data) ? data.map(f => ({
          id: f.applicationId || f._id,
          category: f.reimbursementType || "NPTEL",
          status: f.status || "Pending",
          amount: f.amount,
          submittedDate: f.createdAt ? new Date(f.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          updatedDate: f.updatedAt ? new Date(f.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: f.remarks || f.name || "NPTEL Reimbursement"
        })) : []

        setRequests(mapped)
        setError(null)
      } catch (err) {
        console.error("Failed to load requests:", err)
        setError("Failed to load your requests. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [])

  // Calculate summary statistics from dynamic data
  const summary = {
    total: requests.length,
    approved: requests.filter(r => r.status === "Approved").length,
    pending: requests.filter(r => ["Pending", "Under Review", "submitted"].includes(r.status.toLowerCase())).length,
    rejected: requests.filter(r => r.status === "Rejected").length
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 page-content flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4"></div>
          <p className="text-gray-500">Loading your requests...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 page-content flex items-center justify-center">
        <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-red-800 mb-1">Error Loading Data</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 page-content">
      {/* Summary cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard title="Total Applications" value={summary.total} sub="All time" />
        <SummaryCard title="Total Approved" value={summary.approved} sub="Approved requests" />
        <SummaryCard title="Pending Review" value={summary.pending} sub="Under review" />
        <SummaryCard title="Rejected" value={summary.rejected} sub="Not approved" />
      </div>

      {/* Search input */}
      <div className="card mt-4 sm:mt-6 p-3 sm:p-4">
        <input
          className="input w-full"
          placeholder="Search requests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Requests table section */}
      <div className="section mt-4 sm:mt-6">
        <div className="mb-3 sm:mb-4">
          <h3 className="section-title text-lg sm:text-xl">Your Faculty Requests</h3>
          <p className="section-subtitle text-sm sm:text-base">Complete list of your reimbursement applications</p>
        </div>
        <RequestsTable search={search} requests={requests} />
      </div>
    </main>
  )
}
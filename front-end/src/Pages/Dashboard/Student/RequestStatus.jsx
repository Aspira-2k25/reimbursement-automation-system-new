
import React from "react"
import { studentFormsAPI } from "../../../services/api"
import { FileText, CheckCircle, Clock, XCircle } from "lucide-react"
import "../Dashboard.css"
import RequestsTable from "./components/RequestsTable.jsx"

// Fetched data state
const useStudentRequests = () => {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [requests, setRequests] = React.useState([])

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const data = await studentFormsAPI.listMine()
        const forms = Array.isArray(data?.forms) ? data.forms : []
        // Map backend forms to table row shape
        const mapped = forms.map((f) => ({
          id: f.applicationId || f._id,
          category: f.reimbursementType || "NPTEL",
          status: f.status || "Pending",
          amount: Number(f.amount || 0),
          submittedDate: f.createdAt,
          updatedDate: f.updatedAt,
          description: f.remarks || f.name || "",
        }))
        if (mounted) setRequests(mapped)
      } catch (e) {
        if (mounted) setError(e?.error || "Failed to load requests")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return { loading, error, requests }
}

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
    "Total Applications": <FileText className="h-5 w-5" style={{color: '#3B945E'}} />,
    "Total Approved": <CheckCircle className="h-5 w-5" style={{color: '#3B945E'}} />,
    "Pending Review": <Clock className="h-5 w-5" style={{color: '#57BA98'}} />,
    "Rejected": <XCircle className="h-5 w-5" style={{color: '#3B945E'}} />
  }

  const icon = iconMap[title] || <FileText className="h-5 w-5" style={{color: '#3B945E'}} />

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium" style={{color: '#182628'}}>{title}</div>
          <div className="text-2xl font-semibold mt-1" style={{color: '#182628'}}>{value}</div>
          <div className="text-xs mt-1" style={{color: '#3B945E'}}>{sub}</div>
        </div>
        <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{backgroundColor: 'color-mix(in oklab, #65CCB8 20%, white)'}}>
          {icon}
        </div>
      </div>
    </div>
  )
}

/**
 * Student RequestStatus Component
 * Displays student's reimbursement request statistics and table
 */
export default function RequestStatus() {
  // State for search functionality
  const [search, setSearch] = React.useState("")
  const { loading, error, requests } = useStudentRequests()
  
  // Calculate summary statistics from fetched data
  const summary = React.useMemo(() => ({
    total: requests.length,
    approved: requests.filter(r => String(r.status).toLowerCase() === "approved").length,
    pending: requests.filter(r => ["pending", "under review", "under coordinator", "under hod", "under principal"].includes(String(r.status).toLowerCase())).length,
    rejected: requests.filter(r => String(r.status).toLowerCase() === "rejected").length,
  }), [requests])

  return (
    <main className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 page-content">
      {/* Summary cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          title="Total Applications"
          value={summary.total}
          sub="All time"
        />
        <SummaryCard
          title="Total Approved"
          value={summary.approved}
          sub="Approved requests"
        />
        <SummaryCard
          title="Pending Review"
          value={summary.pending}
          sub="Under review"
        />
        <SummaryCard
          title="Rejected"
          value={summary.rejected}
          sub="Not approved"
        />
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
          <h3 className="section-title text-lg sm:text-xl" style={{color: '#182628'}}>Your Requests</h3>
          <p className="section-subtitle text-sm sm:text-base" style={{color: '#3B945E'}}>Track the status of your reimbursement applications</p>
        </div>
        {error ? (
          <div className="card p-4 text-red-600">{String(error)}</div>
        ) : (
          <RequestsTable search={search} requests={requests} />
        )}
      </div>
    </main>
  )
}

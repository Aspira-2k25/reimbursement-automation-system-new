import React from "react"
import "../Dashboard.css"
import { Clock, CheckCircle, XCircle, FileText } from "lucide-react"
import RequestsTable from "./components/RequestsTable.jsx"

// Dummy data for faculty requests
const facultyRequests = [
  {
    id: "FAC001",
    category: "Research Grant",
    status: "Approved",
    amount: 50000,
    submittedDate: "2024-01-10",
    updatedDate: "2024-01-15",
    description: "Machine Learning research project funding"
  },
  {
    id: "FAC002",
    category: "FDP Program",
    status: "Under Review",
    amount: 15000,
    submittedDate: "2024-01-12",
    updatedDate: "2024-01-18",
    description: "Advanced Data Structures workshop"
  },
  {
    id: "FAC003",
    category: "Conference",
    status: "Pending",
    amount: 25000,
    submittedDate: "2024-01-08",
    updatedDate: "2024-01-08",
    description: "IEEE Conference registration and travel"
  },
  {
    id: "FAC004",
    category: "Workshop",
    status: "Rejected",
    amount: 8000,
    submittedDate: "2024-01-05",
    updatedDate: "2024-01-12",
    description: "Cloud Computing workshop participation"
  },
  {
    id: "FAC005",
    category: "Travel Alliance",
    status: "Approved",
    amount: 12000,
    submittedDate: "2024-01-03",
    updatedDate: "2024-01-10",
    description: "Academic conference travel expenses"
  }
]

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
  
  // Calculate summary statistics from dummy data
  const summary = {
    total: facultyRequests.length,
    approved: facultyRequests.filter(r => r.status === "Approved").length,
    pending: facultyRequests.filter(r => ["Pending", "Under Review"].includes(r.status)).length,
    rejected: facultyRequests.filter(r => r.status === "Rejected").length
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
        <RequestsTable search={search} requests={facultyRequests} />
      </div>
    </main>
  )
}
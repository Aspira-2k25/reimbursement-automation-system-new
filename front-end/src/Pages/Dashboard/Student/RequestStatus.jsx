
import React from "react"
import { FileText, CheckCircle, Clock, XCircle } from "lucide-react"
import "../Dashboard.css"
import RequestsTable from "./components/RequestsTable.jsx"

// Dummy data for student requests
const studentRequests = [
  {
    id: "STU001",
    category: "NPTEL Certification",
    status: "Approved",
    amount: 1000,
    submittedDate: "2024-01-15",
    updatedDate: "2024-01-20",
    description: "Machine Learning course completion certificate"
  },
  {
    id: "STU002",
    category: "Lab Materials",
    status: "Pending",
    amount: 2500,
    submittedDate: "2024-01-18",
    updatedDate: "2024-01-18",
    description: "Arduino components for IoT project"
  },
  {
    id: "STU003",
    category: "Conference Attendance",
    status: "Under Review",
    amount: 5000,
    submittedDate: "2024-01-10",
    updatedDate: "2024-01-22",
    description: "IEEE Conference registration and travel"
  },
  {
    id: "STU004",
    category: "Workshop Training",
    status: "Rejected",
    amount: 1500,
    submittedDate: "2024-01-05",
    updatedDate: "2024-01-12",
    description: "Data Science workshop participation"
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
 * Student RequestStatus Component
 * Displays student's reimbursement request statistics and table
 */
export default function RequestStatus() {
  // State for search functionality
  const [search, setSearch] = React.useState("")
  
  // Calculate summary statistics from dummy data
  const summary = {
    total: studentRequests.length,
    approved: studentRequests.filter(r => r.status === "Approved").length,
    pending: studentRequests.filter(r => ["Pending", "Under Review"].includes(r.status)).length,
    rejected: studentRequests.filter(r => r.status === "Rejected").length
  }

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
          <h3 className="section-title text-lg sm:text-xl">Your Requests</h3>
          <p className="section-subtitle text-sm sm:text-base">Track the status of your reimbursement applications</p>
        </div>
        <RequestsTable search={search} requests={studentRequests} />
      </div>
    </main>
  )
}

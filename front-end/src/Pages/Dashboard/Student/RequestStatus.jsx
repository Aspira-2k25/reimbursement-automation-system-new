import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { studentFormsAPI } from "../../../services/api"
import { FileText, CheckCircle, Clock, XCircle, PlusCircle, RefreshCw, AlertTriangle } from "lucide-react"
import "../Dashboard.css"
import RequestsTable from "./components/RequestsTable.jsx"
import { useNotificationContext } from "./NotificationContext"
import { CardSkeleton, TableSkeleton } from "../../../components/Skeleton.jsx"

// Fetched data state
const useStudentRequests = (addNotification) => {
  const location = useLocation()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [requests, setRequests] = React.useState([])
  const [previousRequests, setPreviousRequests] = React.useState([])
  const mountedRef = React.useRef(true)

  const fetchRequests = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await studentFormsAPI.listMine()

      // Handle different response structures
      let forms = []
      if (Array.isArray(data)) {
        forms = data
      } else if (Array.isArray(data?.forms)) {
        forms = data.forms
      } else if (data?.data && Array.isArray(data.data)) {
        forms = data.data
      }

      // Map backend forms to table row shape
      const mapped = forms.map((f) => ({
        ...f,
        id: f.applicationId || f._id || f.id || `form-${f._id}`,
        _id: f._id, // Store MongoDB _id for navigation
        applicationId: f.applicationId, // Store applicationId as well
        name: f.name || f.studentName || f.fullName || '',
        studentId: f.studentId || f.rollNumber || '',
        email: f.email || '',
        department: f.department || '',
        division: f.division || '',
        academicYear: f.academicYear || '',
        accountName: f.accountName || f.name || '',
        accountNumber: f.accountNumber || '',
        ifscCode: f.ifscCode || '',
        category: f.reimbursementType || f.category || "NPTEL",
        status: f.status || "Pending",
        amount: Number(f.amount || 0),
        submittedDate: f.createdAt || f.submittedDate || new Date(),
        updatedDate: f.updatedAt || f.updatedDate || f.createdAt || new Date(),
        description: f.remarks || f.name || f.description || "",
        courseName: f.courseName || 'N/A',
        marks: f.marks ?? null,
        documents: f.documents || [],
        accountsRemarks: f.accountsRemarks || '',
        remarks: f.remarks || f.rejectionRemarks || '',
      }))

      // Check for status changes and generate notifications
      if (mountedRef.current && previousRequests.length > 0) {
        mapped.forEach(newRequest => {
          const oldRequest = previousRequests.find(r => r.id === newRequest.id)
          if (oldRequest && oldRequest.status !== newRequest.status) {
            const statusMessages = {
              'Approved': 'Your request has been approved and sent to Accounts for reimbursement',
              'Rejected': 'Your request has been rejected. Please check the remarks for details',
              'Reimbursed': 'Your reimbursement has been successfully reimbursed! Funds have been transferred to your account',
              'Under HOD': 'Your request has been forwarded to HOD for review',
              'Under Principal': 'Your request has been forwarded to Principal for approval',
              'Under Coordinator': 'Your request is now under Coordinator review'
            }
            addNotification({
              type: 'status_change',
              title: 'Request Status Updated',
              message: `${statusMessages[newRequest.status] || `Your request status changed to ${newRequest.status}`} - ${newRequest.category}`,
              time: 'Just now'
            })
          }
        })
      }

      if (mountedRef.current) {
        setPreviousRequests(mapped)
        setRequests(mapped)
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e.error || e.message || "Failed to load requests")
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [addNotification, previousRequests])

  React.useEffect(() => {
    mountedRef.current = true
    fetchRequests()
    return () => {
      mountedRef.current = false
    }
  }, [])

  return { loading, error, requests, refetch: fetchRequests }
}

const SummaryCard = ({ title, value, sub, icon: Icon, color = "#3B945E" }) => (
  <div className="card p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between">
    <div>
      <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
      <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
    {Icon && (
      <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}15`, color }}>
        <Icon className="w-5 h-5" />
      </div>
    )}
  </div>
)

export default function RequestStatus() {
  const navigate = useNavigate()
  const [search, setSearch] = React.useState("")
  const { addNotification } = useNotificationContext()
  const { loading, error, requests, refetch } = useStudentRequests(addNotification)

  // Calculate summary statistics from fetched data
  const summary = React.useMemo(() => ({
    total: requests.length,
    approved: requests.filter(r => String(r.status).toLowerCase() === "approved" || String(r.status).toLowerCase() === "reimbursed").length,
    pending: requests.filter(r => ["pending", "under review", "under coordinator", "under hod", "under principal"].includes(String(r.status).toLowerCase())).length,
    rejected: requests.filter(r => String(r.status).toLowerCase() === "rejected").length,
  }), [requests])

  return (
    <main className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 page-content">
      {/* Summary cards section */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard
            title="Total Applications"
            value={summary.total}
            sub="All time claims"
            icon={FileText}
            color="#3B945E"
          />
          <SummaryCard
            title="Total Approved"
            value={summary.approved}
            sub="Sanctioned / Reimbursed"
            icon={CheckCircle}
            color="#10b981"
          />
          <SummaryCard
            title="Pending Review"
            value={summary.pending}
            sub="Under administrative review"
            icon={Clock}
            color="#f59e0b"
          />
          <SummaryCard
            title="Rejected"
            value={summary.rejected}
            sub="Requires attention"
            icon={XCircle}
            color="#ef4444"
          />
        </div>
      )}

      {/* Search and Action Bar */}
      <div className="card mt-4 sm:mt-6 p-3 sm:p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <input
          className="input w-full sm:max-w-md rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-[#3B945E] focus:outline-none"
          placeholder="Search by course, application ID, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => refetch()}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => navigate('/student-nptel-form')}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#3B945E] to-[#57BA98] hover:from-[#2e744a] hover:to-[#459e80] rounded-xl shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            New Reimbursement
          </button>
        </div>
      </div>

      {/* Requests table section */}
      <div className="section mt-4 sm:mt-6">
        <div className="mb-3 sm:mb-4">
          <h3 className="section-title text-lg sm:text-xl font-bold" style={{ color: '#182628' }}>Your Applications</h3>
          <p className="section-subtitle text-xs sm:text-sm" style={{ color: '#3B945E' }}>Live tracking and status updates of your submitted reimbursement claims</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <div className="font-semibold text-slate-800 mb-1">Unable to load requests</div>
            <p className="text-xs text-slate-600 mb-4">{String(error)}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <TableSkeleton rows={5} />
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FileText className="w-7 h-7 text-[#65CCB8]" />
            </div>
            <h4 className="text-base font-semibold text-slate-800 mb-1">No reimbursement claims yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
              Submit your NPTEL course completion certificate or other expenses to start the approval workflow.
            </p>
            <button
              onClick={() => navigate('/student-nptel-form')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#3B945E] hover:bg-[#2e744a] rounded-xl shadow-md transition"
            >
              <PlusCircle className="w-4 h-4" />
              Apply for Reimbursement
            </button>
          </div>
        ) : (
          <RequestsTable
            search={search}
            requests={requests}
            onDelete={async (deletedId) => {
              try {
                await studentFormsAPI.deleteById(deletedId);
                toast.success('Form deleted successfully!');
                await refetch();
              } catch (error) {
                toast.error('Failed to delete form. ' + (error.error || 'Please try again.'));
              }
            }}
          />
        )}
      </div>
    </main>
  )
}
import { useState, useMemo, useCallback, useEffect } from "react"
import "../Dashboard.css"
import Navbar from "./components/Navbar"
import { useAuth } from "../../../context/AuthContext.jsx"
import ReminderBanner from "./components/ReminderBanner"
import StatCard from "./components/StatCard"
import RequestTable from "./components/RequestTable"
import ApplyReimbursement from "./ApplyReimbursement"
import ApprovedRequest from "./ApprovedRequest"
import ProfileSettings from "./ProfileSettings"
import PageContainer from "./components/PageContainer"
import { Users, Clock, CheckCircle, XCircle, X, Loader2, FileText } from "lucide-react"
import { toast } from "react-hot-toast"
import { studentFormsAPI } from "../../../services/api"

const initialUserProfile = {
  fullName: "Dr. Sarah Johnson",
  department: "Computer Science",
  designation: "Associate Professor",
  role: "Coordinator",
}



export default function CoordinatorDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("home")
  const [userProfile, setUserProfile] = useState(initialUserProfile)

  // Sync userProfile with authenticated user data
  useEffect(() => {
    if (user) {
      setUserProfile({
        fullName: user.name || user.username || "Coordinator",
        department: user.department || "Computer Science",
        designation: user.designation || "Class Coordinator",
        role: user.role || "Coordinator",
        email: user.email || null
      })
    }
  }, [user])
  const [studentRequests, setStudentRequests] = useState([])
  const [approvedRequests, setApprovedRequests] = useState([])
  const [rejectedRequests, setRejectedRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewModal, setViewModal] = useState({ show: false, request: null })
  const [viewLoading, setViewLoading] = useState(false)
  const [requestDetails, setRequestDetails] = useState(null)

  // Helper function to map backend data to table format
  const mapFormToRequest = (f) => ({
    id: f.applicationId || f._id || `form-${f._id}`,
    _id: f._id,
    applicationId: f.applicationId,
    studentName: f.name || 'N/A',
    studentId: f.studentId || 'N/A',
    category: f.reimbursementType || f.category || "NPTEL",
    status: f.status || "Pending",
    amount: f.amount ? `₹${f.amount.toLocaleString()}` : '₹0',
    submittedDate: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : 'N/A',
    lastUpdated: f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : 'N/A',
    documents: f.documents,
    remarks: f.remarks,
  })

  // Function to fetch requests (extracted for reuse)
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch pending, approved, and rejected requests in parallel, but handle errors separately
      const [pendingResult, approvedResult, rejectedResult] = await Promise.allSettled([
        studentFormsAPI.listPending(),
        studentFormsAPI.listApproved(),
        studentFormsAPI.listRejected()
      ])

      // Handle pending requests
      let pendingForms = []
      if (pendingResult.status === 'fulfilled') {
        const pendingData = pendingResult.value
        pendingForms = pendingData?.forms || pendingData || []
        console.log('Fetched pending requests:', pendingForms.length)
      } else {
        console.error('Error fetching pending requests:', pendingResult.reason)
        toast.error('Failed to fetch pending requests')
      }

      // Handle approved requests
      let approvedForms = []
      if (approvedResult.status === 'fulfilled') {
        const approvedData = approvedResult.value
        approvedForms = approvedData?.forms || approvedData || []
        console.log('Fetched approved requests:', approvedForms.length)
      } else {
        console.error('Error fetching approved requests:', approvedResult.reason)
        // Don't show error toast for approved requests if it's just empty or 403
        const status = approvedResult.reason?.response?.status
        if (status && status !== 404 && status !== 403) {
          toast.error('Failed to fetch approved requests')
        }
      }

      // Handle rejected requests
      let rejectedForms = []
      if (rejectedResult.status === 'fulfilled') {
        const rejectedData = rejectedResult.value
        rejectedForms = rejectedData?.forms || rejectedData || []
        console.log('Fetched rejected requests:', rejectedForms.length)
      } else {
        console.error('Error fetching rejected requests:', rejectedResult.reason)
        // Don't show error toast for rejected requests if it's just empty or 403
        const status = rejectedResult.reason?.response?.status
        if (status && status !== 404 && status !== 403) {
          toast.error('Failed to fetch rejected requests')
        }
      }

      // Map backend data to table format
      const mappedPending = pendingForms.map(mapFormToRequest)
      const mappedApproved = approvedForms.map(mapFormToRequest)
      const mappedRejected = rejectedForms.map(mapFormToRequest)

      console.log('Mapped pending:', mappedPending.length, 'Mapped approved:', mappedApproved.length, 'Mapped rejected:', mappedRejected.length)

      setStudentRequests(mappedPending)
      setApprovedRequests(mappedApproved)
      setRejectedRequests(mappedRejected)
    } catch (error) {
      console.error('Unexpected error fetching requests:', error)
      toast.error(error?.error || 'Failed to fetch requests')
      setStudentRequests([])
      setApprovedRequests([])
      setRejectedRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch requests on component mount
  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Combine all requests for stats calculation
  const allRequests = useMemo(() => {
    return [...studentRequests, ...approvedRequests, ...rejectedRequests]
  }, [studentRequests, approvedRequests, rejectedRequests])

  // Memoize dashboard stats to prevent unnecessary recalculations
  const dashboardStats = useMemo(() => {
    // Coordinators only see "Pending" requests in the main table (not "Under HOD" or "Under Principal")
    const pendingRequests = studentRequests.filter((req) => req.status === "Pending")

    // Calculate total disbursed amount for approved requests
    const totalDisbursed = approvedRequests.reduce((sum, req) => {
      const amount = parseFloat(String(req.amount || '0').replace(/[₹,]/g, ''))
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)

    return [
      {
        title: "Total Requests",
        value: allRequests.length.toString(),
        icon: Users,
        color: "blue",
        subtitle: "+2 this month",
      },
      {
        title: "Pending Requests",
        value: pendingRequests.length.toString(),
        icon: Clock,
        color: "orange",
        subtitle: "Awaiting approval",
      },
      {
        title: "Approved Requests",
        value: approvedRequests.length.toString(),
        icon: CheckCircle,
        color: "green",
        subtitle: `₹${totalDisbursed.toLocaleString()} disbursed`,
      },
      {
        title: "Rejected Requests",
        value: rejectedRequests.length.toString(),
        icon: XCircle,
        color: "red",
        subtitle: "Need revision",
      },
    ]
  }, [studentRequests, approvedRequests, rejectedRequests, allRequests])

  // Memoize event handlers to prevent unnecessary re-renders
  const handleViewRequest = useCallback(async (request) => {
    setViewModal({ show: true, request })
    setViewLoading(true)

    try {
      const formId = request._id || request.applicationId || request.id
      const data = await studentFormsAPI.getById(formId)
      setRequestDetails(data?.form || data)
    } catch (error) {
      console.error("Error fetching request details:", error)
      toast.error(error?.error || "Failed to load request details")
      // Fallback to basic request data so modal still shows something
      setRequestDetails(request)
    } finally {
      setViewLoading(false)
    }
  }, [])

  const closeViewModal = useCallback(() => {
    setViewModal({ show: false, request: null })
    setRequestDetails(null)
  }, [])

  const handleApproveRequest = useCallback(async (request) => {
    try {
      const formId = request._id || request.applicationId || request.id

      // Update status to "Under HOD" when coordinator approves
      await studentFormsAPI.updateById(formId, { status: "Under HOD" })

      // Refresh the requests to get updated data from server
      await fetchRequests()

      toast.success(`Request ${request.id} approved and sent to HOD for ${request.studentName}`)
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error(error?.error || 'Failed to approve request')
    }
  }, [fetchRequests])

  const [rejectModal, setRejectModal] = useState({ show: false, request: null })
  const [rejectReason, setRejectReason] = useState("")

  const handleRejectRequest = useCallback((request) => {
    setRejectModal({ show: true, request })
  }, [])

  const confirmReject = useCallback(async () => {
    if (rejectReason.trim() && rejectModal.request) {
      try {
        const formId = rejectModal.request._id || rejectModal.request.applicationId || rejectModal.request.id

        // Update status to "Rejected" with remarks
        await studentFormsAPI.updateById(formId, {
          status: "Rejected",
          remarks: rejectReason
        })

        // Refresh the requests to get updated data from server
        await fetchRequests()

        toast.error(`Request ${rejectModal.request.id} rejected: ${rejectReason}`)
        setRejectModal({ show: false, request: null })
        setRejectReason("")
      } catch (error) {
        console.error('Error rejecting request:', error)
        toast.error(error?.error || 'Failed to reject request')
      }
    }
  }, [rejectReason, rejectModal.request, fetchRequests])

  const closeRejectModal = useCallback(() => {
    setRejectModal({ show: false, request: null })
    setRejectReason("")
  }, [])

  // Handle escape key for modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && rejectModal.show) {
        closeRejectModal()
      }
    }

    if (rejectModal.show) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [rejectModal.show, closeRejectModal])

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-4 sm:space-y-6">
            <ReminderBanner />

            {/* Welcome Banner - Responsive */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="bg-blue-50 bg-opacity-60 px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-blue-100 w-full max-w-2xl">
                <div className="text-center">
                  <h2 className="text-base sm:text-lg font-medium text-blue-800 mb-1">
                    WELCOME, {userProfile?.fullName} 👋
                  </h2>
                </div>
              </div>
            </div>

            {/* Main Title - Responsive */}
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 px-4">
                Manage Student Requests
              </h1>
            </div>

            {/* Statistics Cards - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {dashboardStats.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>

            {/* Student Requests Table - Responsive */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Student Reimbursement Requests
                  </h3>
                </div>
                <span className="text-xs sm:text-sm text-gray-500 self-start sm:self-center">
                  {studentRequests.length} Total
                </span>
              </div>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading requests...
                </div>
              ) : studentRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending requests found.
                </div>
              ) : (
                <RequestTable
                  requests={studentRequests}
                  showActions={true}
                  actionType="coordinator"
                  onView={handleViewRequest}
                  onApprove={handleApproveRequest}
                  onReject={handleRejectRequest}
                />
              )}
            </div>
          </div>
        )
      case "apply":
        return <ApplyReimbursement />
      case "approved":
        return <ApprovedRequest approvedRequests={approvedRequests} />
      case "profile":
        return <ProfileSettings userProfile={userProfile} setUserProfile={setUserProfile} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-moss-lime)]/10">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
      />
      <PageContainer>{renderContent()}</PageContainer>

      {/* View Modal for Coordinator */}
      {viewModal.show && (
        <div
          className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4"
          onClick={closeViewModal}
        >
          <div
            className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-3xl mx-auto shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                Request Details
              </h3>
              <button
                onClick={closeViewModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Application ID</p>
                    <p className="font-medium text-gray-900">
                      {requestDetails?.applicationId || viewModal.request?.id || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {requestDetails?.status || viewModal.request?.status || "Pending"}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Student Name</p>
                    <p className="font-medium text-gray-900">
                      {requestDetails?.name || viewModal.request?.studentName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Student ID</p>
                    <p className="font-medium text-gray-900">
                      {requestDetails?.studentId || viewModal.request?.studentId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="font-medium text-gray-900">
                      {requestDetails?.reimbursementType ||
                        requestDetails?.category ||
                        viewModal.request?.category ||
                        "NPTEL"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-900">
                      {requestDetails?.amount
                        ? `₹${Number(requestDetails.amount).toLocaleString()}`
                        : viewModal.request?.amount || "₹0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Submitted Date</p>
                    <p className="text-gray-900">
                      {requestDetails?.createdAt
                        ? new Date(requestDetails.createdAt).toLocaleDateString()
                        : viewModal.request?.submittedDate || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Updated</p>
                    <p className="text-gray-900">
                      {requestDetails?.updatedAt
                        ? new Date(requestDetails.updatedAt).toLocaleDateString()
                        : viewModal.request?.lastUpdated || "N/A"}
                    </p>
                  </div>
                </div>

                {(requestDetails?.remarks || viewModal.request?.remarks) && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Remarks / Description</p>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {requestDetails?.remarks || viewModal.request?.remarks}
                    </p>
                  </div>
                )}

                {requestDetails?.documents && requestDetails.documents.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Documents</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {requestDetails.documents.map((doc, index) => (
                        <a
                          key={index}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span className="text-sm text-blue-600 hover:underline">
                            Document {index + 1}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    onClick={closeViewModal}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal - Enhanced with smooth transitions and better interactions */}
      {rejectModal.show && (
        <div
          className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={closeRejectModal}
        >
          <div
            className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md mx-auto animate-in zoom-in-95 duration-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              Reject Request {rejectModal.request?.id}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              Please provide a reason for rejecting {rejectModal.request?.studentName}'s request:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg resize-none text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              rows="3"
              placeholder="Enter rejection reason..."
              autoFocus
            />
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
              <button
                onClick={closeRejectModal}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim()}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import Pagination from '../../../components/Pagination'
import useDashboardTab from '../../../hooks/useDashboardTab'
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import "../Dashboard.css"
import Navbar from "./components/Navbar"
import { useAuth } from "../../../context/AuthContext.jsx"
import ReminderBanner from "./components/ReminderBanner"
import StatCard from "./components/StatCard"
import RequestTable from "./components/RequestTable"
import ApplyReimbursement from "./ApplyReimbursement"
import ApprovedRequest from "./ApprovedRequest"
import RejectedApplications from "./RejectedApplications"
import ProfileSettings from "./ProfileSettings"
import ChangePassword from "../../../components/ChangePassword"
import PageContainer from "./components/PageContainer"
import { Users, Clock, CheckCircle, XCircle, X, Loader2, FileText } from "lucide-react"
import { toast } from "react-hot-toast"
import { studentFormsAPI, dashboardAPI } from "../../../services/api"
import { resolveDepartment } from "../../../utils/departmentResolver"

// SECURITY: Input sanitization helper to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// SECURITY: Validate and sanitize rejection reason
const sanitizeRejectionReason = (reason) => {
  const sanitized = sanitizeInput(reason);
  // Limit length to prevent DoS
  return sanitized.substring(0, 500);
};

// Default user profile fallback (overwritten by actual user data from auth)
const initialUserProfile = {
  fullName: "Coordinator",
  department: "",
  designation: "Class Coordinator",
  role: "Coordinator",
}



export default function CoordinatorDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useDashboardTab('/dashboard/coordinator', ["home","apply","approved","rejected","profile","change-password"])
  const [userProfile, setUserProfile] = useState(initialUserProfile)

  // Sync userProfile with authenticated user data
  useEffect(() => {
    if (user) {
      setUserProfile({
        fullName: user.name || user.username || "Coordinator",
        department: resolveDepartment(user.department),
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
  const [rejectLoading, setRejectLoading] = useState(false)
  const [viewModal, setViewModal] = useState({ show: false, request: null })
  const [viewLoading, setViewLoading] = useState(false)
  const [requestDetails, setRequestDetails] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [summary, setSummary] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [requestError, setRequestError] = useState('')
  const requestGeneration = useRef(0)
  const changeTab = useCallback(tab => { setPage(1); setActiveTab(tab) }, [setActiveTab])

  // Helper function to map backend data to table format
  const mapFormToRequest = useCallback((f) => ({
    id: f.applicationId || f._id || `form-${f._id}`,
    _id: f._id,
    applicationId: f.applicationId,
    studentName: f.name || 'N/A',
    studentId: f.studentId || 'N/A',
    facultyId: f.facultyId,
    category: f.reimbursementType || f.category || "NPTEL",
    status: f.status || "Pending",
    amount: f.amount ? `₹${f.amount.toLocaleString()}` : '₹0',
    submittedDate: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : 'N/A',
    lastUpdated: f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : 'N/A',
    documents: f.documents,
    remarks: f.remarks,
    courseName: f.courseName || 'N/A',
    marks: f.marks ?? null,
  }), [])

  const fetchRequests = useCallback(async () => {
    if (!['home', 'approved', 'rejected'].includes(activeTab)) return
    const generation = ++requestGeneration.current
    setLoading(true)
    try {
      const status = activeTab === 'approved' ? 'approved-history' : activeTab === 'rejected' ? 'Rejected' : 'pending'
      const [data, aggregates] = await Promise.all([
        dashboardAPI.list({ page, limit: 20, status }), dashboardAPI.analytics()
      ])
      if (generation !== requestGeneration.current) return
      const mapped = (data.forms || []).map(mapFormToRequest)
      setStudentRequests(activeTab === 'home' ? mapped : [])
      setApprovedRequests(activeTab === 'approved' ? mapped : [])
      setRejectedRequests(activeTab === 'rejected' ? mapped : [])
      setPagination(data.pagination)
      setSummary(aggregates.summary)
      setAnalytics(aggregates)
      setRequestError('')
      if (page > Math.max(1, data.pagination.totalPages)) setPage(Math.max(1, data.pagination.totalPages))
    } catch (error) {
      if (generation === requestGeneration.current) setRequestError(error?.error || 'Failed to fetch requests. Please retry.')
    } finally {
      if (generation === requestGeneration.current) setLoading(false)
    }
  }, [page, activeTab, mapFormToRequest])

  useEffect(() => {
    void fetchRequests()
    return () => { requestGeneration.current += 1 }
  }, [fetchRequests])

  const dashboardStats = useMemo(() => {
    const counts = summary || { total: 0, approved: 0, reimbursed: 0, rejected: 0, reimbursedAmount: 0 }
    const actionablePending = (analytics?.byStatus || []).filter(bucket => ['Pending', 'Under Coordinator'].includes(bucket._id)).reduce((sum, bucket) => sum + bucket.count, 0)
    return [
      { title: 'Total Requests', value: String(counts.total), icon: Users, color: 'blue', subtitle: 'All visible requests' },
      { title: 'Pending Requests', value: String(actionablePending), icon: Clock, color: 'orange', subtitle: 'Awaiting coordinator approval' },
      { title: 'Approved Requests', value: String((analytics?.byStatus || []).filter(bucket => ['Under HOD', 'Under Principal', 'Approved', 'Reimbursed'].includes(bucket._id)).reduce((sum, bucket) => sum + bucket.count, 0)), icon: CheckCircle, color: 'green', subtitle: `Reimbursed: ${counts.reimbursedAmount.toLocaleString()}` },
      { title: 'Rejected Requests', value: String(counts.rejected), icon: XCircle, color: 'red', subtitle: 'Need revision' }
    ]
  }, [summary, analytics])

  // Memoize event handlers to prevent unnecessary re-renders
  const handleViewRequest = useCallback(async (request) => {
    setViewModal({ show: true, request })
    setViewLoading(true)

    try {
      const formId = request._id || request.applicationId || request.id
      const data = await studentFormsAPI.getById(formId)
      setRequestDetails(data?.form || data)
    } catch (error) {
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

      // Add notification for approval
      const newNotification = {
        id: Date.now(),
        type: 'status_change',
        title: 'Request Approved',
        message: `${request.studentName}'s request has been approved and sent to HOD`,
        time: 'Just now',
        unread: true,
        timestamp: new Date().toISOString()
      }
      setNotifications(prev => [newNotification, ...prev])

      toast.success(`Request ${request.id} approved and sent to HOD for ${request.studentName}`)
    } catch (error) {
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
      setRejectLoading(true)
      try {
        // SECURITY: Sanitize rejection reason before sending to API
        const sanitizedReason = sanitizeRejectionReason(rejectReason);

        const formId = rejectModal.request._id || rejectModal.request.applicationId || rejectModal.request.id

        // Update status to "Rejected" with sanitized remarks
        await studentFormsAPI.updateById(formId, {
          status: "Rejected",
          remarks: sanitizedReason,
          rejectionRemarks: sanitizedReason // Required for backend workflow visibility
        })

        // Refresh the requests to get updated data from server
        await fetchRequests()

        // Add notification for rejection
        const newNotification = {
          id: Date.now(),
          type: 'status_change',
          title: 'Request Rejected',
          message: `${rejectModal.request.studentName}'s request has been rejected: ${rejectReason}`,
          time: 'Just now',
          unread: true,
          timestamp: new Date().toISOString()
        }
        setNotifications(prev => [newNotification, ...prev])

        toast.error(`Request ${rejectModal.request.id} rejected: ${rejectReason}`)
        setRejectModal({ show: false, request: null })
        setRejectReason("")
      } catch (error) {
        toast.error(error?.error || 'Failed to reject request')
      } finally {
        setRejectLoading(false)
      }
    }
  }, [rejectReason, rejectModal.request, fetchRequests])

  const closeRejectModal = useCallback(() => {
    setRejectModal({ show: false, request: null })
    setRejectReason("")
  }, [])

  // Handle escape key for modal - FIXED: Added proper cleanup and viewModal handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (rejectModal.show) {
          closeRejectModal();
        }
        if (viewModal.show) {
          closeViewModal();
        }
      }
    }

    // Only add listener when either modal is open
    if (rejectModal.show || viewModal.show) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [rejectModal.show, viewModal.show, closeRejectModal, closeViewModal])

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-4 sm:space-y-6">
            <ReminderBanner />

            {/* Welcome Banner - Responsive */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="bg-[#65CCB8]/20 px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-[#65CCB8]/40 w-full max-w-2xl">
                <div className="text-center">
                  <h2 className="text-base sm:text-lg font-medium text-[#3B945E] mb-1">
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
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#3B945E]" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Student Reimbursement Requests
                  </h3>
                </div>
                <span className="text-xs sm:text-sm text-gray-500 self-start sm:self-center">
                  {pagination.total} total; {studentRequests.length} on this page
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
      case "rejected":
        return <RejectedApplications rejectedRequests={rejectedRequests} />
      case "profile":
        return <ProfileSettings userProfile={userProfile} setUserProfile={setUserProfile} />
      case "change-password":
        return <ChangePassword />
      default:
        return null
    }
  }

  // Notification management functions
  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, unread: false }
          : notification
      )
    )
  }, [])

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, unread: false }))
    )
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#65CCB8]/10 page-content">
      <Navbar
        activeTab={activeTab}
        setActiveTab={changeTab}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        notifications={notifications}
        markNotificationAsRead={markNotificationAsRead}
        markAllNotificationsAsRead={markAllNotificationsAsRead}
      />
      <PageContainer>
        {requestError && <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-red-800">
          {requestError} <button onClick={() => void fetchRequests()} className="ml-3 underline">Retry</button>
        </div>}
        {renderContent()}
        {['home', 'approved', 'rejected'].includes(activeTab) && <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} pageSize={20} noun="requests" busy={loading} onPageChange={setPage} />}
      </PageContainer>

      {/* View Modal for Coordinator */}
      {viewModal.show && (
        <div role="dialog" aria-modal="true" aria-label="Reimbursement dialog"
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
              <button aria-label="Close"
                onClick={closeViewModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-[#3B945E]" />
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
                    <p className="text-gray-500">Course Name</p>
                    <p className="font-medium text-gray-900">
                      {requestDetails?.courseName || viewModal.request?.courseName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Marks</p>
                    <p className="font-medium text-gray-900">
                      {requestDetails?.marks !== undefined && requestDetails?.marks !== null
                        ? `${requestDetails.marks}%`
                        : viewModal.request?.marks !== undefined && viewModal.request?.marks !== null
                          ? `${viewModal.request.marks}%`
                          : "N/A"}
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
                      {requestDetails.documents.map((doc, index) => {
                        // SECURITY: Validate URL before rendering to prevent XSS
                        const isValidUrl = doc.url && (
                          doc.url.startsWith('https://') ||
                          doc.url.startsWith('http://')
                        );

                        // Only allow Cloudinary URLs (trusted domain)
                        const isTrustedDomain = doc.url && (
                          doc.url.includes('cloudinary.com') ||
                          doc.url.includes('res.cloudinary.com')
                        );

                        if (!isValidUrl || !isTrustedDomain) {
                          console.warn('Blocked potentially unsafe document URL:', doc.url);
                          return null;
                        }

                        return (
                          <a
                            key={index}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-blue-600 hover:underline">
                              {index === 0 ? 'NPTEL Result' : ((requestDetails?.applicantType && requestDetails.applicantType !== 'Student') ? 'Faculty ID Card' : 'Student ID Card')}
                            </span>
                          </a>
                        );
                      })}
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
        <div role="dialog" aria-modal="true" aria-label="Reimbursement dialog"
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
            <textarea aria-label="reject Reason"
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
                disabled={!rejectReason.trim() || rejectLoading}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                {rejectLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {rejectLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

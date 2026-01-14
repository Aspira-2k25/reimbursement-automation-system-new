import React, { useMemo } from 'react'
import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react'
import { useHODContext } from './HODLayout'
import StatCard from '../components/StatCard'
import RequestTable from '../components/RequestTable'
import { calculateStats } from '../data/mockData'
import { useAuth } from '../../../../context/AuthContext'

const RequestStatus = () => {
  const { user } = useAuth()
  const { allRequests, userProfile } = useHODContext()

  // Show HOD's own requests (requests where applicant is the HOD themselves)
  const hodRequests = useMemo(() => {
    const currentUserId = user?.id ?? user?.userId
    const resolvedEmail =
      userProfile?.email ||
      user?.email ||
      (typeof user?.username === 'string' && user.username.includes('@') ? user.username : null) ||
      (typeof user?.userId === 'string' && user.userId.includes('@') ? user.userId : null)

    return allRequests.filter((r) => {
      const matchesId =
        currentUserId !== undefined &&
        currentUserId !== null &&
        r.userId !== undefined &&
        r.userId !== null &&
        String(r.userId) === String(currentUserId)

      const matchesEmail =
        resolvedEmail &&
        r.applicantEmail &&
        String(r.applicantEmail).toLowerCase() === String(resolvedEmail).toLowerCase()

      return Boolean(matchesId || matchesEmail)
    })
  }, [allRequests, userProfile?.email, user?.email, user?.id, user?.userId, user?.username])

  const stats = useMemo(() => calculateStats(hodRequests), [hodRequests])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Request Status</h1>
          <p className="text-gray-600 mt-1">Track your own reimbursement requests and their current status</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Requests" value={String(stats.total)} subtitle="My requests" icon={FileText} color="blue" />
        <StatCard title="Pending" value={String(stats.pending)} subtitle="Awaiting review" icon={Clock} color="orange" />
        <StatCard title="Approved" value={String(stats.approved)} subtitle={`₹${stats.approvedAmount.toLocaleString()} disbursed`} icon={CheckCircle} color="green" />
        <StatCard title="Rejected" value={String(stats.rejected)} subtitle="Requires revision" icon={XCircle} color="red" />
      </div>

      {/* Requests Table */}
      <RequestTable
        requests={hodRequests}
        title="My Reimbursement Requests"
        showActions={false}
      />
    </div>
  )
}

export default RequestStatus



import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { Building, Users, FileText, CheckCircle, Clock, XCircle, Eye, Lock, ChevronDown, ChevronUp, TrendingUp, ArrowRight, AlertCircle, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import StatCard from '../components/StatCard'
import { useHODContext } from './HODLayout'
import { initialHodData, calculateStats } from '../data/mockData'

/**
 * AllDepartmentOverview Component
 * Shows all departments with expandable detail view for HOD's own department
 */
const AllDepartmentOverview = () => {
  const { userProfile, allRequests } = useHODContext()
  const [expandedDept, setExpandedDept] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')

  // Helper function to check if department names match (handles aliases)
  const isDepartmentMatch = useCallback((deptName, userDept) => {
    if (!deptName || !userDept) return false

    const dept1 = deptName.toLowerCase().trim()
    const dept2 = userDept.toLowerCase().trim()

    // Direct match
    if (dept1 === dept2) return true

    // Common aliases
    const aliases = {
      'information technology': ['it', 'infotech', 'information technology'],
      'computer engineering': ['ce', 'comps', 'computer engineering', 'comp eng'],
      'cse aiml': ['aiml', 'cse-aiml', 'cse aiml', 'ai ml'],
      'cse ds': ['ds', 'cse-ds', 'cse ds', 'data science'],
      'mechanical engineering': ['mech', 'mechanical', 'mechanical engineering'],
      'civil engineering': ['civil', 'civil engineering']
    }

    // Check if either matches any alias of the other
    for (const [key, values] of Object.entries(aliases)) {
      if (values.includes(dept1) && values.includes(dept2)) return true
      if ((key === dept1 && values.includes(dept2)) || (key === dept2 && values.includes(dept1))) return true
    }

    // Partial match (one contains the other)
    if (dept1.includes(dept2) || dept2.includes(dept1)) return true

    return false
  }, [])

  // Separate requests by status for detailed view
  const categorizedRequests = useMemo(() => {
    const pending = allRequests.filter(r =>
      r.status === 'Pending' || r.status === 'Under HOD'
    )
    const underPrincipal = allRequests.filter(r => r.status === 'Under Principal')
    const approved = allRequests.filter(r => r.status === 'Approved')
    const rejected = allRequests.filter(r => r.status === 'Rejected')

    return { pending, underPrincipal, approved, rejected }
  }, [allRequests])

  // Build departments data with real data for HOD's department
  const allDepartmentsData = useMemo(() => {
    const departments = [...initialHodData.allDepartmentsData]
    const userDept = userProfile?.department || 'Information Technology'

    // Find the HOD's department using flexible matching
    let ownDeptIndex = departments.findIndex(dept => isDepartmentMatch(dept.name, userDept))

    // If no match found, default to first department (IT)
    if (ownDeptIndex === -1) {
      console.log('No department match found for:', userDept, '- defaulting to first')
      ownDeptIndex = 0
    }

    // Update HOD's department with real data
    const stats = calculateStats(allRequests)

    departments[ownDeptIndex] = {
      ...departments[ownDeptIndex],
      hod: userProfile?.fullName || departments[ownDeptIndex].hod,
      isOwnDepartment: true,
      totalRequests: allRequests.length,
      pendingRequests: categorizedRequests.pending.length,
      underPrincipal: categorizedRequests.underPrincipal.length,
      approvedRequests: categorizedRequests.approved.length,
      rejectedRequests: categorizedRequests.rejected.length,
      totalDisbursed: stats.approvedAmount,
      approvalRate: stats.approved + stats.rejected > 0
        ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
        : 0,
      facultyRequests: allRequests.filter(r => r.applicantType === 'Faculty').length,
      studentRequests: allRequests.filter(r => r.applicantType === 'Student').length
    }

    // Mark all departments
    return departments.map((dept, idx) => ({
      ...dept,
      isOwnDepartment: idx === ownDeptIndex
    }))
  }, [userProfile, allRequests, categorizedRequests, isDepartmentMatch])

  // Auto-expand own department on first load
  useEffect(() => {
    const ownDept = allDepartmentsData.find(d => d.isOwnDepartment)
    if (ownDept && expandedDept === null) {
      setExpandedDept(ownDept.id)
    }
  }, [allDepartmentsData, expandedDept])

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const total = allDepartmentsData.reduce((sum, dept) => sum + dept.totalRequests, 0)
    const pending = allDepartmentsData.reduce((sum, dept) => sum + dept.pendingRequests, 0)
    const approved = allDepartmentsData.reduce((sum, dept) => sum + dept.approvedRequests, 0)
    const rejected = allDepartmentsData.reduce((sum, dept) => sum + dept.rejectedRequests, 0)
    const totalDisbursed = allDepartmentsData.reduce((sum, dept) => sum + dept.totalDisbursed, 0)
    const avgApprovalRate = Math.round(allDepartmentsData.reduce((sum, dept) => sum + dept.approvalRate, 0) / allDepartmentsData.length)

    return { total, pending, approved, rejected, totalDisbursed, avgApprovalRate }
  }, [allDepartmentsData])

  // Handle department click
  const handleDepartmentClick = useCallback((department) => {
    if (department.isOwnDepartment) {
      setExpandedDept(expandedDept === department.id ? null : department.id)
    } else {
      toast.info(`${department.name} - View Only. Click your department to manage.`, { duration: 2000 })
    }
  }, [expandedDept])

  // Get own department
  const ownDepartment = allDepartmentsData.find(d => d.isOwnDepartment)

  // Tab configuration
  const tabs = [
    { id: 'pending', label: 'Pending Review', count: categorizedRequests.pending.length, bgColor: 'bg-orange-100', textColor: 'text-orange-700', borderColor: '#f97316' },
    { id: 'underPrincipal', label: 'Under Principal', count: categorizedRequests.underPrincipal.length, bgColor: 'bg-blue-100', textColor: 'text-blue-700', borderColor: '#3b82f6' },
    { id: 'approved', label: 'Approved', count: categorizedRequests.approved.length, bgColor: 'bg-green-100', textColor: 'text-green-700', borderColor: '#22c55e' },
    { id: 'rejected', label: 'Rejected', count: categorizedRequests.rejected.length, bgColor: 'bg-red-100', textColor: 'text-red-700', borderColor: '#ef4444' }
  ]

  // Get current tab requests
  const currentTabRequests = categorizedRequests[activeTab] || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Building className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Departments Overview</h1>
            <p className="text-gray-600 mt-1">View statistics across all departments</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 px-3 py-2 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          <span>
            Your Department: <strong>{userProfile?.department || 'Information Technology'}</strong> — Showing real-time data
          </span>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={overallStats.total.toString()}
          subtitle="All departments"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Pending"
          value={overallStats.pending.toString()}
          subtitle="Awaiting approval"
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Approved"
          value={overallStats.approved.toString()}
          subtitle={`₹${overallStats.totalDisbursed.toLocaleString()} disbursed`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Approval Rate"
          value={`${overallStats.avgApprovalRate}%`}
          subtitle="Average"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Department Cards */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-gray-600" />
            Department Statistics
          </h3>
          <span className="text-sm text-gray-500">{allDepartmentsData.length} Departments</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allDepartmentsData.map((dept) => (
            <div
              key={dept.id}
              onClick={() => handleDepartmentClick(dept)}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${dept.isOwnDepartment
                  ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                <div className="flex items-center gap-2">
                  {dept.isOwnDepartment ? (
                    <>
                      <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-medium">
                        YOUR DEPT
                      </span>
                      {expandedDept === dept.id
                        ? <ChevronUp className="w-4 h-4 text-green-600" />
                        : <ChevronDown className="w-4 h-4 text-green-600" />
                      }
                    </>
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-500 mb-3">HOD: {dept.hod}</div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-gray-700">{dept.totalRequests}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-orange-600">{dept.pendingRequests}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-green-600">{dept.approvedRequests}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-red-600">{dept.rejectedRequests}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Disbursed:</span>
                  <span className="font-semibold text-green-600">₹{dept.totalDisbursed.toLocaleString()}</span>
                </div>
              </div>

              {dept.isOwnDepartment && (
                <div className="mt-3 pt-2 border-t border-green-200 text-center">
                  <span className="text-sm text-green-600 font-medium flex items-center justify-center gap-1">
                    {expandedDept === dept.id ? 'Click to collapse' : 'Click to see details'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Detail View - Shows when own department is clicked */}
      {ownDepartment && expandedDept === ownDepartment.id && (
        <div className="bg-white rounded-xl border-2 border-green-300 shadow-lg overflow-hidden">
          {/* Detail Header */}
          <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {userProfile?.department || 'Your Department'} — Detailed Breakdown
              </h4>
              <div className="flex items-center gap-4 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  Faculty: <strong>{ownDepartment.facultyRequests}</strong>
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  Students: <strong>{ownDepartment.studentRequests}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b bg-gray-50">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-3 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white' : 'hover:bg-gray-100'
                    }`}
                  style={{
                    borderBottomWidth: '3px',
                    borderBottomColor: activeTab === tab.id ? tab.borderColor : 'transparent',
                    color: activeTab === tab.id ? tab.borderColor : '#6b7280'
                  }}
                >
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab.bgColor} ${tab.textColor}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {currentTabRequests.length > 0 ? (
              <div className="space-y-3">
                {currentTabRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${req.applicantType === 'Faculty'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-teal-100 text-teal-600'
                        }`}>
                        {req.applicantName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{req.applicantName}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${req.applicantType === 'Faculty'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-teal-100 text-teal-700'
                            }`}>
                            {req.applicantType}
                          </span>
                          <span>•</span>
                          <span>{req.category}</span>
                          <span>•</span>
                          <span className="text-gray-400">{req.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{req.amount}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {req.submittedDate}
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            req.status === 'Under Principal' ? 'bg-blue-100 text-blue-700' :
                              'bg-orange-100 text-orange-700'
                        }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-medium text-gray-600">No {tabs.find(t => t.id === activeTab)?.label} Requests</p>
                <p className="text-gray-400 mt-1">Requests will appear here when available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-amber-700 mb-1">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">Data Information</span>
        </div>
        <p className="text-sm text-amber-600">
          Your department shows <strong>real-time data</strong> from submitted requests.
          Other departments show summary statistics for overview purposes.
        </p>
      </div>
    </div>
  )
}

export default AllDepartmentOverview
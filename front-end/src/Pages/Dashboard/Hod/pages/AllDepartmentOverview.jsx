import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { Building, FileText, CheckCircle, Eye, Lock, AlertCircle, Calendar, X } from 'lucide-react'
import { useHODContext } from './HODLayout'
import { initialHodData, calculateStats } from '../data/mockData'

/**
 * AllDepartmentOverview Component
 * Shows all departments with a floating analytics panel on card click.
 */
const AllDepartmentOverview = () => {
  const { userProfile, allRequests, loading } = useHODContext()
  const [selectedDept, setSelectedDept] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')

  // Helper function to check if department names match (handles aliases)
  const isDepartmentMatch = useCallback((deptName, userDept) => {
    if (!deptName || !userDept) return false

    const dept1 = deptName.toLowerCase().trim()
    const dept2 = userDept.toLowerCase().trim()

    if (dept1 === dept2) return true

    const aliases = {
      'information technology': ['it', 'infotech', 'information technology'],
      'computer engineering': ['ce', 'comps', 'computer engineering', 'comp eng'],
      'cse aiml': ['aiml', 'cse-aiml', 'cse aiml', 'ai ml'],
      'cse ds': ['ds', 'cse-ds', 'cse ds', 'data science'],
      'mechanical engineering': ['mech', 'mechanical', 'mechanical engineering'],
      'civil engineering': ['civil', 'civil engineering']
    }

    for (const [key, values] of Object.entries(aliases)) {
      if (values.includes(dept1) && values.includes(dept2)) return true
      if ((key === dept1 && values.includes(dept2)) || (key === dept2 && values.includes(dept1))) return true
    }

    if (dept1.includes(dept2) || dept2.includes(dept1)) return true

    return false
  }, [])

  // Categorise requests for the HOD's own department
  const categorizedRequests = useMemo(() => {
    const pending = allRequests.filter(r => r.status === 'Pending' || r.status === 'Under HOD')
    const underPrincipal = allRequests.filter(r => r.status === 'Under Principal')
    const approved = allRequests.filter(r => r.status === 'Approved')
    const rejected = allRequests.filter(r => r.status === 'Rejected')
    return { pending, underPrincipal, approved, rejected }
  }, [allRequests])

  // Build departments list, injecting real data for own dept
  const allDepartmentsData = useMemo(() => {
    const departments = [...initialHodData.allDepartmentsData]
    const userDept = userProfile?.department || ''

    let ownDeptIndex = departments.findIndex(dept => isDepartmentMatch(dept.name, userDept))
    if (ownDeptIndex === -1) ownDeptIndex = 0

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

    return departments.map((dept, idx) => ({
      ...dept,
      isOwnDepartment: idx === ownDeptIndex
    }))
  }, [userProfile, allRequests, categorizedRequests, isDepartmentMatch])

  // Overall statistics
  const overallStats = useMemo(() => {
    const total = allDepartmentsData.reduce((sum, d) => sum + d.totalRequests, 0)
    const pending = allDepartmentsData.reduce((sum, d) => sum + d.pendingRequests, 0)
    const approved = allDepartmentsData.reduce((sum, d) => sum + d.approvedRequests, 0)
    const rejected = allDepartmentsData.reduce((sum, d) => sum + d.rejectedRequests, 0)
    const totalDisbursed = allDepartmentsData.reduce((sum, d) => sum + d.totalDisbursed, 0)
    const avgApprovalRate = Math.round(
      allDepartmentsData.reduce((sum, d) => sum + d.approvalRate, 0) / allDepartmentsData.length
    )
    return { total, pending, approved, rejected, totalDisbursed, avgApprovalRate }
  }, [allDepartmentsData])

  // Open analytics panel for any department
  const handleDepartmentClick = useCallback((department) => {
    setSelectedDept(department)
    setActiveTab('pending')
  }, [])

  // Close panel
  const handleClosePanel = useCallback(() => setSelectedDept(null), [])

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClosePanel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleClosePanel])

  // Tabs config
  const tabs = [
    { id: 'pending', label: 'Pending Review', bgColor: 'bg-orange-100', textColor: 'text-orange-700', borderColor: '#f97316' },
    { id: 'underPrincipal', label: 'Under Principal', bgColor: 'bg-blue-100', textColor: 'text-blue-700', borderColor: '#3b82f6' },
    { id: 'approved', label: 'Approved', bgColor: 'bg-green-100', textColor: 'text-green-700', borderColor: '#22c55e' },
    { id: 'rejected', label: 'Rejected', bgColor: 'bg-red-100', textColor: 'text-red-700', borderColor: '#ef4444' }
  ]

  // Requests for the active tab — only own dept has real request list
  const panelTabRequests = useMemo(() => {
    if (!selectedDept?.isOwnDepartment) return []
    return categorizedRequests[activeTab] || []
  }, [selectedDept, activeTab, categorizedRequests])

  // Stat counts for the open panel
  const panelTabCounts = useMemo(() => {
    if (!selectedDept) return {}
    if (selectedDept.isOwnDepartment) {
      return {
        pending: categorizedRequests.pending.length,
        underPrincipal: categorizedRequests.underPrincipal.length,
        approved: categorizedRequests.approved.length,
        rejected: categorizedRequests.rejected.length
      }
    }
    return {
      pending: selectedDept.pendingRequests,
      underPrincipal: selectedDept.underPrincipal ?? 0,
      approved: selectedDept.approvedRequests,
      rejected: selectedDept.rejectedRequests
    }
  }, [selectedDept, categorizedRequests])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Departments Overview</h1>
              <p className="text-gray-600 mt-1">Loading department data...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading department statistics...</p>
          </div>
        </div>
      </div>
    )
  }

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
            <p className="text-gray-600 mt-1">Click any department card to view detailed analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 px-3 py-2 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          <span>
            Your Department: <strong>{userProfile?.department || 'Department not set'}</strong> — Showing real-time data
          </span>
        </div>
      </div>

      {/* Overall stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: overallStats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending', value: overallStats.pending, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Approved', value: overallStats.approved, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Approval Rate', value: `${overallStats.avgApprovalRate}%`, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white shadow-sm text-center`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
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
              title={`Click to view ${dept.name} analytics`}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                dept.isOwnDepartment
                  ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                <div className="flex items-center gap-2">
                  {dept.isOwnDepartment ? (
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-medium">
                      YOUR DEPT
                    </span>
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

              <div className="mt-3 pt-3 border-t text-sm flex justify-between">
                <span className="text-gray-500">Reimbursed:</span>
                <span className="font-semibold text-green-600">₹{dept.totalDisbursed.toLocaleString()}</span>
              </div>

              <div className="mt-2 text-center">
                <span className="text-xs text-gray-400 flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" /> Click to view analytics
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Floating Analytics Panel (modal) ── */}
      {selectedDept && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={handleClosePanel}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              selectedDept.isOwnDepartment
                ? 'bg-gradient-to-r from-green-500 to-teal-500'
                : 'bg-gradient-to-r from-slate-600 to-slate-700'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <h2 className="text-lg font-bold">{selectedDept.name}</h2>
                  {selectedDept.isOwnDepartment && (
                    <span className="text-xs bg-white/25 px-2 py-0.5 rounded-full font-medium">Your Dept</span>
                  )}
                </div>
                <p className="text-sm text-white/80 mt-0.5">HOD: {selectedDept.hod}</p>
              </div>
              <div className="flex items-center gap-3">
                {selectedDept.isOwnDepartment && (
                  <div className="flex gap-2 text-xs">
                    <span className="bg-white/20 px-2 py-1 rounded-full">Faculty: <strong>{selectedDept.facultyRequests}</strong></span>
                    <span className="bg-white/20 px-2 py-1 rounded-full">Students: <strong>{selectedDept.studentRequests}</strong></span>
                  </div>
                )}
                <button
                  onClick={handleClosePanel}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Summary stats row */}
            <div className="grid grid-cols-4 border-b">
              {[
                { label: 'Total', value: selectedDept.totalRequests, color: 'text-gray-700' },
                { label: 'Pending', value: panelTabCounts.pending ?? selectedDept.pendingRequests, color: 'text-orange-600' },
                { label: 'Approved', value: panelTabCounts.approved ?? selectedDept.approvedRequests, color: 'text-green-600' },
                { label: 'Rejected', value: panelTabCounts.rejected ?? selectedDept.rejectedRequests, color: 'text-red-600' }
              ].map(s => (
                <div key={s.label} className="text-center py-4 border-r last:border-r-0">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Reimbursed + approval rate */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b text-sm">
              <span className="text-gray-500">Total Reimbursed:</span>
              <span className="font-semibold text-green-600 text-base">₹{selectedDept.totalDisbursed.toLocaleString()}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500">Approval Rate:</span>
              <span className="font-semibold text-purple-600">{selectedDept.approvalRate}%</span>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-white overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id ? 'bg-white' : 'hover:bg-gray-50 text-gray-500'
                  }`}
                  style={{
                    borderBottomWidth: '3px',
                    borderBottomColor: activeTab === tab.id ? tab.borderColor : 'transparent',
                    color: activeTab === tab.id ? tab.borderColor : undefined
                  }}
                >
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab.bgColor} ${tab.textColor}`}>
                    {panelTabCounts[tab.id] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Requests list (own dept only) or View-Only notice */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedDept.isOwnDepartment ? (
                panelTabRequests.length > 0 ? (
                  <div className="space-y-3">
                    {panelTabRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            req.applicantType === 'Faculty' ? 'bg-purple-100 text-purple-600' : 'bg-teal-100 text-teal-600'
                          }`}>
                            {req.applicantName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{req.applicantName}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                req.applicantType === 'Faculty' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                              }`}>{req.applicantType}</span>
                              <span>·</span>
                              <span>{req.category}</span>
                              <span>·</span>
                              <span className="text-gray-400">{req.id}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{req.amount}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{req.submittedDate}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                            req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            req.status === 'Under Principal' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>{req.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No {tabs.find(t => t.id === activeTab)?.label} requests</p>
                    <p className="text-gray-400 text-sm mt-1">Requests will appear here when available</p>
                  </div>
                )
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <Lock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">View Only</p>
                  <p className="text-sm mt-1 text-gray-400">Individual request details are only available for your own department. Summary statistics are shown above.</p>
                </div>
              )}
            </div>

            {/* Footer close button */}
            <div className="border-t p-4 flex justify-end bg-gray-50">
              <button
                onClick={handleClosePanel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
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
import React, { useMemo, useCallback } from 'react'
import { Building, Users, FileText, CheckCircle, Clock, XCircle, Eye, Lock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import StatCard from '../components/StatCard'
import { useHODContext } from './HODLayout'
import { initialHodData } from '../data/mockData'

/**
 * AllDepartmentOverview Component
 * Displays overview of all departments with their statistics
 * Uses dynamic data from mockData.js
 */
const AllDepartmentOverview = () => {
  const { userProfile, allRequests } = useHODContext()

  // Get departments data from mockData and update current HOD's department dynamically
  const allDepartmentsData = useMemo(() => {
    const departments = [...initialHodData.allDepartmentsData]
    
    // Find and update the current HOD's department based on their actual department
    const currentDeptIndex = departments.findIndex(dept => 
      dept.name.toLowerCase() === userProfile?.department?.toLowerCase()
    )
    
    if (currentDeptIndex !== -1 && userProfile?.fullName) {
      departments[currentDeptIndex] = {
        ...departments[currentDeptIndex],
        hod: userProfile.fullName,
        // Update stats to reflect current HOD's actual data
        totalRequests: allRequests.length,
        pendingRequests: allRequests.filter(req => req.status === 'Pending').length,
        approvedRequests: allRequests.filter(req => req.status === 'Approved').length,
        rejectedRequests: allRequests.filter(req => req.status === 'Rejected').length,
        totalDisbursed: allRequests
          .filter(req => req.status === 'Approved')
          .reduce((sum, req) => {
            const amount = parseFloat(req.amount.replace(/[₹,]/g, ''))
            return sum + (isNaN(amount) ? 0 : amount)
          }, 0),
        approvalRate: (() => {
          const processedRequests = allRequests.length - allRequests.filter(req => req.status === 'Pending').length
          return processedRequests > 0 ? Math.round(
            (allRequests.filter(req => req.status === 'Approved').length / processedRequests) * 100
          ) : 0
        })()
      }
    }
    
    return departments
  }, [userProfile?.fullName, userProfile?.department, allRequests])

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const total = allDepartmentsData.reduce((sum, dept) => sum + dept.totalRequests, 0)
    const pending = allDepartmentsData.reduce((sum, dept) => sum + dept.pendingRequests, 0)
    const approved = allDepartmentsData.reduce((sum, dept) => sum + dept.approvedRequests, 0)
    const rejected = allDepartmentsData.reduce((sum, dept) => sum + dept.rejectedRequests, 0)
    const totalDisbursed = allDepartmentsData.reduce((sum, dept) => sum + dept.totalDisbursed, 0)
    const avgApprovalRate = Math.round(allDepartmentsData.reduce((sum, dept) => sum + dept.approvalRate, 0) / allDepartmentsData.length)

    return {
      total,
      pending,
      approved,
      rejected,
      totalDisbursed,
      avgApprovalRate
    }
  }, [allDepartmentsData])

  // Handler functions
  const handleStatCardClick = useCallback((statType) => {
    // Navigate to reports page when clicking stat cards
    toast.info(`Navigating to detailed ${statType.toLowerCase()} report`)
    // In a real app, this would navigate to the reports page with specific filters
  }, [])

  const handleDepartmentClick = useCallback((department) => {
    if (department.hod === userProfile?.fullName) {
      toast.info(`This is your department - you can manage it from the main dashboard`)
    } else {
      toast.info(`Viewing read-only data for ${department.name}`)
    }
  }, [userProfile])

  return (
    <div className="space-y-6">
      {/* Header with Read-Only Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ALL Department Overview</h1>
            <p className="text-gray-600 mt-1">View-only access to all department statistics and reports</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded-lg">
          <Lock className="w-4 h-4" />
          <span>You can view all department data but can only manage your own department: <strong>{userProfile?.department || 'Civil Engineering'}</strong></span>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Total Requests (All Depts)" 
          value={overallStats.total.toString()} 
          subtitle="Across all departments" 
          icon={FileText} 
          color="blue"
          onClick={() => handleStatCardClick('Total Requests')}
        />
        <StatCard 
          title="Pending Requests" 
          value={overallStats.pending.toString()} 
          subtitle="Awaiting approval" 
          icon={Clock} 
          color="orange"
          onClick={() => handleStatCardClick('Pending Requests')}
        />
        <StatCard 
          title="Approved Requests" 
          value={overallStats.approved.toString()} 
          subtitle={`₹${overallStats.totalDisbursed.toLocaleString()} disbursed`} 
          icon={CheckCircle} 
          color="green"
          onClick={() => handleStatCardClick('Approved Requests')}
        />
        <StatCard 
          title="Average Approval Rate" 
          value={`${overallStats.avgApprovalRate}%`} 
          subtitle="Across all departments" 
          icon={XCircle} 
          color="red"
          onClick={() => handleStatCardClick('Average Approval Rate')}
        />
      </div>

      {/* Department-wise Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Department-wise Statistics</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {allDepartmentsData.map((dept) => (
            <div 
              key={dept.id} 
              onClick={() => handleDepartmentClick(dept)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
                dept.hod === userProfile?.fullName 
                  ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-100/50' 
                  : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                {dept.hod === userProfile?.fullName && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Your Dept
                  </span>
                )}
              </div>
              
              <div className="text-sm text-gray-600 mb-3">
                HOD: {dept.hod}
              </div>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                <div className="text-center p-2 sm:p-3 bg-white rounded border">
                  <div className="text-sm sm:text-base font-semibold text-blue-600">{dept.totalRequests}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-white rounded border">
                  <div className="text-sm sm:text-base font-semibold text-orange-600">{dept.pendingRequests}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-white rounded border">
                  <div className="text-sm sm:text-base font-semibold text-green-600">{dept.approvedRequests}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-white rounded border">
                  <div className="text-sm sm:text-base font-semibold text-red-600">{dept.rejectedRequests}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Disbursed:</span>
                  <span className="font-semibold text-green-600">₹{dept.totalDisbursed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-600">Approval Rate:</span>
                  <span className="font-semibold text-blue-600">{dept.approvalRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Read-Only Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-amber-700">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">Read-Only Access</span>
        </div>
        <p className="text-sm text-amber-600 mt-1">
          This is a view-only dashboard. You can see statistics from all departments but can only manage requests for your own department.
        </p>
      </div>
    </div>
  )
}

export default AllDepartmentOverview

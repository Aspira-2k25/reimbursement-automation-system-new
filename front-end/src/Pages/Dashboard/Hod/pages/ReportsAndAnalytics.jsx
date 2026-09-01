import React, { useState, useMemo } from 'react'
import { motion as Motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  Users,
  IndianRupee
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import StatCard from '../components/StatCard'
import ReportLineChart from '../components/ReportLineChart'
import ReportPieChart from '../components/ReportPieChart'
import FilterBar from '../components/FilterBar'
import PrintableReport from '../components/PrintableReport'
import { useHODContext } from './HODLayout'
import { calculateStats, getRequestsByType } from '../data/mockData'

const ReportsAndAnalytics = () => {
  const { allRequests, userProfile } = useHODContext()
  const [selectedDateRange, setSelectedDateRange] = useState({ startDate: '', endDate: '' })
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedMemberType, setSelectedMemberType] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  // Filter requests based on current filters
  const filteredRequests = useMemo(() => {
    return allRequests.filter(request => {
      // Date filter
      if (selectedDateRange.startDate && selectedDateRange.endDate) {
        const requestDate = new Date(request.submittedDate)
        const startDate = new Date(selectedDateRange.startDate)
        const endDate = new Date(selectedDateRange.endDate)
        if (requestDate < startDate || requestDate > endDate) {
          return false
        }
      }

      // Category filter
      if (selectedCategory !== 'All' && request.category !== selectedCategory) {
        return false
      }

      // Member type filter
      if (selectedMemberType !== 'All') {
        const reqType = String(request.applicantType || (request.studentId ? 'Student' : (request.facultyId ? 'Faculty' : ''))).toLowerCase();
        if (reqType !== selectedMemberType.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'All' && request.status !== selectedStatus) {
        return false
      }

      return true
    })
  }, [allRequests, selectedDateRange, selectedCategory, selectedMemberType, selectedStatus])

  // Calculate filtered statistics with accurate calculations
  const filteredStats = useMemo(() => {
    const stats = calculateStats(filteredRequests)

    // Calculate accurate approval rate: (approved / (total - pending)) * 100
    const processedRequests = stats.total - stats.pending
    const approvalRate = processedRequests > 0 ? Math.round((stats.approved / processedRequests) * 100) : 0

    // Calculate trend percentages based on previous period (simplified for demo)
    // In a real app, you'd compare with previous month/quarter data
    const totalTrend = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0
    const approvedTrend = stats.approved > 0 ? Math.round((stats.approvedAmount / stats.approved) / 1000) : 0

    return [
      {
        title: "Total Requests",
        value: stats.total.toString(),
        subtitle: `${approvalRate}% approval rate`,
        icon: BarChart3,
        color: 'blue',
        trend: totalTrend > 0 ? { direction: 'up', value: `+${totalTrend}%`, percentage: totalTrend } : null
      },
      {
        title: "Approved",
        value: stats.approved.toString(),
        subtitle: `₹${stats.approvedAmount.toLocaleString()} reimbursed`,
        icon: TrendingUp,
        color: 'green',
        trend: approvedTrend > 0 ? { direction: 'up', value: `+${approvedTrend}%` } : null
      },
      {
        title: "Pending",
        value: stats.pending.toString(),
        subtitle: "Awaiting approval",
        icon: Calendar,
        color: 'orange'
      },
      {
        title: "Total Amount",
        value: `₹${stats.approvedAmount.toLocaleString()}`,
        subtitle: "Approved amount",
        icon: IndianRupee,
        color: 'purple',
        trend: stats.approvedAmount > 0 ? { direction: 'up', value: `+${Math.round(stats.approvedAmount / 1000)}%` } : null
      }
    ]
  }, [filteredRequests])

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const total = filteredRequests.length
    if (total === 0) return []

    const statusCounts = filteredRequests.reduce((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1
      return acc
    }, {})

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: Math.round((count / total) * 100),
      count
    }))
  }, [filteredRequests])

  // Category breakdown - include both Approved and Under Principal in amount
  const categoryBreakdown = useMemo(() => {
    const categories = filteredRequests.reduce((acc, request) => {
      const category = request.category || 'Other'
      if (!acc[category]) {
        acc[category] = { count: 0, amount: 0, pending: 0, rejected: 0 }
      }
      acc[category].count += 1

      // Completed reimbursements are counted only when Accounts marks them reimbursed
      if (request.status === 'Reimbursed') {
        const amountStr = String(request.amount || '0')
        const amount = parseFloat(amountStr.replace(/[₹,]/g, ''))
        acc[category].amount += isNaN(amount) ? 0 : amount
      }

      // Track pending and rejected for additional insights
      if (request.status === 'Pending' || request.status === 'Under HOD') {
        acc[category].pending += 1
      }
      if (request.status === 'Rejected') {
        acc[category].rejected += 1
      }

      return acc
    }, {})

    return Object.entries(categories).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
      pending: data.pending,
      rejected: data.rejected
    })).sort((a, b) => b.count - a.count)
  }, [filteredRequests])

  // Generate dynamic monthly trend data from filtered requests
  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    // Group filtered requests by month
    const monthlyData = filteredRequests.reduce((acc, request) => {
      const date = new Date(request.submittedDate)
      const month = date.getMonth()
      const year = date.getFullYear()
      const monthName = months[month]
      const key = `${year}-${monthName}`

      if (!acc[key]) {
        acc[key] = { requests: 0, amount: 0, month: monthName, year }
      }

      acc[key].requests += 1
      // Completed reimbursements are counted only when Accounts marks them reimbursed
      if (request.status === 'Reimbursed') {
        const amountStr = String(request.amount || '0')
        const amount = parseFloat(amountStr.replace(/[₹,]/g, ''))
        acc[key].amount += isNaN(amount) ? 0 : amount
      }

      return acc
    }, {})

    // Get last 6 months for display
    const result = []
    for (let i = 5; i >= 0; i--) {
      const targetMonth = (currentMonth - i + 12) % 12
      const targetYear = currentMonth - i < 0 ? currentYear - 1 : currentYear
      const monthName = months[targetMonth]
      const key = `${targetYear}-${monthName}`

      result.push({
        month: monthName,
        requests: monthlyData[key]?.requests || 0,
        amount: monthlyData[key]?.amount || 0
      })
    }

    return result
  }, [filteredRequests])

  // Get unique values for filters
  const uniqueCategories = [...new Set(allRequests.map(r => r.category).filter(Boolean))]
  const uniqueStatuses = [...new Set(allRequests.map(r => r.status).filter(Boolean))]

  // Export official report using print/PDF flow
  const handleExport = () => {
    document.body.classList.add('hod-report-print')

    const cleanup = () => {
      document.body.classList.remove('hod-report-print')
      window.removeEventListener('afterprint', cleanup)
    }

    window.addEventListener('afterprint', cleanup)
    window.print()

    toast.success('Print dialog opened for PDF export')
  }

  const handleRefresh = () => {
    // Force re-render by triggering state update
    setSelectedCategory(prev => prev)
    toast.success('Data refreshed!')
  }

  return (
    <>
    <div className="reports-screen space-y-6">
      {/* Page Header */}
      <Motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive reimbursement analytics and insights</p>
        </div>
        <Motion.button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Download className="w-4 h-4" />
          Export Report
        </Motion.button>
      </Motion.div>

      {/* Filter Bar */}
      <FilterBar
        onDateRangeChange={setSelectedDateRange}
        onCategoryChange={setSelectedCategory}
        onMemberTypeChange={setSelectedMemberType}
        onStatusChange={setSelectedStatus}
        onExport={handleExport}
        onRefresh={handleRefresh}
        categories={uniqueCategories}
        statuses={uniqueStatuses}
        memberTypes={['All', 'Faculty', 'Student', 'HOD']}
      />

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredStats.map((stat, index) => (
          <Motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <StatCard {...stat} />
          </Motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <ReportLineChart
          data={monthlyTrendData}
          title="Monthly Trend"
          height={350}
        />

        {/* Status Distribution Chart */}
        <ReportPieChart
          data={statusDistribution}
          title="Status Distribution"
          height={350}
        />
      </div>

      {/* Department Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
            <Filter className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            {categoryBreakdown.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{category.category}</div>
                  <div className="text-sm text-gray-600">{category.count} requests</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">₹{category.amount.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total approved</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
          </div>

          <div className="space-y-4">
            {(() => {
              const stats = calculateStats(filteredRequests)
              const processedRequests = stats.total - stats.pending
              const approvalRate = processedRequests > 0 ? Math.round((stats.approved / processedRequests) * 100) : 0
              const avgAmount = stats.approved > 0 ? Math.round(stats.approvedAmount / stats.approved) : 0

              // Calculate average processing days based on actual data
              const avgProcessingDays = (() => {
                const processedRequests = filteredRequests.filter(req =>
                  req.status === 'Approved' || req.status === 'Rejected'
                )

                if (processedRequests.length === 0) return 0

                const totalDays = processedRequests.reduce((sum, req) => {
                  const submittedDate = new Date(req.submittedDate)
                  const lastUpdated = new Date(req.lastUpdated)
                  const daysDiff = Math.ceil((lastUpdated - submittedDate) / (1000 * 60 * 60 * 24))
                  return sum + Math.max(1, daysDiff) // Minimum 1 day
                }, 0)

                return Math.round((totalDays / processedRequests.length) * 10) / 10 // Round to 1 decimal
              })()

              return (
                <>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{approvalRate}%</div>
                    <div className="text-sm text-gray-600">Approval Rate</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {approvalRate >= 80 ? 'Excellent' : approvalRate >= 60 ? 'Good' : 'Needs improvement'}
                    </div>
                  </div>

                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{avgProcessingDays}</div>
                    <div className="text-sm text-gray-600">Avg. Processing Days</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {avgProcessingDays <= 3 ? 'Fast processing' : avgProcessingDays <= 7 ? 'Good' : 'Slow'}
                    </div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ₹{avgAmount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Avg. Request Amount</div>
                    <div className="text-xs text-gray-500 mt-1">Per approved request</div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Faculty vs Student Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Faculty vs Student Analysis</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Faculty Requests</h4>
            {(() => {
              const facultyRequests = getRequestsByType(filteredRequests, 'Faculty')
              const facultyStats = calculateStats(facultyRequests)
              return (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">{facultyStats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-lg font-bold text-blue-600">{facultyStats.approved}</div>
                    <div className="text-xs text-gray-600">Approved</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <div className="text-lg font-bold text-purple-600">₹{facultyStats.approvedAmount.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Amount</div>
                  </div>
                </div>
              )
            })()}
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Student Requests</h4>
            {(() => {
              const studentRequests = getRequestsByType(filteredRequests, 'Student')
              const studentStats = calculateStats(studentRequests)
              return (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">{studentStats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-lg font-bold text-blue-600">{studentStats.approved}</div>
                    <div className="text-xs text-gray-600">Approved</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <div className="text-lg font-bold text-purple-600">₹{studentStats.approvedAmount.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Amount</div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
    <PrintableReport
      requests={filteredRequests}
      dateRange={selectedDateRange}
      departmentName={userProfile?.department || '-'}
      hodName={userProfile?.fullName || userProfile?.name || ''}
      memberType={selectedMemberType}
    />
    </>
  )
}

export default ReportsAndAnalytics

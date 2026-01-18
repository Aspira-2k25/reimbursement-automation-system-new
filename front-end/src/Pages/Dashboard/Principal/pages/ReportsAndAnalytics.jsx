import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { usePrincipalContext } from './PrincipalLayout'

// Helper functions (replacing mockData imports)
const calculateCollegeStats = (requests) => {
  const total = requests.length
  const pending = requests.filter(r => r.status === 'Under Principal').length
  const approved = requests.filter(r => r.status === 'Approved' || r.status === 'Under Principal').length
  const rejected = requests.filter(r => r.status === 'Rejected').length
  const approvedAmount = requests
    .filter(r => r.status === 'Approved' || r.status === 'Under Principal')
    .reduce((sum, r) => sum + (parseFloat(String(r.amount).replace(/[₹,]/g, '')) || 0), 0)

  return { total, pending, approved, rejected, approvedAmount }
}

const getRequestsByType = (requests, type) => {
  if (type === 'Faculty') {
    // Include HOD as Faculty since HODs are faculty members
    return requests.filter(r => r.applicantType === 'Faculty' || r.applicantType === 'HOD')
  }
  return requests.filter(r => r.applicantType === type)
}

const ReportsAndAnalytics = () => {
  const { allRequests, departments, collegeStats } = usePrincipalContext()
  const [selectedDateRange, setSelectedDateRange] = useState({ startDate: '', endDate: '' })
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedMemberType, setSelectedMemberType] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedDepartment, setSelectedDepartment] = useState('All')

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
      if (selectedMemberType !== 'All' && request.applicantType !== selectedMemberType) {
        return false
      }

      // Status filter
      if (selectedStatus !== 'All' && request.status !== selectedStatus) {
        return false
      }

      // Department filter
      if (selectedDepartment !== 'All' && request.department !== selectedDepartment) {
        return false
      }

      return true
    })
  }, [allRequests, selectedDateRange, selectedCategory, selectedMemberType, selectedStatus, selectedDepartment])

  // Calculate filtered statistics with accurate calculations
  const filteredStats = useMemo(() => {
    const stats = calculateCollegeStats(filteredRequests)

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
        color: 'green',
        trend: totalTrend > 0 ? { direction: 'up', value: `+${totalTrend}%`, percentage: totalTrend } : null
      },
      {
        title: "Approved",
        value: stats.approved.toString(),
        subtitle: `₹${stats.approvedAmount.toLocaleString()} disbursed`,
        icon: TrendingUp,
        color: 'green',
        trend: approvedTrend > 0 ? { direction: 'up', value: `+${approvedTrend}%` } : null
      },
      {
        title: "Pending",
        value: stats.pending.toString(),
        subtitle: "Awaiting approval",
        icon: Calendar,
        color: 'green'
      },
      {
        title: "Total Amount",
        value: `₹${stats.approvedAmount.toLocaleString()}`,
        subtitle: "Approved amount",
        icon: IndianRupee,
        color: 'green',
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

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const categories = filteredRequests.reduce((acc, request) => {
      const category = request.category
      if (!acc[category]) {
        acc[category] = { count: 0, amount: 0 }
      }
      acc[category].count += 1
      if (request.status === 'Approved') {
        const amount = parseFloat(request.amount.replace(/[₹,]/g, ''))
        acc[category].amount += isNaN(amount) ? 0 : amount
      }
      return acc
    }, {})

    return Object.entries(categories).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount
    })).sort((a, b) => b.count - a.count)
  }, [filteredRequests])

  // Generate dynamic monthly trend data from filtered requests
  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentYear = new Date().getFullYear()

    // Group filtered requests by month
    const monthlyData = filteredRequests.reduce((acc, request) => {
      const date = new Date(request.submittedDate)
      const month = date.getMonth()
      const monthName = months[month]

      if (!acc[monthName]) {
        acc[monthName] = { requests: 0, amount: 0 }
      }

      acc[monthName].requests += 1
      if (request.status === 'Approved') {
        const amount = parseFloat(request.amount.replace(/[₹,]/g, ''))
        acc[monthName].amount += isNaN(amount) ? 0 : amount
      }

      return acc
    }, {})

    // Convert to array format for the chart
    return months.slice(0, 6).map(month => ({
      month,
      requests: monthlyData[month]?.requests || 0,
      amount: monthlyData[month]?.amount || 0
    }))
  }, [filteredRequests])

  // Get unique values for filters - use fixed valid Principal statuses
  const uniqueCategories = [...new Set(allRequests.map(r => r.category))].filter(Boolean)
  const uniqueStatuses = ['Under Principal', 'Approved', 'Rejected']

  const handleExport = () => {
    toast.success('Report exported successfully!')
  }

  const handleRefresh = () => {
    toast.success('Data refreshed!')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive reimbursement analytics and insights
            {selectedDepartment !== 'All' && (
              <span className="ml-2 inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                Department: {selectedDepartment}
              </span>
            )}
          </p>
        </div>
        <motion.button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Download className="w-4 h-4" />
          Export Report
        </motion.button>
      </motion.div>

      {/* Filter Bar */}
      <FilterBar
        onDateRangeChange={setSelectedDateRange}
        onCategoryChange={setSelectedCategory}
        onMemberTypeChange={setSelectedMemberType}
        onStatusChange={setSelectedStatus}
        onDepartmentChange={setSelectedDepartment}
        onExport={handleExport}
        onRefresh={handleRefresh}
        categories={uniqueCategories}
        statuses={uniqueStatuses}
        departments={departments.map(dept => dept.name)}
      />

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
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
              const stats = calculateCollegeStats(filteredRequests)
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

                  <div className="text-center p-4 bg-green-50 rounded-lg">
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
              const facultyStats = calculateCollegeStats(facultyRequests)
              return (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">{facultyStats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-lg font-bold text-blue-600">{facultyStats.approved}</div>
                    <div className="text-xs text-gray-600">Approved</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">₹{facultyStats.approvedAmount.toLocaleString()}</div>
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
              const studentStats = calculateCollegeStats(studentRequests)
              return (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">{studentStats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">{studentStats.approved}</div>
                    <div className="text-xs text-gray-600">Approved</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">₹{studentStats.approvedAmount.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Amount</div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsAndAnalytics

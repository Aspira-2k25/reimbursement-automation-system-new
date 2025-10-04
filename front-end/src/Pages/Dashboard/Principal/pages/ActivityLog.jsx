import React, { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, 
  Search, 
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Eye,
  Clock
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { usePrincipalContext } from './PrincipalLayout'

const ActivityLog = () => {
  const { activityLog } = usePrincipalContext()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filter activities based on search and filters
  const filteredActivities = useMemo(() => {
    return activityLog.filter(activity => {
      const matchesSearch = 
        activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.details.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesType = typeFilter === 'All' || activity.type === typeFilter
      const matchesDepartment = departmentFilter === 'All' || activity.department === departmentFilter
      
      // Date filtering
      let matchesDate = true
      if (dateFilter !== 'All') {
        const activityDate = new Date(activity.timestamp)
        const now = new Date()
        
        switch (dateFilter) {
          case 'Today':
            matchesDate = activityDate.toDateString() === now.toDateString()
            break
          case 'This Week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            matchesDate = activityDate >= weekAgo
            break
          case 'This Month':
            matchesDate = activityDate.getMonth() === now.getMonth() && 
                         activityDate.getFullYear() === now.getFullYear()
            break
          case 'Last 3 Months':
            const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            matchesDate = activityDate >= threeMonthsAgo
            break
        }
      }
      
      return matchesSearch && matchesType && matchesDepartment && matchesDate
    })
  }, [activityLog, searchQuery, typeFilter, departmentFilter, dateFilter])

  // Get unique departments for filter
  const departments = useMemo(() => {
    const deptSet = new Set(activityLog.map(activity => activity.department))
    return Array.from(deptSet).filter(dept => dept !== 'Unknown')
  }, [activityLog])

  // Get activity statistics
  const activityStats = useMemo(() => {
    const total = activityLog.length
    const today = activityLog.filter(activity => {
      const activityDate = new Date(activity.timestamp)
      const now = new Date()
      return activityDate.toDateString() === now.toDateString()
    }).length
    
    const thisWeek = activityLog.filter(activity => {
      const activityDate = new Date(activity.timestamp)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return activityDate >= weekAgo
    }).length
    
    const approvalActions = activityLog.filter(activity => 
      activity.type === 'approval' || activity.type === 'approved'
    ).length
    
    return { total, today, thisWeek, approvalActions }
  }, [activityLog])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Activity log refreshed successfully!')
    } catch (error) {
      toast.error('Failed to refresh activity log. Please try again.')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const handleDownloadLog = useCallback(() => {
    toast.success('Activity log downloaded successfully!')
  }, [])

  const getActivityIcon = (type) => {
    switch (type) {
      case 'approval':
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejection':
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'budget':
        return <Building2 className="w-4 h-4 text-blue-500" />
      case 'policy':
        return <Settings className="w-4 h-4 text-purple-500" />
      case 'system':
        return <Activity className="w-4 h-4 text-gray-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getActivityColor = (type) => {
    switch (type) {
      case 'approval':
      case 'approved':
        return 'border-green-200 bg-green-50'
      case 'rejection':
      case 'rejected':
        return 'border-red-200 bg-red-50'
      case 'budget':
        return 'border-blue-200 bg-blue-50'
      case 'policy':
        return 'border-purple-200 bg-purple-50'
      case 'system':
        return 'border-gray-200 bg-gray-50'
      default:
        return 'border-gray-200 bg-white'
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
      } else {
        return date.toLocaleDateString()
      }
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-600 mt-1">
            Complete audit trail of all system activities and user actions
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            onClick={handleDownloadLog}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="w-4 h-4" />
            Export Log
          </motion.button>
          <motion.button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* College Overview */}
      <motion.div 
        className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4 sm:p-6 text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold mb-2">
              College-Wide Activity Monitoring
            </h2>
            <p className="text-indigo-100 mb-4 text-sm sm:text-base">
              Engineering College • Real-time Activity Tracking
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-indigo-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>{activityStats.total} Total Activities</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{activityStats.today} Today</span>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <motion.div 
              className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Activity className="w-10 h-10 text-white/80" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Activity Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          {
            title: "Total Activities",
            value: activityStats.total.toString(),
            subtitle: "All time",
            icon: Activity,
            color: 'blue'
          },
          {
            title: "Today's Activities",
            value: activityStats.today.toString(),
            subtitle: "Last 24 hours",
            icon: Calendar,
            color: 'green'
          },
          {
            title: "This Week",
            value: activityStats.thisWeek.toString(),
            subtitle: "Last 7 days",
            icon: Clock,
            color: 'orange'
          },
          {
            title: "Approval Actions",
            value: activityStats.approvalActions.toString(),
            subtitle: "Approvals processed",
            icon: CheckCircle,
            color: 'purple'
          }
        ].map((stat, index) => (
          <motion.div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                stat.color === 'green' ? 'bg-green-50 text-green-600' :
                stat.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                'bg-purple-50 text-purple-600'}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters and Search */}
      <motion.div 
        className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Activity Log</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredActivities.length} of {activityLog.length} activities
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-full sm:w-64"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="All">All Types</option>
                <option value="approval">Approvals</option>
                <option value="rejection">Rejections</option>
                <option value="budget">Budget</option>
                <option value="policy">Policy</option>
                <option value="system">System</option>
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="All">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Last 3 Months">Last 3 Months</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleDownloadLog}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download Log"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Activity List */}
        <div className="space-y-3">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No activities found matching your criteria</p>
            </div>
          ) : (
            filteredActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                className={`p-4 rounded-lg border ${getActivityColor(activity.type)}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="flex items-start gap-3">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">{activity.action}</h4>
                        <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{activity.user}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>{activity.department}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(activity.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.type === 'approval' || activity.type === 'approved' ? 'bg-green-100 text-green-800' :
                          activity.type === 'rejection' || activity.type === 'rejected' ? 'bg-red-100 text-red-800' :
                          activity.type === 'budget' ? 'bg-blue-100 text-blue-800' :
                          activity.type === 'policy' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ActivityLog

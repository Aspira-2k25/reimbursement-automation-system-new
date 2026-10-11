import Pagination from '../../../../components/Pagination'
import { serializeCsv } from '../../../../utils/csv'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adminAPI } from '../../../../services/api'
import {
  RefreshCw,
  Search,
  Filter,
  Download,
  Shield,
  LogIn,
  LogOut,
  AlertTriangle,
  UserPlus,
  Trash2,
  UserCheck,
  UserX,
  Edit,
  CheckCircle,
  XCircle,
  CreditCard,
  FileText,
  Key,
  User,
  ChevronDown,
  ChevronUp,
  Activity,
  Globe
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const POLL_INTERVAL = 30000

const ACTION_OPTIONS = [
  { value: 'All', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'login_failed', label: 'Login Failed' },
  { value: 'logout', label: 'Logout' },
  { value: 'create', label: 'Create Staff' },
  { value: 'activate', label: 'Activate Account' },
  { value: 'deactivate', label: 'Deactivate Account' },
  { value: 'delete', label: 'Delete' },
  { value: 'update', label: 'Update' },
  { value: 'submit', label: 'Submit Form' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'reimburse', label: 'Reimburse' },
  { value: 'password_change', label: 'Password Change' },
  { value: 'profile_update', label: 'Profile Update' },
  { value: 'error', label: 'Error' }
]

const AdminLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 100, totalPages: 1 })

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('All')
  const [filterDepartment, setFilterDepartment] = useState('All')
  const [filterAction, setFilterAction] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [allRoles, setAllRoles] = useState([])
  const [allDepartments, setAllDepartments] = useState([])
  const [expandedLogId, setExpandedLogId] = useState(null)

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = {
        role: filterRole,
        department: filterDepartment,
        action: filterAction,
        startDate,
        endDate,
        limit: 100,
        page
      }
      const res = await adminAPI.getLogs(params)
      setLogs(res.logs || [])
      setPagination(res.pagination || { total: 0, page: 1, limit: 100, totalPages: 1 })
      setError(null)
    } catch (err) {
      console.error('Failed to load logs', err)
      setError('Failed to load logs')
      toast.error('Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }, [filterRole, filterDepartment, filterAction, startDate, endDate])

  // Initial fetch + polling
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) fetchLogs(pagination.page)
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchLogs, pagination.page])

  // Extract unique roles and departments
  useEffect(() => {
    if (!logs || logs.length === 0) return

    setAllRoles((prev) => {
      const next = new Set(prev)
      logs.forEach((l) => {
        const role = l?.data?.role
        if (role) next.add(role)
      })
      return Array.from(next)
    })

    setAllDepartments((prev) => {
      const next = new Set(prev)
      logs.forEach((l) => {
        const dept = l?.data?.department
        if (dept) next.add(dept)
      })
      return Array.from(next)
    })
  }, [logs])

  // Client-side search filter across logs in current page
  const displayedLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs
    const q = searchQuery.toLowerCase().trim()
    return logs.filter((l) => {
      const msg = l?.message?.toLowerCase() || ''
      const user = l?.data?.user?.toLowerCase() || ''
      const role = l?.data?.role?.toLowerCase() || ''
      const dept = l?.data?.department?.toLowerCase() || ''
      const action = l?.data?.action?.toLowerCase() || ''
      const targetName = l?.data?.details?.targetName?.toLowerCase() || ''
      const targetUser = l?.data?.details?.targetUsername?.toLowerCase() || ''
      const ip = l?.data?.ipAddress?.toLowerCase() || l?.ipAddress?.toLowerCase() || ''

      return (
        msg.includes(q) ||
        user.includes(q) ||
        role.includes(q) ||
        dept.includes(q) ||
        action.includes(q) ||
        targetName.includes(q) ||
        targetUser.includes(q) ||
        ip.includes(q)
      )
    })
  }, [logs, searchQuery])

  // Quick Stats
  const logStats = useMemo(() => {
    const total = pagination.total || logs.length
    let authCount = 0
    let adminOpsCount = 0
    let formOpsCount = 0

    logs.forEach((l) => {
      const action = l?.data?.action
      if (['login', 'logout', 'login_failed'].includes(action)) authCount++
      if (['create', 'activate', 'deactivate', 'delete', 'update'].includes(action)) adminOpsCount++
      if (['submit', 'approve', 'reject', 'reimburse'].includes(action)) formOpsCount++
    })

    return { total, authCount, adminOpsCount, formOpsCount }
  }, [logs, pagination.total])

  // Format IP address for user clarity (translates confusing ::1 to clean Localhost)
  const formatIp = (ip) => {
    if (!ip) return null
    const clean = String(ip).trim()
    if (clean === '::1' || clean === '127.0.0.1' || clean === '::ffff:127.0.0.1' || clean.includes('Localhost')) {
      return '127.0.0.1 (Localhost)'
    }
    if (clean.startsWith('::ffff:')) {
      return clean.replace('::ffff:', '')
    }
    return clean
  }

  // Format timestamp
  const formatTime = (ts) => {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  // Get action styling and icon
  const getActionConfig = (action) => {
    switch (action) {
      case 'delete':
        return {
          icon: Trash2,
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
          dotClass: 'bg-rose-500'
        }
      case 'create':
        return {
          icon: UserPlus,
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dotClass: 'bg-emerald-500'
        }
      case 'activate':
        return {
          icon: UserCheck,
          badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
          dotClass: 'bg-teal-500'
        }
      case 'deactivate':
        return {
          icon: UserX,
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          dotClass: 'bg-amber-500'
        }
      case 'login':
        return {
          icon: LogIn,
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          dotClass: 'bg-blue-500'
        }
      case 'login_failed':
        return {
          icon: AlertTriangle,
          badgeClass: 'bg-red-100 text-red-800 border-red-200',
          dotClass: 'bg-red-500'
        }
      case 'logout':
        return {
          icon: LogOut,
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          dotClass: 'bg-slate-400'
        }
      case 'approve':
        return {
          icon: CheckCircle,
          badgeClass: 'bg-green-100 text-green-800 border-green-200',
          dotClass: 'bg-green-500'
        }
      case 'reject':
        return {
          icon: XCircle,
          badgeClass: 'bg-red-100 text-red-800 border-red-200',
          dotClass: 'bg-red-500'
        }
      case 'reimburse':
        return {
          icon: CreditCard,
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
          dotClass: 'bg-purple-500'
        }
      case 'submit':
        return {
          icon: FileText,
          badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          dotClass: 'bg-indigo-500'
        }
      case 'update':
        return {
          icon: Edit,
          badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
          dotClass: 'bg-cyan-500'
        }
      case 'password_change':
        return {
          icon: Key,
          badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
          dotClass: 'bg-orange-500'
        }
      case 'profile_update':
        return {
          icon: User,
          badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
          dotClass: 'bg-violet-500'
        }
      default:
        return {
          icon: Activity,
          badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
          dotClass: 'bg-gray-400'
        }
    }
  }

  // Export logs to CSV
  const handleExportCsv = () => {
    if (!logs.length) {
      toast.error('No logs available to export')
      return
    }

    const headers = [
      'Timestamp',
      'Action',
      'Actor Name',
      'Actor Role',
      'Actor Department',
      'Activity Message',
      'Target Name',
      'Target Username',
      'Target Role',
      'IP Address'
    ]

    const rows = logs.map((l) => [
      l.timestamp ? new Date(l.timestamp).toISOString() : '',
      l.data?.action || '',
      l.data?.user || 'System',
      l.data?.role || 'N/A',
      l.data?.department || 'N/A',
      l.message || '',
      l.data?.details?.targetName || '',
      l.data?.details?.targetUsername || '',
      l.data?.details?.targetRole || '',
      formatIp(l.data?.ipAddress || l.ipAddress) || '127.0.0.1 (Localhost)'
    ])

    const csvContent = serializeCsv([headers, ...rows])
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Audit logs exported successfully')
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterRole('All')
    setFilterDepartment('All')
    setFilterAction('All')
    setStartDate('')
    setEndDate('')
  }

  const isFiltered =
    filterRole !== 'All' ||
    filterDepartment !== 'All' ||
    filterAction !== 'All' ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(searchQuery)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-green-600" />
            Audit & Activity Logs
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time tracking of staff management, logins, permissions, and reimbursement workflows
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExportCsv()}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-gray-500" />
            Export CSV
          </button>

          <button
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Audit Logs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{logStats.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Persisted in database</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Auth Events</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{logStats.authCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Logins & logouts on page</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Staff Operations</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{logStats.adminOpsCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Create, update, activate, delete</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Form Decisions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{logStats.formOpsCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Approvals & disbursements</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search user, target, or activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select
              aria-label="Filter Action"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <select
            aria-label="Filter Role"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="All">All Roles</option>
            {allRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            aria-label="Filter Department"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="All">All Departments</option>
            {allDepartments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range & Reset Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-500 font-medium">Date Range:</span>
            <input
              type="date"
              aria-label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              aria-label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>

          {isFiltered && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium underline cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
              <tr>
                <th className="px-5 py-3.5 w-44">Time</th>
                <th className="px-5 py-3.5 w-48">Actor (Who)</th>
                <th className="px-5 py-3.5 w-36">Action</th>
                <th className="px-5 py-3.5">Activity & Target Details</th>
                <th className="px-4 py-3.5 w-20 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-green-600 mb-2" />
                    Loading activity logs...
                  </td>
                </tr>
              ) : displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <Shield className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="font-medium text-gray-800">No activity logs found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isFiltered ? 'Try clearing or adjusting filters' : 'Logs will appear as users perform actions'}
                    </p>
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log, idx) => {
                  const logId = log.id || `log-${idx}`
                  const action = log.data?.action || 'unknown'
                  const config = getActionConfig(action)
                  const ActionIcon = config.icon
                  const details = log.data?.details || {}
                  const targetName = details.targetName || details.username
                  const isExpanded = expandedLogId === logId

                  return (
                    <tr
                      key={logId}
                      className={`hover:bg-gray-50 transition-colors ${
                        isExpanded ? 'bg-green-50/40' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 align-top whitespace-nowrap">
                        <div className="font-mono text-xs text-gray-700 font-medium">
                          {formatTime(log.timestamp)}
                        </div>
                      </td>

                      {/* Actor (Who) */}
                      <td className="px-5 py-3.5 align-top">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                            {(log.data?.user || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {log.data?.user || 'System'}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {log.data?.role && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                  {log.data.role}
                                </span>
                              )}
                              {log.data?.department && (
                                <span className="text-[11px] text-gray-500 truncate max-w-[110px]" title={log.data.department}>
                                  {log.data.department}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="px-5 py-3.5 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.badgeClass}`}
                        >
                          <ActionIcon className="w-3.5 h-3.5" />
                          <span className="capitalize">{action.replace('_', ' ')}</span>
                        </span>
                      </td>

                      {/* Activity & Target Details */}
                      <td className="px-5 py-3.5 align-top">
                        <div className="font-medium text-gray-900 leading-relaxed">
                          {log.message}
                        </div>

                        {/* Structured Tags / Details */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {targetName && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                              Target: <span className="font-bold">{targetName}</span>
                              {details.targetRole && ` (${details.targetRole})`}
                            </span>
                          )}

                          {details.actionType && (
                            <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium capitalize">
                              Type: {details.actionType.replace('_', ' ')}
                            </span>
                          )}

                          {log.data?.formId && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                              Form ID: <span className="font-mono">{log.data.formId}</span>
                            </span>
                          )}

                          {formatIp(log.data?.ipAddress || log.ipAddress) && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                              <Globe className="w-3 h-3 text-gray-400" />
                              IP: {formatIp(log.data?.ipAddress || log.ipAddress)}
                            </span>
                          )}
                        </div>

                        {/* Inline Detail Accordion if expanded */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto"
                            >
                              <div className="text-gray-400 font-bold mb-1 border-b border-gray-700 pb-1">
                                Technical Audit Metadata:
                              </div>
                              <pre className="whitespace-pre-wrap text-[11px] text-green-400">
                                {JSON.stringify(
                                  {
                                    timestamp: log.timestamp,
                                    action: log.data?.action,
                                    actor: {
                                      id: log.data?.userId,
                                      name: log.data?.user,
                                      role: log.data?.role,
                                      department: log.data?.department
                                    },
                                    details: log.data?.details,
                                    ipAddress: log.data?.ipAddress || log.ipAddress,
                                    userAgent: log.data?.userAgent
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>

                      {/* Expand / Inspect Action */}
                      <td className="px-4 py-3.5 align-top text-center">
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : logId)}
                          title={isExpanded ? 'Collapse details' : 'Inspect raw details'}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              pageSize={pagination.limit}
              noun="audit logs"
              busy={loading}
              onPageChange={(p) => fetchLogs(p)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminLogs

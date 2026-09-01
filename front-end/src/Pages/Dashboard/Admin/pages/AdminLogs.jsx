import React, { useEffect, useState, useCallback } from 'react'
import { adminAPI } from '../../../../services/api'
import { RefreshCw, Activity, Filter, Calendar, Shield, Search } from 'lucide-react'

const POLL_INTERVAL = 8000

const ACTION_OPTIONS = [
  'All',
  'login',
  'login_failed',
  'logout',
  'submit',
  'approve',
  'reject',
  'reimburse',
  'update',
  'delete',
  'upload',
  'profile_update',
  'password_change',
  'error'
]

const getRoleBadge = (role) => {
  const r = (role || '').toLowerCase()
  if (r.includes('principal')) return 'bg-purple-50 text-purple-700 border-purple-200'
  if (r.includes('hod')) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (r.includes('accounts')) return 'bg-teal-50 text-teal-700 border-teal-200'
  if (r.includes('coordinator')) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (r.includes('faculty')) return 'bg-indigo-50 text-indigo-700 border-indigo-200'
  if (r.includes('student')) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

const getActionBadge = (action) => {
  const colors = {
    login: 'bg-blue-100 text-blue-700',
    login_failed: 'bg-yellow-100 text-yellow-700',
    logout: 'bg-slate-100 text-slate-600',
    submit: 'bg-indigo-100 text-indigo-700',
    approve: 'bg-green-100 text-green-700',
    reject: 'bg-red-100 text-red-700',
    reimburse: 'bg-emerald-100 text-emerald-700',
    update: 'bg-amber-100 text-amber-700',
    delete: 'bg-rose-100 text-rose-700',
    error: 'bg-red-200 text-red-800',
    profile_update: 'bg-purple-100 text-purple-700',
    password_change: 'bg-orange-100 text-orange-700',
    upload: 'bg-cyan-100 text-cyan-700'
  }
  return colors[action] || 'bg-gray-100 text-gray-600'
}

const AdminLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 100, totalPages: 1 })
  
  // Filtering state
  const [filterRole, setFilterRole] = useState('All')
  const [filterDepartment, setFilterDepartment] = useState('All')
  const [filterAction, setFilterAction] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [allRoles, setAllRoles] = useState([])
  const [allDepartments, setAllDepartments] = useState([])

  const fetchLogs = useCallback(async (page = 1) => {
    try {
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
      setError('Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }, [filterRole, filterDepartment, filterAction, startDate, endDate])

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchLogs()
    const interval = setInterval(() => fetchLogs(pagination.page), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchLogs, pagination.page])

  const formatTime = (ts) => {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    })
  }

  useEffect(() => {
    if (!logs || logs.length === 0) return

    setAllRoles((prev) => {
      const next = new Set(prev)
      logs.forEach((l) => {
        const role = l?.role || l?.data?.role
        if (role) next.add(role)
      })
      return Array.from(next)
    })

    setAllDepartments((prev) => {
      const next = new Set(prev)
      logs.forEach((l) => {
        const dept = l?.department || l?.data?.department
        if (dept) next.add(dept)
      })
      return Array.from(next)
    })
  }, [logs])

  const uniqueRoles = ['All', ...allRoles]
  const uniqueDepartments = ['All', ...allDepartments]

  const filteredLogs = logs.filter(l => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const msg = (l.message || '').toLowerCase()
    const user = (l.userName || l.data?.user || '').toLowerCase()
    const formId = (l.formId || l.data?.formId || '').toLowerCase()
    const dept = (l.department || l.data?.department || '').toLowerCase()
    const action = (l.action || l.data?.action || '').toLowerCase()
    return msg.includes(q) || user.includes(q) || formId.includes(q) || dept.includes(q) || action.includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#3B945E]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">System Audit Trail</h1>
              <p className="text-xs text-slate-500">Live operational & security logs across all college departments ({pagination.total || logs.length} total logs)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-[#3B945E] animate-pulse"></span>
            Live Auto-Refresh ({POLL_INTERVAL / 1000}s)
          </div>
          <button
            onClick={() => fetchLogs(pagination.page)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B945E] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#2e744a] transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action or Form ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B945E]/20 bg-slate-50/50"
            />
          </div>

          {/* Date & Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-xs outline-none text-slate-600"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-xs outline-none text-slate-600"
              />
            </div>

            <select 
              value={filterRole} 
              onChange={e => setFilterRole(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#3B945E]/20"
            >
              {uniqueRoles.map(r => (
                <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>
              ))}
            </select>
            
            <select 
              value={filterDepartment} 
              onChange={e => setFilterDepartment(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#3B945E]/20"
            >
              {uniqueDepartments.map(d => (
                <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
              ))}
            </select>

            <select 
              value={filterAction} 
              onChange={e => setFilterAction(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#3B945E]/20"
            >
              {ACTION_OPTIONS.map(a => (
                <option key={a} value={a}>
                  {a === 'All' ? 'All Actions' : a.charAt(0).toUpperCase() + a.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Table */}
        {loading && logs.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-400">Loading audit records...</div>
        ) : error && logs.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-rose-500">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-100 max-h-[60vh]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-44">Timestamp</th>
                    <th className="py-3 px-4 w-52">Actor / User</th>
                    <th className="py-3 px-4 w-28">Action</th>
                    <th className="py-3 px-4">Event Description</th>
                    <th className="py-3 px-4 w-36">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((l, idx) => {
                      const actor = l.userName || l.data?.user || 'System'
                      const role = l.role || l.data?.role
                      const action = l.action || l.data?.action
                      const formId = l.formId || l.data?.formId
                      const dept = l.department || l.data?.department || 'Institution-wide'

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap align-top">
                            {formatTime(l.timestamp)}
                          </td>
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-slate-800">{actor}</div>
                            {role && (
                              <span className={`inline-block mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${getRoleBadge(role)}`}>
                                {role}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top">
                            {action && (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${getActionBadge(action)}`}>
                                {action}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top">
                            <div className="font-medium text-slate-900">{l.message}</div>
                            {formId && (
                              <div className="mt-0.5 font-mono text-[10px] text-[#3B945E]">
                                Form: {formId}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 align-top">
                            {dept}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        No matching activity logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 text-xs text-slate-600 border-t border-slate-100">
                <span>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total logs)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchLogs(pagination.page - 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchLogs(pagination.page + 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AdminLogs

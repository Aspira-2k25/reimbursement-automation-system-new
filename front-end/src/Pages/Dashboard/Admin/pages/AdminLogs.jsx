import React, { useEffect, useState, useCallback } from 'react'
import { adminAPI } from '../../../../services/api'
import { RefreshCw } from 'lucide-react'

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

const AdminLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
      setError('Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [filterRole, filterDepartment, filterAction, startDate, endDate])

  // Initial fetch + polling
  useEffect(() => {
    fetchLogs()
    const interval = setInterval(() => fetchLogs(), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchLogs])

  // Format timestamp to readable form
  const formatTime = (ts) => {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    })
  }

  const formatDetails = (data) => {
    if (!data) return ''
    const parts = []
    if (data.user) parts.push(data.user)
    if (data.role) parts.push(`(${data.role})`)
    if (data.department) parts.push(`• ${data.department}`)
    if (data.formId) parts.push(`• Form: ${data.formId}`)
    return parts.join(' ')
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

  const uniqueRoles = ['All', ...allRoles]
  const uniqueDepartments = ['All', ...allDepartments]

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Activity Logs</h2>
        <div className="flex items-center gap-3">
          {pagination.total > 0 && (
            <span className="text-xs text-gray-500">
              {pagination.total} total logs
            </span>
          )}
          <button
            onClick={() => fetchLogs()}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="text-sm text-gray-500 flex-1">
          Real-time activity monitoring (auto-refreshes every {POLL_INTERVAL / 1000}s). Logs are persisted in the database.
        </div>
        
        <div className="flex flex-wrap gap-2">
          <input 
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
          <span className="text-gray-400 self-center">-</span>
          <input 
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />

          <select 
            value={filterRole} 
            onChange={e => setFilterRole(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {uniqueRoles.map(r => (
              <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>
            ))}
          </select>
          
          <select 
            value={filterDepartment} 
            onChange={e => setFilterDepartment(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {uniqueDepartments.map(d => (
              <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
            ))}
          </select>

          <select 
            value={filterAction} 
            onChange={e => setFilterAction(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {ACTION_OPTIONS.map(a => (
              <option key={a} value={a}>
                {a === 'All' ? 'All Actions' : a.charAt(0).toUpperCase() + a.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Loading logs...</div>
      ) : error && logs.length === 0 ? (
        <div className="p-8 text-center text-red-500">{error}</div>
      ) : (
        <>
          <div className="overflow-auto max-h-[65vh] border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2.5 text-left w-52">Timestamp</th>
                  <th className="p-2.5 text-left w-28">Action</th>
                  <th className="p-2.5 text-left">Activity</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((l, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-gray-50 border-b border-gray-100">
                      <td className="p-2.5 align-top font-mono text-xs text-gray-600 whitespace-nowrap">
                        {formatTime(l.timestamp)}
                      </td>
                      <td className="p-2.5 align-top">
                        {l.data?.action && (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getActionBadge(l.data.action)}`}>
                            {l.data.action}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 align-top">
                        <div className="font-medium text-gray-900">{l.message}</div>
                        {l.data && (
                          <div className="text-xs text-gray-500 mt-0.5">{formatDetails(l.data)}</div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-gray-500">
                      No activity logs yet. Logs will appear as users interact with the portal.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
                  className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchLogs(pagination.page + 1)}
                  className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminLogs

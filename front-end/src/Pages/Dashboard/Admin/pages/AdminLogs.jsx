import React, { useEffect, useState, useCallback } from 'react'
import { adminAPI } from '../../../../services/api'
import { RefreshCw } from 'lucide-react'

const POLL_INTERVAL = 5000

const AdminLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filtering state
  const [filterRole, setFilterRole] = useState('All')
  const [filterDepartment, setFilterDepartment] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [allRoles, setAllRoles] = useState([])
  const [allDepartments, setAllDepartments] = useState([])

  const fetchLogs = useCallback(async () => {
    try {
      const params = {
        role: filterRole,
        department: filterDepartment,
        startDate,
        endDate,
        limit: 200,
        page: 1
      }
      const res = await adminAPI.getLogs(params)
      setLogs(res.logs || [])
      setError(null)
    } catch (err) {
      console.error('Failed to load logs', err)
      setError('Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [filterRole, filterDepartment, startDate, endDate])

  // Initial fetch + polling
  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, POLL_INTERVAL)
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
    if (data.formId) parts.push(`• Form ID: ${data.formId}`)
    return parts.join(' ')
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
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="text-sm text-gray-500 flex-1">
          Showing activities performed by all users (auto-refreshes every {POLL_INTERVAL / 1000}s).
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
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Loading logs...</div>
      ) : error && logs.length === 0 ? (
        <div className="p-8 text-center text-red-500">{error}</div>
      ) : (
        <div className="overflow-auto max-h-[65vh] border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2.5 text-left w-52">Timestamp</th>
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
                      <div className="font-medium text-gray-900">{l.message}</div>
                      {l.data && (
                        <div className="text-xs text-gray-500 mt-0.5">{formatDetails(l.data)}</div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-gray-500">
                    No activity logs yet. Logs will appear as users interact with the portal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminLogs

import React, { useEffect, useState, useCallback } from 'react'
import { adminAPI } from '../../../../services/api'
import { RefreshCw } from 'lucide-react'

const POLL_INTERVAL = 5000

const AdminLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await adminAPI.getLogs()
      setLogs(res.logs || [])
      setError(null)
    } catch (err) {
      console.error('Failed to load logs', err)
      setError('Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [])

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

  // Format log data into a readable line
  const formatDetails = (data) => {
    if (!data) return ''
    const parts = []
    if (data.user) parts.push(data.user)
    if (data.role) parts.push(`(${data.role})`)
    if (data.department) parts.push(`• ${data.department}`)
    return parts.join(' ')
  }

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
      <div className="text-sm text-gray-500 mb-4">
        Showing activities performed by all users (auto-refreshes every {POLL_INTERVAL / 1000}s).
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

import React, { useEffect, useState, useRef } from 'react'
import { adminAPI } from '../../../../services/api'
import { io } from 'socket.io-client'
import { useAuth } from '../../../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const AdminLogs = () => {
  const [logs, setLogs] = useState([])
  const listRef = useRef(null)
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        const res = await adminAPI.getLogs()
        if (mounted) setLogs(res.logs || [])
      } catch (err) {
        console.error('Failed to load logs', err)
      }

      // connect socket (no auth required for testing)
      const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '')
      const socket = io(base, { withCredentials: true })

      socket.on('connect', () => {
        console.log('Connected to logs socket')
      })

      socket.on('log', (entry) => {
        setLogs(prev => [entry, ...prev])
      })

      socket.on('disconnect', () => {
        console.log('Logs socket disconnected')
      })

      // store socket ref for cleanup
      listRef.current = socket
    }

    init()

    return () => {
      mounted = false
      if (listRef.current && typeof listRef.current.disconnect === 'function') {
        listRef.current.disconnect()
      }
    }
  }, [])

  const handleLoginRedirect = () => {
    navigate('/login')
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold mb-3">Real-time Server Logs</h2>
      <div className="text-sm text-gray-500 mb-4">Showing live logs from all dashboards with exact timestamps.</div>

      <div ref={listRef} className="overflow-auto max-h-[65vh] border rounded">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-2 text-left w-40">Timestamp</th>
              <th className="p-2 text-left w-20">Level</th>
              <th className="p-2 text-left">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, idx) => (
              <tr key={idx} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 align-top font-mono text-xs text-gray-700">{l.timestamp}</td>
                <td className="p-2 align-top font-semibold">{l.level}</td>
                <td className="p-2 align-top whitespace-pre-wrap">{l.message}{l.data ? `\n${JSON.stringify(l.data)}` : ''}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">No logs available</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )
    </div>
  )
}

export default AdminLogs

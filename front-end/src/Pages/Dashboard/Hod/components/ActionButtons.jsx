import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, Check, X, MoreHorizontal, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

/**
 * ActionButtons Component
 * Provides action buttons for request management (View, Approve, Reject)
 * Supports multiple variants: default, compact, and dropdown
 * @param {Object} request - The request object
 * @param {Function} onView - Callback for view action
 * @param {Function} onApprove - Callback for approve action
 * @param {Function} onReject - Callback for reject action
 * @param {string} variant - Button variant ('default', 'compact', 'dropdown')
 * @param {boolean} isLoading - Loading state for buttons
 */
const ActionButtons = ({ request, onView, onApprove, onReject, variant = 'default', isLoading = false }) => {
  const [actionLoading, setActionLoading] = useState(false)

  /**
   * Handle view action - shows request details
   */
  const handleView = () => {
    if (onView) {
      onView(request)
    } else {
      toast.info(`Viewing details for request ${request.id}`)
    }
  }

  /**
   * Handle approve action with loading state
   */
  const handleApprove = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    
    console.log('Approve button clicked:', {
      requestId: request.id,
      _id: request._id,
      applicationId: request.applicationId,
      status: request.status,
      applicantType: request.applicantType
    })
    
    setActionLoading(true)
    try {
      if (onApprove) {
        console.log('Calling onApprove handler with request:', request)
        await onApprove(request)
      } else {
        console.warn('No onApprove handler provided')
        toast.error('Approve handler not configured')
      }
    } catch (error) {
      console.error('Error in handleApprove:', error)
      toast.error(error?.message || 'Failed to approve request')
    } finally {
      setActionLoading(false)
    }
  }

  /**
   * Handle reject action
   */
  const handleReject = (e) => {
    e.stopPropagation()
    if (onReject) {
      onReject(request)
    } else {
      toast.error(`Request ${request.id} rejected`)
    }
  }

  // Determine which actions to show based on status
  // CRITICAL: Backend requires exactly "Under HOD" status for HOD to approve/reject
  // Student forms backend (line 385) requires exactly "Under HOD"
  // Faculty forms backend is more lenient but we should follow the same rule
  const status = String(request.status || '').trim()
  
  // Only show approve/reject buttons for "Under HOD" status (strict backend requirement)
  const canApprove = status === 'Under HOD'
  const canReject = status === 'Under HOD'
  
  // Debug logging
  console.log('ActionButtons - Request status check:', {
    id: request.id,
    _id: request._id,
    applicationId: request.applicationId,
    status: status,
    applicantType: request.applicantType,
    canApprove,
    canReject
  })

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        <motion.button
          onClick={handleView}
          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="View Details"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Eye className="w-4 h-4" />
        </motion.button>

        {canApprove && (
          <motion.button
            onClick={handleApprove}
            className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Approve"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Check className="w-4 h-4" />
          </motion.button>
        )}

        {canReject && (
          <motion.button
            onClick={handleReject}
            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Reject"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    )
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative group">
        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>

        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
          <div className="p-1">
            <button
              onClick={handleView}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>

            {canApprove && (
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-700 hover:bg-green-50 rounded-md"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
            )}

            {canReject && (
              <button
                onClick={handleReject}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-md"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            )}

          </div>
        </div>
      </div>
    )
  }

  // Default variant - individual buttons
  return (
    <div className="flex items-center gap-2">
      <motion.button
        onClick={handleView}
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title="View Details"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Eye className="w-4 h-4" />
        <span className="hidden sm:inline">View</span>
      </motion.button>

        {canApprove && (
          <motion.button
            onClick={handleApprove}
            disabled={actionLoading || isLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Approve Request"
            whileHover={{ scale: actionLoading || isLoading ? 1 : 1.05 }}
            whileTap={{ scale: actionLoading || isLoading ? 1 : 0.95 }}
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {actionLoading ? 'Approving...' : 'Approve'}
            </span>
          </motion.button>
        )}

      {canReject && (
        <motion.button
          onClick={handleReject}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          title="Reject Request"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Reject</span>
        </motion.button>
      )}
    </div>
  )
}

export default ActionButtons
import React from 'react'
import { Check, Clock, X, AlertCircle, FileText } from 'lucide-react'

/**
 * StatusPill Component
 * Displays status with appropriate color, icon, and styling
 * @param {string} status - The status to display
 * @param {string} size - Size variant ('xs', 'sm', 'md', 'lg')
 */
const StatusPill = ({ status, size = 'sm' }) => {
  /**
   * Get status configuration (color, icon, label) based on status
   */
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Pending':
        return {
          color: 'bg-orange-100 text-orange-800',
          icon: Clock,
          label: 'Pending'
        }
      case 'Approved':
        return {
          color: 'bg-green-100 text-green-800',
          icon: Check,
          label: 'Approved'
        }
      case 'Rejected':
        return {
          color: 'bg-red-100 text-red-800',
          icon: X,
          label: 'Rejected'
        }
      case 'Under Principal':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: FileText,
          label: 'Under Principal'
        }
      case 'Processing':
        return {
          color: 'bg-purple-100 text-purple-800',
          icon: AlertCircle,
          label: 'Processing'
        }
      case 'Under HOD':
        return {
          color: 'bg-indigo-100 text-indigo-800',
          icon: FileText,
          label: 'Under HOD'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: AlertCircle,
          label: status
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-sm'
  }

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4 h-4'
  }

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full font-medium
      ${config.color}
      ${sizeClasses[size]}
    `}>
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
    </span>
  )
}

export default StatusPill
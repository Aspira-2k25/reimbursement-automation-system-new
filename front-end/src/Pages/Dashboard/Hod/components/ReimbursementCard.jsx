import React from 'react'
import { ArrowRight, IndianRupee } from 'lucide-react'

/**
 * ReimbursementCard Component
 * Displays reimbursement option cards with interactive features
 * @param {Object} option - Reimbursement option data
 * @param {Function} onClick - Click handler callback
 * @param {boolean} isSelected - Whether the card is selected
 * @param {boolean} disabled - Whether the card is disabled
 */
const ReimbursementCard = ({ 
  option, 
  onClick,
  isSelected = false,
  disabled = false 
}) => {
  /**
   * Handle card click with disabled state check
   */
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(option)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full p-6 rounded-lg border-2 text-left transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
        }
        ${disabled 
          ? 'opacity-50 cursor-not-allowed transform-none hover:scale-100' 
          : 'cursor-pointer'
        }
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{option.icon}</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{option.description}</p>
          </div>
        </div>
        <ArrowRight className={`w-5 h-5 transition-colors ${
          isSelected ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
        }`} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 text-sm font-medium text-green-600">
          <IndianRupee className="w-4 h-4" />
          <span>Avg: {option.avgAmount}</span>
        </div>
        {option.deadline && (
          <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
            Deadline: {option.deadline}
          </div>
        )}
      </div>

      {option.categories && option.categories.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-700">Available Categories:</div>
          <div className="flex flex-wrap gap-1">
            {option.categories.slice(0, 3).map((category, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
              >
                {category}
              </span>
            ))}
            {option.categories.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                +{option.categories.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {option.requirements && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-700 mb-1">Requirements:</div>
          <div className="text-xs text-gray-600">
            {Array.isArray(option.requirements) 
              ? option.requirements.join(', ')
              : option.requirements
            }
          </div>
        </div>
      )}

      {option.processingTime && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Processing time: {option.processingTime}</span>
        </div>
      )}
    </button>
  )
}

export default ReimbursementCard

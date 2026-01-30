import React from 'react'
import { motion } from 'framer-motion'

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'amber', onClick }) => {
  // Color configurations for amber theme
  const colorConfig = {
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
      titleColor: 'text-gray-700',
      subtitleColor: 'text-gray-500',
      hoverBg: 'hover:from-amber-100 hover:to-orange-100'
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-green-700',
      titleColor: 'text-gray-700',
      subtitleColor: 'text-gray-500',
      hoverBg: 'hover:from-green-100 hover:to-emerald-100'
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-700',
      titleColor: 'text-gray-700',
      subtitleColor: 'text-gray-500',
      hoverBg: 'hover:from-blue-100 hover:to-indigo-100'
    }
  }

  const colors = colorConfig[color] || colorConfig.amber

  return (
    <motion.div
      className={`
        relative p-5 rounded-xl border shadow-sm cursor-pointer transition-all duration-300
        ${colors.bg} ${colors.border} ${colors.hoverBg}
      `}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${colors.titleColor}`}>{title}</p>
          <p className={`text-2xl font-bold mt-1 ${colors.valueColor}`}>{value}</p>
          {subtitle && (
            <p className={`text-xs mt-1 ${colors.subtitleColor}`}>{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-lg ${colors.iconBg}`}>
            <Icon className={`w-5 h-5 ${colors.iconColor}`} />
          </div>
        )}
      </div>

      {/* Decorative element */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-xl bg-gradient-to-r from-amber-400 to-orange-400 opacity-50`}
      />
    </motion.div>
  )
}

export default StatCard

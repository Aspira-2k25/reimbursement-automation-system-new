import React from "react"
import { motion } from "framer-motion"

export default function StatCard({ title, value, icon: Icon, color = 'teal', subtitle, onClick }) {
  const colorClasses = {
    teal: "text-white",
    blue: "text-white",
    orange: "text-white",
    green: "text-white",
    red: "text-white",
  }

  const CardContent = () => (
    <motion.div
      className="bg-white rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300"
      style={{ border: '1px solid var(--color-light-teal)' }}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--color-dark-gray)' }}>{title}</p>
          <div className="flex items-center gap-2 mt-1 sm:mt-2">
            <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-dark-gray)' }}>{value}</p>
          </div>
          <p className="text-xs sm:text-sm mt-1 truncate" style={{ color: 'var(--color-dark-gray)' }}>{subtitle}</p>
        </div>
        {Icon && (
          <motion.div
            className={`p-2 sm:p-3 rounded-full ${colorClasses[color] || colorClasses.teal} flex-shrink-0 ml-2 sm:ml-3`}
            style={{ backgroundColor: 'var(--color-medium-teal)' }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </motion.div>
        )}
      </div>
    </motion.div>
  )

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left focus:outline-none focus:ring-2 focus:ring-[#57BA98] focus:ring-offset-2 rounded-lg">
        <CardContent />
      </button>
    )
  }

  return <CardContent />
}

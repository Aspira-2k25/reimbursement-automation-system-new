import React from 'react'
import { motion } from 'framer-motion'
import { useAdminContext } from '../pages/AdminLayout'
import { Menu } from 'lucide-react'

const Header = ({ isCollapsed, setIsCollapsed }) => {
  // admin dashboard requires authenticated user with Admin role (checked at router level)

  return (
    <motion.div
      className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Removed notifications bell as requested */}
      </div>
    </motion.div>
  )
}

export default Header

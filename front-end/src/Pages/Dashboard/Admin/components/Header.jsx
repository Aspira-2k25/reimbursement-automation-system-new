import React from 'react'
import { motion } from 'framer-motion'
import { useAdminContext } from '../pages/AdminLayout'
import { Menu, Bell } from 'lucide-react'
import apshahLogo from '../../../../assets/images/Apshah_logo.png'
import websiteLogo from '../../../../assets/images/Website_logo.png'

const Header = ({ isCollapsed, setIsCollapsed }) => {
  // admin dashboard requires authenticated user with Admin role (checked at router level)

  return (
    <motion.div
      className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* College Logo */}
          <div className="flex items-center gap-3 pr-0 sm:pr-4 border-r-0 sm:border-r border-gray-200">
            <img
              src={apshahLogo}
              alt="A.P. Shah Logo"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-sm object-contain drop-shadow-sm"
            />
            <span className="font-bold text-xs sm:text-sm tracking-wide max-w-[200px] leading-tight hidden lg:block text-gray-900">
              PCT's A. P. Shah Institute of Technology
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 hidden sm:block">Admin</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">


        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </motion.button>

      </div>
    </motion.div>
  )
}

export default Header

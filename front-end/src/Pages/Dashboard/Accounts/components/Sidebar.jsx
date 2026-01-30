import React, { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Home,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  User
} from 'lucide-react'

const Sidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, userProfile }) => {
  const [hoveredItem, setHoveredItem] = useState(null)

  const menuItems = [
    { id: 'home', label: 'Disbursement Dashboard', icon: Home },
    { id: 'profile', label: 'Profile Settings', icon: Settings }
  ]

  const handleTabClick = useCallback((tabId) => {
    setActiveTab(tabId)
  }, [setActiveTab])

  const handleMouseEnter = useCallback((itemId) => {
    setHoveredItem(itemId)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null)
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [setIsCollapsed])

  return (
    <motion.div
      className="bg-white border-r border-gray-200 flex flex-col shadow-sm"
      initial={false}
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Header with Logo and Toggle */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-10 h-10 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-inner">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-slate-900 tracking-tight">Accounts Portal</span>
                  <span className="text-xs text-slate-500">Disbursement System</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-gray-200">
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.div
              key="collapsed"
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {userProfile?.fullName ? userProfile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'AC'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {userProfile?.fullName && (
                  <div className="text-sm font-medium text-gray-900 truncate">{userProfile.fullName}</div>
                )}
                {userProfile?.designation && (
                  <div className="text-xs text-gray-500 truncate">{userProfile.designation}</div>
                )}
                {userProfile?.department && (
                  <div className="text-xs text-amber-600 truncate">{userProfile.department}</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          const isHovered = hoveredItem === item.id

          return (
            <motion.button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${isActive
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200'
                  : isHovered
                    ? 'bg-gray-50 text-gray-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : 'text-gray-500'}`} />

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    className="text-sm font-medium truncate"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip when collapsed */}
              {isCollapsed && isHovered && (
                <motion.div
                  className="absolute left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                >
                  {item.label}
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="text-xs text-gray-400 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div>Reimbursement Portal</div>
              <div className="mt-1">Accounts Department</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default Sidebar

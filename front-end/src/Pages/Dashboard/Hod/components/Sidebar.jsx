import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  BarChart3,
  Users,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building,
  User,
  Eye
} from 'lucide-react'

const Sidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, userProfile }) => {
  const [hoveredItem, setHoveredItem] = useState(null)

  const menuItems = [
    { id: 'home', label: 'Home Dashboard', icon: Home },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'apply', label: 'Apply Reimbursement', icon: FileText },
    { id: 'request-status', label: 'Request Status', icon: Building },
    { id: 'all-departments', label: 'ALL Department\nOverview', icon: Eye },
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
      className="bg-white border-r border-gray-200 flex flex-col shadow-sm h-screen"
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner" style={{ background: 'linear-gradient(135deg, var(--color-medium-teal), var(--color-light-teal), var(--color-dark-green))' }}>
                  <div className="w-5 h-5 bg-white rounded-md opacity-95"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-slate-900 tracking-tight">Reimbursement Portal</span>
                  <span className="sr-only">Navigation</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#65CCB8]"
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
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-medium-teal), var(--color-light-teal))' }}>
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
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-medium-teal), var(--color-light-teal))' }}>
                <span className="text-white text-sm font-medium">
                  {userProfile?.fullName ? userProfile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'U'}
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
                  <div className="text-xs text-[#3B945E] truncate">{userProfile.department}</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const isHovered = hoveredItem === item.id

            return (
              <li key={item.id}>
                <button
                  onClick={() => handleTabClick(item.id)}
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onMouseLeave={handleMouseLeave}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                    transition-all duration-200 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-[#65CCB8] focus:ring-offset-2
                    ${isActive
                      ? 'bg-[#65CCB8]/20 text-[#2d7048] border border-[#65CCB8] shadow-sm'
                      : isHovered
                        ? 'bg-gray-50 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`
                    w-5 h-5 flex-shrink-0 transition-colors duration-200
                    ${isActive ? 'text-[#3B945E]' : 'text-gray-500'}
                  `} />

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        className="text-sm font-medium leading-tight"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.label.split('\n').map((line, index) => (
                          <span key={index}>
                            {line}
                            {index < item.label.split('\n').length - 1 && <br />}
                          </span>
                        ))}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Active indicator removed per design */}
                </button>

                {/* Tooltip for collapsed state */}
                <AnimatePresence>
                  {isCollapsed && isHovered && (
                    <motion.div
                      className="fixed left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50 pointer-events-none"
                      initial={{ opacity: 0, x: -10, scale: 0.8 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -10, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label.replace('\n', ' ')}
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer removed per design */}
    </motion.div>
  )
}

export default Sidebar
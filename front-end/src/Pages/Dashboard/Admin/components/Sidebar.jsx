import React from 'react'
import { motion } from 'framer-motion'
import { useAdminContext } from '../pages/AdminLayout'
import {
  LayoutGrid,
  Users,
  Settings,
  Terminal,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../context/AuthContext'

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { activeTab, setActiveTab } = useAdminContext()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutGrid }
    , { id: 'logs', label: 'Logs', icon: Terminal }
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-green-700 text-white flex flex-col h-screen overflow-y-auto"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-green-600">
        {!isCollapsed && (
          <h1 className="text-xl font-bold">Admin Panel</h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-green-600 rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-green-600 font-semibold'
                  : 'hover:bg-green-600'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-green-600">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-green-600 transition-colors"
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.div>
  )
}

export default Sidebar

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
  LogOut,
  KeyRound
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../context/AuthContext'

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { activeTab, setActiveTab } = useAdminContext()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutGrid }
    , { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'change-password', label: 'Change Password', icon: KeyRound }
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
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
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all 
                ${activeTab === item.id
                  ? 'bg-[#65CCB8]/20 text-[#3B945E] border border-[#65CCB8] shadow-sm font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-[#3B945E]' : 'text-gray-500'}`} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
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

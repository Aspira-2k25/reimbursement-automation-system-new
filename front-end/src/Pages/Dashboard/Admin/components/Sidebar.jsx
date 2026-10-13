
import { useAdminContext } from '../pages/AdminLayout'
import { LayoutGrid, Terminal, ChevronLeft, ChevronRight, LogOut, KeyRound, Sliders } from "lucide-react";
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../context/AuthContext'

import websiteLogo from '../../../../assets/images/Website_logo.png'

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { activeTab, setActiveTab } = useAdminContext()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutGrid },
    { id: 'portals', label: 'Portal Controls', icon: Sliders },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'change-password', label: 'Change Password', icon: KeyRound }
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto" style={{ width: isCollapsed ? 80 : 280, transition: 'width 0.3s ease-in-out' }}>
      {/* Header with Logo */}
      <div className={`p-4 border-b border-gray-200 flex items-center ${isCollapsed ? 'flex-col gap-2 justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner overflow-hidden p-1 bg-white border border-gray-100 flex-shrink-0">
            <img src={websiteLogo} alt="Admin Portal Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold text-gray-900 tracking-tight">Admin Panel</span>
              <span className="text-xs text-gray-500">System Management</span>
            </div>
          )}
        </div>
        <button
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!isCollapsed}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
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
              aria-label={item.label} aria-current={activeTab === item.id ? "page" : undefined}
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
    </div>
  )
}

export default Sidebar

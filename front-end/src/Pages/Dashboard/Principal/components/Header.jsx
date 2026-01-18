import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  Calendar,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { usePrincipalContext } from '../pages/PrincipalLayout'
import { useAuth } from '../../../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const Header = ({ userProfile, currentPage = 'Dashboard' }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const {
    setActiveTab,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = usePrincipalContext()

  const notificationRef = useRef(null)
  const profileRef = useRef(null)

  const unreadCount = notifications.filter(n => n.unread).length

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = useCallback(() => {
    setShowNotifications(!showNotifications)
    setShowProfileMenu(false)
  }, [showNotifications])

  const handleProfileClick = useCallback(() => {
    setShowProfileMenu(!showProfileMenu)
    setShowNotifications(false)
  }, [showProfileMenu])

  const handleLogout = useCallback(() => {
    logout()
    toast.success('Logged out successfully')
    setShowProfileMenu(false)
    navigate('/')
  }, [logout, navigate])

  const getCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getCurrentDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <header className="px-6 py-4" style={{ backgroundColor: 'var(--color-off-white)', borderBottom: '1px solid var(--color-light-teal)' }}>
      <div className="flex items-center justify-between">
        {/* Left Section - Current Page & Time */}
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-dark-gray)' }}>{currentPage}</h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-dark-gray)' }}>
                <Calendar className="w-4 h-4" />
                <span>{getCurrentDate()}</span>
              </div>
              <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-dark-gray)' }}>
                <Clock className="w-4 h-4" />
                <span>{getCurrentTime()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Notifications & Profile */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={handleNotificationClick}
              className="relative p-2 rounded-lg transition-colors focus:outline-none focus:ring-2"
              style={{ color: 'var(--color-dark-gray)' }}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      <span className="text-xs text-gray-500">{unreadCount} unread</span>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => markNotificationAsRead(notification.id)}
                          className={`p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${notification.unread ? 'bg-green-50/50' : ''
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${notification.unread ? 'bg-green-600' : 'bg-gray-300'
                              }`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className={`text-sm font-medium ${notification.unread ? 'text-gray-900' : 'text-gray-700'
                                  }`}>
                                  {notification.title}
                                </div>
                                {notification.unread && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      markNotificationAsRead(notification.id)
                                    }}
                                    className="p-1 text-green-600 hover:text-green-700 rounded transition-colors"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">{notification.message}</div>
                              <div className="text-xs text-gray-500 mt-2">{notification.time}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-gray-200">
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="w-full text-sm text-green-600 hover:text-green-700 font-medium flex items-center justify-center gap-2"
                      >
                        <CheckCheck className="w-4 h-4" />
                        Mark all as read
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-3 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-medium-teal), var(--color-light-teal))' }}>
                <span className="text-white text-sm font-medium">
                  {userProfile?.fullName
                    ? userProfile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)
                    : 'RK'
                  }
                </span>
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium" style={{ color: 'var(--color-dark-gray)' }}>
                  {userProfile?.fullName || 'Dr. Rajesh Kumar'}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-dark-gray)' }}>
                  {userProfile?.designation || 'Principal'}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''
                }`} />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {userProfile?.fullName
                            ? userProfile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)
                            : 'RK'
                          }
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {userProfile?.fullName || 'Dr. Rajesh Kumar'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {userProfile?.email || 'No email set'}
                        </div>
                        <div className="text-xs text-blue-600 truncate">
                          {userProfile?.college || 'Engineering College'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => { setActiveTab('profile'); setShowProfileMenu(false) }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Profile Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Search, Menu, X, Clock, Calendar, ChevronDown, Settings, LogOut, FileText, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAccountsContext } from '../pages/AccountsLayout'
import { useAuth } from '../../../../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import apshahLogo from '../../../../assets/images/Apshah_logo.png'
import websiteLogo from '../../../../assets/images/Website_logo.png'

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
  } = useAccountsContext()

  const notificationRef = useRef(null)
  const profileRef = useRef(null)

  const unreadCount = notifications.filter(n => n.unread).length

  // Update time every second for real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second

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
      second: '2-digit',
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
    <header className="px-6 py-4 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between">
        {/* Left Section - College Logo & Current Page */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 pr-0 sm:pr-6 border-b sm:border-b-0 sm:border-r border-gray-200 pb-2 sm:pb-0">
            <img
              src={apshahLogo}
              alt="A.P. Shah Logo"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-sm object-contain drop-shadow-sm"
            />
            <span className="font-bold text-sm sm:text-base tracking-wide max-w-[200px] leading-tight hidden lg:block text-gray-900">
              PCT's A. P. Shah Institute of Technology
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{currentPage}</h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{getCurrentDate()}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{getCurrentTime()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Notifications & Profile */}
        <div className="flex items-center gap-4">
          {/* System Logo */}
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <img src={websiteLogo} alt="Reimbursement Portal" className="h-10 w-10 sm:h-11 sm:w-11 drop-shadow-sm object-contain" />
            <span className="font-semibold text-sm text-gray-900">
              Reimbursement Portal
            </span>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={handleNotificationClick}
              className="relative p-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#57BA98]"
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
                      notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${notification.unread ? 'bg-[#65CCB8]/20' : ''
                            }`}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${notification.unread ? 'bg-[#3B945E]' : 'bg-transparent'
                              }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 font-medium truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.time}
                              </p>
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
                        className="w-full flex items-center justify-center gap-2 text-sm text-[#3B945E] hover:text-[#57BA98] font-medium"
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#57BA98]"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#57BA98] to-[#3B945E] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {userProfile?.fullName ? userProfile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'AC'}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-900">
                  {userProfile?.fullName || 'Accounts User'}
                </div>
                <div className="text-xs text-gray-500">
                  {userProfile?.designation || 'Accounts Officer'}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-900">
                      {userProfile?.fullName || 'Accounts User'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {userProfile?.email || 'accounts@apsit.edu.in'}
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => {
                        setActiveTab('profile')
                        setShowProfileMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Profile Settings
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
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

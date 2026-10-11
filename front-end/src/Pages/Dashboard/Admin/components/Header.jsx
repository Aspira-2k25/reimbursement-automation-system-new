
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Bell, Check, CheckCheck } from 'lucide-react'
import apshahLogo from '../../../../assets/images/Apshah_logo.png'
import usePersistentNotifications from '../../../../hooks/usePersistentNotifications'

const Header = ({ isCollapsed, setIsCollapsed }) => {
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef(null)

  const {
    notifications,
    error: notificationError,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = usePersistentNotifications()

  const unreadCount = notifications.filter(n => n.unread).length

  // Handle clicking outside notifications dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
            aria-label="Open navigation"
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
        <div className="relative" ref={notificationRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(prev => !prev)}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Notifications"
            aria-expanded={showNotifications}
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </motion.button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                className="absolute right-0 mt-2 w-72 sm:w-84 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {/* Dropdown Header */}
                <div className="p-3.5 sm:p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {notificationError && (
                    <div className="p-3 text-xs text-red-700 bg-red-50">
                      {notificationError}
                      <button
                        type="button"
                        onClick={() => refreshNotifications(true)}
                        className="block underline font-semibold mt-1"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2 stroke-[1.5]" />
                      <p className="text-sm font-medium text-gray-700">No new notifications</p>
                      <p className="text-xs text-gray-400 mt-0.5">You're all caught up!</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => markNotificationAsRead(notification.id)}
                        className={`p-3.5 hover:bg-gray-50 cursor-pointer transition-colors ${
                          notification.unread ? 'bg-teal-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              notification.unread ? 'bg-teal-600' : 'bg-gray-300'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p
                                className={`text-xs sm:text-sm font-semibold truncate ${
                                  notification.unread ? 'text-gray-900' : 'text-gray-700'
                                }`}
                              >
                                {notification.title}
                              </p>
                              {notification.unread && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markNotificationAsRead(notification.id)
                                  }}
                                  className="p-0.5 text-teal-600 hover:text-teal-700 rounded transition-colors"
                                  title="Mark as read"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default Header

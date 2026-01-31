"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Bell, Check, CheckCheck } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function NotificationMenu({ notifications = [], markNotificationAsRead, markAllNotificationsAsRead }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const unreadCount = notifications.filter(n => n.unread).length

  const markAsRead = useCallback((id) => {
    if (markNotificationAsRead) {
      markNotificationAsRead(id)
    }
  }, [markNotificationAsRead])

  const markAllAsRead = useCallback(() => {
    if (markAllNotificationsAsRead) {
      markAllNotificationsAsRead()
    }
  }, [markAllNotificationsAsRead])

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={`relative p-1.5 sm:p-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#65CCB8]/60 focus:ring-offset-2 ${isOpen
            ? "text-white bg-white/20"
            : "text-white/80 hover:text-white hover:bg-white/20 active:bg-white/30"
          }`}
      >
        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-3 sm:p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-[#3B945E] hover:text-[#2d7048] active:text-[#225638] flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[#65CCB8] focus:ring-offset-2 rounded"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span className="hidden sm:inline">Mark all as read</span>
                  <span className="sm:hidden">All</span>
                </button>
              )}
            </div>
            <div className="max-h-48 sm:max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-3 sm:p-4 text-center text-gray-500 text-xs sm:text-sm">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-2.5 sm:p-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 cursor-pointer transition-colors ${notification.unread ? 'bg-[#65CCB8]/20' : ''
                      }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm font-medium ${notification.unread ? 'text-gray-900' : 'text-gray-700'} leading-relaxed`}>
                          {notification.title || 'Notification'}
                        </p>
                        <p className={`text-xs sm:text-sm ${notification.unread ? 'text-gray-800' : 'text-gray-600'} mt-1`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time || 'Just now'}</p>
                      </div>
                      {notification.unread && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          className="ml-2 p-1 text-[#3B945E] hover:text-[#2d7048] active:text-[#225638] flex-shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-[#65CCB8] focus:ring-offset-2 rounded"
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

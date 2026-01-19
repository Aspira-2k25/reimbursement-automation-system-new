import React from "react"
import { Bell, Check, CheckCheck } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useNotificationContext } from "../NotificationContext"

/**
 * NotificationMenu Component
 * Displays notification bell with unread count and dropdown menu
 */
export default function NotificationMenu() {
  // State for notification menu visibility
  const [open, setOpen] = React.useState(false)
  const dropdownRef = React.useRef(null)
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useNotificationContext()

  // Calculate unread notifications count - memoized to prevent unnecessary recalculations
  const unreadCount = React.useMemo(() =>
    notifications.filter(n => n.unread).length,
    [notifications]
  )

  /**
   * Toggle notification menu visibility
   */
  const toggleMenu = React.useCallback(() => {
    setOpen(prev => !prev)
  }, [])

  /**
   * Close notification menu
   */
  const closeMenu = React.useCallback(() => {
    setOpen(false)
  }, [])

  /**
   * Mark a specific notification as read
   * @param {number} notificationId - ID of the notification to mark as read
   */
  const markAsRead = React.useCallback((notificationId) => {
    markNotificationAsRead(notificationId)
  }, [markNotificationAsRead])

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = React.useCallback(() => {
    markAllNotificationsAsRead()
  }, [markAllNotificationsAsRead])

  // Handle outside click to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeMenu()
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open, closeMenu])

  // Handle escape key to close dropdown
  React.useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && open) {
        closeMenu()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, closeMenu])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification bell button */}
      <button
        onClick={toggleMenu}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleMenu()
          }
        }}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative p-2 rounded-xl hover:bg-white/20 active:bg-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#65CCB8]/60 focus:ring-offset-2"
      >
        <Bell className="h-5 w-5 text-white" />
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-semibold h-5 min-w-5 px-1 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification dropdown menu with smooth transitions */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 mt-2 w-80 max-w-[360px] rounded-xl border border-white/30 bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-900/20 z-30"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Notifications list */}
            <div className="py-1 max-h-80 overflow-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500">No notifications</div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        markAsRead(notification.id)
                      }
                    }}
                    className={[
                      "w-full text-left px-4 py-3 text-sm transition-all duration-200",
                      notification.unread
                        ? "bg-gradient-to-r from-[#65CCB8]/20 to-[#57BA98]/20 border-l-4 border-[#3B945E] shadow-sm"
                        : "bg-transparent",
                      "hover:bg-slate-50 focus:bg-slate-50 focus:outline-none rounded-lg"
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${notification.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                          {notification.title || 'Notification'}
                        </p>
                        <p className={`text-sm ${notification.unread ? 'text-slate-800' : 'text-slate-600'} mt-1`}>
                          {notification.message}
                        </p>
                        <span className="text-xs text-slate-500 mt-1 block">{notification.time || notification.timestamp || 'Just now'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {notification.unread && (
                          <>
                            <div className="w-2 h-2 rounded-full bg-[#3B945E] animate-pulse"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              className="p-1 text-[#3B945E] hover:text-[#2d7048] rounded transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Mark all as read button */}
            {notifications.length > 0 && unreadCount > 0 && (
              <div className="border-t border-slate-200/60">
                <button
                  className="w-full px-4 py-2 text-sm text-[#3B945E] hover:bg-[#65CCB8]/20 active:bg-[#65CCB8]/30 transition-colors duration-150 focus:outline-none focus:bg-[#65CCB8]/20 flex items-center justify-center gap-2"
                  onClick={markAllAsRead}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      markAllAsRead()
                    }
                  }}
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
  )
}

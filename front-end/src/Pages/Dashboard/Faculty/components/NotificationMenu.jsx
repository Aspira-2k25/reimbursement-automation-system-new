
import React from "react"
import { Bell } from "lucide-react"

/**
 * NotificationMenu Component
 * Displays notification bell with unread count and dropdown menu
 */
export default function NotificationMenu() {
  // State for notification menu visibility
  const [open, setOpen] = React.useState(false)
  const dropdownRef = React.useRef(null)
  
  // Dummy notification data for demonstration
  const [notifications, setNotifications] = React.useState([
    {
      id: 1,
      message: "Your research grant application has been approved",
      read: false,
      timestamp: "1 hour ago"
    },
    {
      id: 2,
      message: "FDP program reimbursement is under review",
      read: false,
      timestamp: "4 hours ago"
    },
    {
      id: 3,
      message: "Conference attendance request needs additional documents",
      read: true,
      timestamp: "2 days ago"
    },
    {
      id: 4,
      message: "Travel alliance request has been processed",
      read: true,
      timestamp: "1 week ago"
    }
  ])
  
  // Calculate unread notifications count - memoized to prevent unnecessary recalculations
  const unreadCount = React.useMemo(() => 
    notifications.filter(n => !n.read).length, 
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
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      )
    )
  }, [])

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = React.useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
  }, [])

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
        className="relative p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <Bell className="h-5 w-5 text-slate-700" />
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-semibold h-5 min-w-5 px-1 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification dropdown menu with smooth transitions */}
      <div
        className={`absolute right-0 mt-2 w-80 max-w-[360px] rounded-xl border border-white/30 bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-900/20 z-30 transition-all duration-300 ease-out ${
          open 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
        }`}
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
                  !notification.read 
                    ? "bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border-l-4 border-blue-500 shadow-sm" 
                    : "bg-transparent",
                  "hover:bg-slate-50 focus:bg-slate-50 focus:outline-none rounded-lg"
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`font-medium ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                    {notification.message}
                  </span>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    )}
                    <span className="text-xs text-slate-500">{notification.timestamp}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        
        {/* Mark all as read button */}
        {notifications.length > 0 && (
          <div className="border-t border-slate-200/60">
            <button
              className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50/50 active:bg-blue-100/50 transition-colors duration-150 focus:outline-none focus:bg-blue-50/50"
              onClick={markAllAsRead}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  markAllAsRead()
                }
              }}
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

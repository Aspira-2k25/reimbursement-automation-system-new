import React, { createContext, useContext, useState, useCallback } from 'react'

const NotificationContext = createContext()

export const useNotificationContext = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    // Return safe defaults instead of throwing so components can render
    // gracefully even without a NotificationProvider wrapper
    return {
      notifications: [],
      markNotificationAsRead: () => { },
      markAllNotificationsAsRead: () => { },
      addNotification: () => { }
    }
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])

  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, unread: false }
          : notification
      )
    )
  }, [])

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, unread: false }))
    )
  }, [])

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      unread: true,
      ...notification
    }
    setNotifications(prev => [newNotification, ...prev])
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

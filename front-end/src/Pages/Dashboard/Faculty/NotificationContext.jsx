import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { notificationsAPI } from '../../../services/api'

const NotificationContext = createContext()

export const useNotificationContext = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    console.warn('useNotificationContext used outside provider - returning empty fallback');
    return {
      notifications: [],
      addNotification: () => { },
      markNotificationAsRead: () => { },
      markAllNotificationsAsRead: () => { }
    };
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])

  const fetchBackendNotifications = useCallback(async () => {
    try {
      const res = await notificationsAPI.getAll()
      const list = res?.notifications || []
      const mapped = list.map(n => ({
        id: n._id || n.id,
        _id: n._id,
        type: n.type || 'status_change',
        title: n.title || 'Notification',
        message: n.message || '',
        unread: !n.isRead,
        timestamp: n.createdAt || new Date().toISOString(),
        time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
      }))
      setNotifications(mapped)
    } catch (err) {
      console.warn('Could not load backend notifications:', err)
    }
  }, [])

  useEffect(() => {
    fetchBackendNotifications()
    const interval = setInterval(fetchBackendNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchBackendNotifications])

  const markNotificationAsRead = useCallback(async (notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        (notification.id === notificationId || notification._id === notificationId)
          ? { ...notification, unread: false }
          : notification
      )
    )
    try {
      await notificationsAPI.markAsRead(notificationId)
    } catch (err) {
      console.warn('Failed to mark notification as read on server:', err)
    }
  }, [])

  const markAllNotificationsAsRead = useCallback(async () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, unread: false }))
    )
    try {
      await notificationsAPI.markAllAsRead()
    } catch (err) {
      console.warn('Failed to mark all notifications as read on server:', err)
    }
  }, [])

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      time: 'Just now',
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

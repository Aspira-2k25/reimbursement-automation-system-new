import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
const mapNotification = item => ({
  ...item, id: item._id || item.id, unread: !item.read,
  timestamp: item.createdAt, time: item.createdAt ? new Date(item.createdAt).toLocaleString() : '',
});

export default function usePersistentNotifications() {
  const { user } = useAuth();
  const owner = user?.id || user?.userId || user?.email || null;
  const [state, setState] = useState({ owner: null, notifications: [], error: null });
  const generation = useRef(0);
  const sequence = useRef(0);
  const pending = useRef(null);
  const refreshNotifications = useCallback(async (force = false) => {
    if (!owner || document.visibilityState === 'hidden') return;
    const currentGeneration = generation.current;
    if (!force && pending.current?.generation === currentGeneration) return;
    const request = ++sequence.current;
    pending.current = { generation: currentGeneration, request };
    try {
      const data = await notificationAPI.list({ limit: 50 });
      // Logout/switch/unmount cancels delivery of stale results and errors.
      if (generation.current !== currentGeneration || sequence.current !== request) return;
      setState({ owner, notifications: (data.notifications || []).map(mapNotification), error: null });
    } catch (error) {
      if (generation.current !== currentGeneration || sequence.current !== request) return;
      setState(previous => ({
        owner, notifications: previous.owner === owner ? previous.notifications : [],
        error: error.error || error.message || 'Unable to load notifications. Please retry.',
      }));
    } finally {
      if (pending.current?.request === request) pending.current = null;
    }
  }, [owner]);
  useEffect(() => {
    refreshNotifications();
    const onVisible = () => { if (document.visibilityState !== 'hidden') refreshNotifications(); };
    const interval = setInterval(onVisible, 60000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      generation.current += 1;
      sequence.current += 1;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshNotifications]);
  const markNotificationAsRead = useCallback(async id => {
    if (!owner) return;
    const currentGeneration = generation.current;
    try {
      await notificationAPI.read(id);
      if (generation.current !== currentGeneration) return;
      setState(previous => previous.owner === owner ? {
        ...previous, error: null,
        notifications: previous.notifications.map(item => item.id === id ? { ...item, read: true, unread: false } : item),
      } : previous);
      refreshNotifications(true);
    } catch (error) {
      if (generation.current === currentGeneration) setState(previous => ({
        owner, notifications: previous.owner === owner ? previous.notifications : [],
        error: error.error || error.message || 'Unable to mark notification as read.',
      }));
    }
  }, [owner, refreshNotifications]);
  const markAllNotificationsAsRead = useCallback(async () => {
    if (!owner) return;
    const currentGeneration = generation.current;
    try {
      await notificationAPI.readAll();
      if (generation.current !== currentGeneration) return;
      setState(previous => previous.owner === owner ? {
        ...previous, error: null,
        notifications: previous.notifications.map(item => ({ ...item, read: true, unread: false })),
      } : previous);
      refreshNotifications(true);
    } catch (error) {
      if (generation.current === currentGeneration) setState(previous => ({
        owner, notifications: previous.owner === owner ? previous.notifications : [],
        error: error.error || error.message || 'Unable to mark notifications as read.',
      }));
    }
  }, [owner, refreshNotifications]);
  // Legacy status-change callers request a server refresh; never create synthetic alerts.
  const addNotification = useCallback(() => refreshNotifications(true), [refreshNotifications]);
  const notifications = state.owner === owner && owner ? state.notifications : [];
  const error = state.owner === owner && owner ? state.error : null;
  return {
    notifications, error, refreshNotifications, addNotification,
    markNotificationAsRead, markAllNotificationsAsRead,
  };
};

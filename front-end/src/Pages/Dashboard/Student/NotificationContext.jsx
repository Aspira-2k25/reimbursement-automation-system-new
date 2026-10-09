import { createContext, useContext } from 'react';
import usePersistentNotifications from '../../../hooks/usePersistentNotifications';
const NotificationContext = createContext();
export const useNotificationContext = () => {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotificationContext must be used within NotificationProvider');
  return value;
};
export const NotificationProvider = ({ children }) => {
  const value = usePersistentNotifications();
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

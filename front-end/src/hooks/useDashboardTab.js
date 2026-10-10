import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function useDashboardTab(basePath, allowedTabs) {
  const location = useLocation();
  const navigate = useNavigate();
  const tabKey = allowedTabs.join('|');
  const segment = location.pathname.slice(basePath.length).split('/').filter(Boolean)[0];
  const requested = segment || location.hash.slice(1) || 'home';
  const activeTab = allowedTabs.includes(requested) ? requested : 'home';
  const setActiveTab = useCallback(tab => {
    if (!tabKey.split('|').includes(tab)) return;
    navigate(tab === 'home' ? basePath : `${basePath}/${tab}`);
  }, [navigate, basePath, tabKey]);
  return [activeTab, setActiveTab];
}

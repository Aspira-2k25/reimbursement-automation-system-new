import { useState, useEffect, useCallback } from 'react';
import { announcementAPI } from '../services/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(role) { return `announcement_cache_${role || 'all'}`; }

function getCached(role) {
  try {
    const raw = sessionStorage.getItem(getCacheKey(role));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(getCacheKey(role)); return null; }
    return data;
  } catch { return null; }
}

function setCache(role, data) {
  try { sessionStorage.setItem(getCacheKey(role), JSON.stringify({ data, ts: Date.now() })); } catch {}
}

function getUserRole() {
  try {
    // Try to read role from sessionStorage user data (stored by AuthContext)
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (raw) { const u = JSON.parse(raw); return u?.role || ''; }
  } catch {}
  return '';
}

/**
 * useAnnouncement — fetches the active global announcement for the current user's role.
 * Results are cached in sessionStorage for 5 minutes to avoid redundant API calls.
 * Returns { announcement, loading, refresh }
 */
export const useAnnouncement = () => {
  const role = getUserRole();
  const [announcement, setAnnouncement] = useState(() => getCached(role));
  const [loading, setLoading] = useState(() => getCached(role) === null);

  const refresh = useCallback((bustCache = false) => {
    const r = getUserRole();
    if (!bustCache) {
      const cached = getCached(r);
      if (cached !== null) { setAnnouncement(cached); setLoading(false); return; }
    }
    setLoading(true);
    announcementAPI.getActive(r)
      .then(data => {
        const a = data?.announcement || null;
        setCache(r, a);
        setAnnouncement(a);
      })
      .catch(() => setAnnouncement(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { announcement, loading, refresh };
};

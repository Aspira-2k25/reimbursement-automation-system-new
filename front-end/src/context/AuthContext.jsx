import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { fetchCsrfToken, invalidateAuthSession } from '../services/api';

const AuthContext = createContext();
// The public hook and provider intentionally share the existing context module.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const sessionVersion = useRef(0);
  const normalizeUser = useCallback(raw => raw ? {
    ...raw, id: raw.id || raw.userId || raw.email, department: raw.department || '',
  } : null, []);
  const saveUser = useCallback(raw => {
    const normalized = normalizeUser(raw);
    if (normalized) localStorage.setItem('user', JSON.stringify(normalized));
    else localStorage.removeItem('user');
    setUser(normalized);
    setSessionError(null);
    return normalized;
  }, [normalizeUser]);
  const refreshUserProfile = useCallback(async () => {
    const version = sessionVersion.current;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 12000);
    try {
      const { data } = await api.get('/auth/profile', {
        timeout: 8000, signal: controller.signal, __skipNetworkRetry: true,
      });
      if (version !== sessionVersion.current) return null;
      if (!data?.user) throw new Error('Server did not return a user profile.');
      return saveUser(data.user);
    } catch (error) {
      if (version !== sessionVersion.current) return null;
      setUser(null);
      if ([401, 404].includes(error.status)) {
        localStorage.removeItem('user');
        setSessionError(null);
      } else {
        setSessionError(error.message || 'Session validation unavailable. Please retry.');
      }
      return null;
    } finally { clearTimeout(deadline); }
  }, [saveUser]);
  useEffect(() => {
    let mounted = true;
    const expired = () => { sessionVersion.current += 1; saveUser(null); };
    const refreshed = event => saveUser(event.detail);
    window.addEventListener('auth:expired', expired);
    window.addEventListener('auth:refreshed', refreshed);
    // Persisted user data is a cache; authenticate only after server validation.
    const init = async () => {
      if (localStorage.getItem('user')) await refreshUserProfile();
      else await fetchCsrfToken().catch(() => {});
      if (mounted) setLoading(false);
    };
    init();
    return () => {
      mounted = false;
      sessionVersion.current += 1;
      window.removeEventListener('auth:expired', expired);
      window.removeEventListener('auth:refreshed', refreshed);
    };
  }, [refreshUserProfile, saveUser]);
  const completeLogin = async (path, credentials) => {
    invalidateAuthSession();
    const version = ++sessionVersion.current;
    await fetchCsrfToken();
    const { data } = await api.post(path, credentials);
    if (version !== sessionVersion.current) throw new Error('Session changed. Please retry.');
    if (!data?.user) throw new Error('Server did not return a user profile.');
    saveUser(data.user);
    fetchCsrfToken().catch(() => {});
    return data;
  };
  const login = (username, email, password) => completeLogin('/auth/login', { username, email, password });
  const loginWithGoogle = credential => completeLogin('/auth/google', { credential });
  const logout = useCallback(async () => {
    invalidateAuthSession();
    sessionVersion.current += 1;
    saveUser(null);
    localStorage.removeItem('token');
    try {
      await fetchCsrfToken();
      await api.post('/auth/logout');
    } catch { /* Local session remains closed even if the server is unavailable. */ }
  }, [saveUser]);
  const isAuthenticated = useCallback(() => !!user, [user]);
  return <AuthContext.Provider value={{
    user, loading, sessionError, login, loginWithGoogle, logout,
    isAuthenticated, refreshUserProfile,
  }}>{children}</AuthContext.Provider>;
};

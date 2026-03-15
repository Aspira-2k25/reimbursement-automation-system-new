import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchCsrfToken, getCsrfToken, API_BASE_URL } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeUser = useCallback((rawUser) => {
    if (!rawUser) return null;
    return {
      ...rawUser,
      id: rawUser.id || rawUser.userId || rawUser.email,
      department: rawUser.department || '',
    };
  }, []);

  const refreshUserProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const normalized = normalizeUser(data?.user);
      if (normalized) {
        localStorage.setItem('user', JSON.stringify(normalized));
        setUser(normalized);
      }
      return normalized;
    } catch {
      return null;
    }
  }, [normalizeUser]);

  // Check if user is logged in on app start
  useEffect(() => {
    const initAuth = async () => {
      // Fetch CSRF token for security
      await fetchCsrfToken();

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(normalizeUser(JSON.parse(storedUser)));
        } catch {
          localStorage.removeItem('user');
          setUser(null);
        }
        await refreshUserProfile();
      }
      setLoading(false);
    };

    initAuth();
  }, [normalizeUser, refreshUserProfile]);

  // Login function
  const login = async (username, email, password) => {
    try {

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify({ username, email, password }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `Login failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Store only user data (token is in httpOnly cookie)
      const normalizedUser = normalizeUser(data.user);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      // Refresh CSRF token after login since session changed
      await fetchCsrfToken();

      // Ensure we have the latest profile fields (department, etc.) from backend session
      await refreshUserProfile();

      return data;
    } catch (error) {
      // Enhanced error handling
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        throw new Error('Cannot connect to server. Please check your internet connection and try again.');
      }
      throw error;
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    // Clear local session first so UI exits authenticated routes immediately.
    localStorage.removeItem('user');
    setUser(null);

    try {
      // CSRF: ensure token is available for cookie-authenticated logout
      if (!getCsrfToken()) {
        await fetchCsrfToken();
      }
      const csrfToken = getCsrfToken();

      // Call backend logout to clear httpOnly cookie
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
    } catch {
      // Silently handle logout errors - user is logged out locally anyway
    }
  }, []);

  // Google login function
  const loginWithGoogle = async (credential) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify({ credential })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData?.error || `Google login failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Store only user data (token is in httpOnly cookie)
      const normalizedUser = normalizeUser(data.user);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      await refreshUserProfile();
      return data;
    } catch (error) {
      // Enhanced error handling
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        throw new Error('Cannot connect to server. Please check your internet connection and try again.');
      }
      throw error;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!user;
  }, [user]);

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    logout,
    isAuthenticated,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

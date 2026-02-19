import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchCsrfToken } from '../services/api';

// Use env var for API URL - same as api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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

  // Check if user is logged in on app start
  useEffect(() => {
    const initAuth = async () => {
      // Fetch CSRF token for security
      await fetchCsrfToken();
      
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    
    initAuth();
  }, []);

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
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);

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
    try {
      // Call backend logout to clear httpOnly cookie
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Silently handle logout errors - user is logged out locally anyway
    } finally {
      // Clear local storage
      localStorage.removeItem('user');
      setUser(null);
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
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

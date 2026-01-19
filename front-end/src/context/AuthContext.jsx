import React, { createContext, useContext, useState, useEffect } from 'react';

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
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      // Debug: Log API URL in development
      if (import.meta.env.DEV) {
        console.log('🔍 Login API URL:', `${API_BASE_URL}/auth/login`);
      }

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `Login failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);

      return data;
    } catch (error) {
      // Enhanced error handling
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        console.error('❌ Network Error:', {
          apiUrl: `${API_BASE_URL}/auth/login`,
          error: 'Cannot reach backend server. Check VITE_API_BASE_URL environment variable.',
          hint: 'Make sure VITE_API_BASE_URL is set in Vercel environment variables'
        });
        throw new Error('Cannot connect to server. Please check your internet connection and try again.');
      }
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Google login function
  const loginWithGoogle = async (credential) => {
    try {
      // Debug: Log API URL in development
      if (import.meta.env.DEV) {
        console.log('🔍 Google Login API URL:', `${API_BASE_URL}/auth/google`);
      }

      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData?.error || `Google login failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (error) {
      // Enhanced error handling
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        console.error('❌ Network Error:', {
          apiUrl: `${API_BASE_URL}/auth/google`,
          error: 'Cannot reach backend server. Check VITE_API_BASE_URL environment variable.',
          hint: 'Make sure VITE_API_BASE_URL is set in Vercel environment variables'
        });
        throw new Error('Cannot connect to server. Please check your internet connection and try again.');
      }
      throw error;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!token && !!user;
  };

  const value = {
    user,
    token,
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

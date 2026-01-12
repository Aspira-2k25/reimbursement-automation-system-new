import axios from 'axios';

// Use env var on Vercel; fallback to localhost for dev
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  // Login function
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login', {
        username,
        password,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },

  // Logout function
  logout: async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
};

// User API functions
export const userAPI = {
  // Get all users (for admin)
  getAllUsers: async () => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
};

export default api;

// Faculty Forms API
export const facultyFormsAPI = {
  listMine: async () => {
    try {
      const res = await api.get('/forms/mine');
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  getById: async (id) => {
    try {
      const res = await api.get(`/forms/${id}`);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  updateById: async (id, data) => {
    try {
      const res = await api.put(`/forms/${id}`, data);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  deleteById: async (id) => {
    try {
      const res = await api.delete(`/forms/${id}`);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  }
};

// Student Forms API
export const studentFormsAPI = {
  listMine: async () => {
    try {
      const res = await api.get('/student-forms/mine');
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  getById: async (id) => {
    try {
      const res = await api.get(`/student-forms/${id}`);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  updateById: async (id, data) => {
    try {
      const res = await api.put(`/student-forms/${id}`, data);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  deleteById: async (id) => {
    try {
      const res = await api.delete(`/student-forms/${id}`);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  }
};
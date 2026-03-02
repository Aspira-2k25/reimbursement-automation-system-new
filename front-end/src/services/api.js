import axios from 'axios';

// Use env var on Vercel; fallback to localhost for dev
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// SECURITY: Request timeout configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// CSRF token storage
let csrfToken = null;

// Create axios instance with base configuration
// credentials: 'include' is required for httpOnly cookies
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: send/receive cookies
  timeout: REQUEST_TIMEOUT,
});

// Fetch CSRF token on app initialization
export const fetchCsrfToken = async () => {
  try {
    const response = await api.get('/csrf-token');
    csrfToken = response.data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
};

// Get current CSRF token
export const getCsrfToken = () => csrfToken;

// SECURITY: Request interceptor to add CSRF protection headers
api.interceptors.request.use(
  (config) => {
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date().getTime() };

    // Add CSRF token for state-changing operations
    if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase())) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// SECURITY: Retry logic for failed requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Add response interceptor to handle errors with retry logic
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config;

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return Promise.reject({ error: 'Request timed out. Please try again.' });
    }

    // Handle 401 Unauthorized - clear user data and redirect
    if (error.response?.status === 401) {
      // Clear user data
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject({ error: 'Session expired. Please login again.' });
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      const errorData = error.response?.data;

      // If CSRF token is invalid, refresh it and retry the request once
      if (errorData?.error === 'Invalid CSRF token' && !config.__csrfRetried) {
        config.__csrfRetried = true;
        try {
          await fetchCsrfToken();
          // Update the header with the new token
          config.headers['X-CSRF-Token'] = csrfToken;
          return api(config);
        } catch {
          return Promise.reject({ error: 'Session expired. Please refresh the page and try again.' });
        }
      }

      // Preserve the original error message from the backend
      return Promise.reject(errorData || { error: 'You do not have permission to perform this action.' });
    }

    // Handle 429 Rate Limit
    if (error.response?.status === 429) {
      return Promise.reject({ error: 'Too many requests. Please wait a moment.' });
    }

    // Retry logic for network errors (but not for 4xx client errors)
    if (!error.response && config && !config.__retryCount) {
      config.__retryCount = config.__retryCount || 0;

      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        await sleep(RETRY_DELAY * config.__retryCount);
        return api(config);
      }
    }

    // Better error handling for network errors
    if (!error.response) {
      return Promise.reject({ error: 'Network error. Please check your connection.' });
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

  // Update user profile (limited fields)
  updateProfile: async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },

  // Change password
  changePassword: async ({ oldPassword, newPassword }) => {
    try {
      const response = await api.put('/auth/change-password', { oldPassword, newPassword });
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
  listForHOD: async () => {
    try {
      const res = await api.get('/forms/for-hod');
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  listForPrincipal: async () => {
    try {
      const res = await api.get('/forms/for-principal');
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  listForAccounts: async () => {
    try {
      const res = await api.get('/forms/for-accounts');
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  listApproved: async () => {
    try {
      const res = await api.get('/forms/approved');
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  listRejected: async () => {
    try {
      const res = await api.get('/forms/rejected');
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
  listPending: async () => {
    try {
      const res = await api.get('/student-forms/pending');
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  listForHOD: async () => {
    try {
      const res = await api.get('/student-forms/for-hod');
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  listForPrincipal: async () => {
    try {
      const res = await api.get('/student-forms/for-principal');
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  listForAccounts: async () => {
    try {
      const res = await api.get('/student-forms/for-accounts');
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  listApproved: async () => {
    try {
      const res = await api.get('/student-forms/approved');
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },
  listRejected: async () => {
    try {
      const res = await api.get('/student-forms/rejected');
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
      throw error.response?.data || { error: 'Network error', details: error.message };
    }
  },
  /** Upload new documents for an existing form (multipart). Uses same base URL and auth as other calls. */
  uploadDocuments: async (id, formData) => {
    try {
      const res = await api.post(`/student-forms/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error', details: error.message };
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

// Admin API functions - for managing faculty and staff
export const adminAPI = {
  // Get all faculty members
  getFacultyList: async () => {
    try {
      const res = await api.get('/auth/admin/faculty');
      return res.data; // { staff: [...] }
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },

  // Get single staff member
  getStaffById: async (id) => {
    try {
      const res = await api.get(`/auth/admin/faculty/${id}`);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },

  // Create new faculty member
  createFaculty: async (data) => {
    try {
      const res = await api.post('/auth/admin/faculty', data);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },

  // Update faculty member
  updateFaculty: async (id, data) => {
    try {
      const res = await api.put(`/auth/admin/faculty/${id}`, data);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },

  // Delete (deactivate) faculty member
  deleteFaculty: async (id) => {
    try {
      const res = await api.delete(`/auth/admin/faculty/${id}`);
      return res.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  }
};
import axios from 'axios';

// Use configured backend URL, fallback to local in dev and same-origin /api in prod.
// Accepts both VITE_API_BASE_URL and VITE_API_URL for flexibility.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

// Warn in production if no explicit backend URL is configured
if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL && !import.meta.env.VITE_API_URL) {
  console.warn('[API] No VITE_API_BASE_URL or VITE_API_URL set. Using /api (requires vercel.json proxy rewrite to backend).');
}

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

// Share token fetches and refresh rotation across concurrent dashboard requests.
let csrfPromise = null;
let refreshPromise = null;
let authEpoch = 0;
const sessionChangedError = () => Object.assign(new Error('Session changed. Please retry.'), {
  error: 'Session changed. Please retry.', code: 'ERR_SESSION_CHANGED', isApiError: true,
});
export const invalidateAuthSession = () => {
  authEpoch += 1;
  refreshPromise = null;
  csrfPromise = null;
  csrfToken = null;
};
export const normalizeApiError = (failure) => {
  if (failure?.isApiError) return failure;
  const status = failure?.response?.status;
  const data = failure?.response?.data;
  const message = data?.error || data?.message || failure?.error ||
    (failure?.code === 'ECONNABORTED' ? 'Request timed out. Please try again.' :
      !failure?.response ? 'Network error. Please check your connection.' : 'Request failed.');
  const error = new Error(message);
  Object.assign(error, data && typeof data === 'object' ? data : {}, {
    error: message, status, code: data?.code || failure?.code, response: failure?.response,
    details: data && typeof data === 'object' ? data : undefined,
    isApiError: true,
  });
  return error;
};
export const fetchCsrfToken = () => {
  if (!csrfPromise) {
    const epoch = authEpoch;
    const pending = api.get('/csrf-token', { timeout: 8000, __skipNetworkRetry: true })
      .then(({ data }) => {
        if (epoch !== authEpoch) throw sessionChangedError();
        if (!data.csrfToken) throw new Error('Server did not return a CSRF token.');
        csrfToken = data.csrfToken;
        return csrfToken;
      }).finally(() => { if (csrfPromise === pending) csrfPromise = null; });
    csrfPromise = pending;
  }
  return csrfPromise;
};
export const getCsrfToken = () => csrfToken;
const isAuthEntry = (url = '') => new RegExp('/auth/(login|google|refresh|logout)(?:[/?]|$)').test(url);
api.interceptors.request.use((config) => {
  if (config.__authEpoch == null) config.__authEpoch = authEpoch;
  if (config.__authEpoch !== authEpoch) throw sessionChangedError();
  config.metadata = { startTime: Date.now() };
  if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
    config.headers = config.headers || {};
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
api.interceptors.response.use(response => {
  if (response.config?.__authEpoch != null && response.config.__authEpoch !== authEpoch) throw sessionChangedError();
  return response;
}, async (failure) => {
  const config = failure.config;
  if (config?.__authEpoch != null && config.__authEpoch !== authEpoch) throw sessionChangedError();
  const status = failure.response?.status;
  if (status === 403 && failure.response?.data?.error === 'Invalid CSRF token' && config && !config.__csrfRetried) {
    config.__csrfRetried = true;
    await fetchCsrfToken();
    config.headers = config.headers || {};
    config.headers['X-CSRF-Token'] = csrfToken;
    return api(config);
  }
  if (status === 401 && config && !isAuthEntry(config.url) && !config.__authRetried) {
    config.__authRetried = true;
    const epoch = authEpoch;
    if (!refreshPromise) {
      const pending = api.post('/auth/refresh', {}, { timeout: 8000, __skipNetworkRetry: true })
        .then(response => {
          if (epoch !== authEpoch) throw sessionChangedError();
          if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
            window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: response.data.user }));
          }
          return response;
        }).finally(() => { if (refreshPromise === pending) refreshPromise = null; });
      refreshPromise = pending;
    }
    try { await refreshPromise; }
    catch (error) {
      if (epoch !== authEpoch) throw sessionChangedError();
      if (error.status === 401 || error.status === 404) {
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:expired'));
      }
      throw normalizeApiError(error);
    }
    if (epoch !== authEpoch) throw sessionChangedError();
    return api(config);
  }
  if (status === 401 && config && !isAuthEntry(config.url)) {
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth:expired'));
  }
  // Only reads may be automatically replayed after an ambiguous network failure.
  if (!failure.response && config && !config.__skipNetworkRetry &&
      ['get', 'head'].includes(config.method?.toLowerCase()) && !axios.isCancel(failure)) {
    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount < MAX_RETRIES && !config.signal?.aborted) {
      config.__retryCount += 1;
      await sleep(RETRY_DELAY * config.__retryCount);
      if (!config.signal?.aborted) return api(config);
    }
  }
  throw normalizeApiError(failure);
});

// Auth API functions
export const authAPI = {
  sendUsernameOtp: async (username) => {
    try { return (await api.post('/auth/username/send-otp', { username })).data; }
    catch (error) { throw normalizeApiError(error); }
  },
  changeUsername: async (username, otp) => {
    try { return (await api.put('/auth/username', { username, otp })).data; }
    catch (error) { throw normalizeApiError(error); }
  },
  // Login function
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login', {
        username,
        password,
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
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
      throw normalizeApiError(error);
    }
  },

  // Update user profile (limited fields)
  updateProfile: async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};

// Password management API functions
export const passwordAPI = {
  // Send forgot password email
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/password/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  // Reset password with token
  resetPassword: async (token, newPassword, confirmPassword) => {
    try {
      const response = await api.post('/password/reset-password', { token, newPassword, confirmPassword });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  // Send OTP for change password
  sendOtp: async () => {
    try {
      const response = await api.post('/password/send-otp');
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  // Change password with OTP verification
  changePassword: async (oldPassword, newPassword, confirmPassword, otp) => {
    try {
      const response = await api.post('/password/change-password', { oldPassword, newPassword, confirmPassword, otp });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};

// User API functions
export const userAPI = {
  // Get all users (for admin)
  getAllUsers: async (params = {}) => {
    try {
      const response = await api.get('/users', { params });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};

export default api;

// Faculty Forms API
export const facultyFormsAPI = {
  listHistory: async (params = {}) => (await api.get('/forms/history', { params })).data,
  listMine: async (params = {}) => {
    try {
      const res = await api.get('/forms/mine', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  listForHOD: async (params = {}) => {
    try {
      const res = await api.get('/forms/for-hod', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  listForPrincipal: async (params = {}) => {
    try {
      const res = await api.get('/forms/for-principal', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  listForAccounts: async (params = {}) => {
    try {
      const res = await api.get('/forms/for-accounts', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  listApproved: async (params = {}) => {
    try {
      const res = await api.get('/forms/approved', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  listRejected: async (params = {}) => {
    try {
      const res = await api.get('/forms/rejected', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  getById: async (id) => {
    try {
      const res = await api.get(`/forms/${id}`);
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  updateById: async (id, data) => {
    try {
      const res = await api.put(`/forms/${id}`, data);
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  deleteById: async (id) => {
    try {
      const res = await api.delete(`/forms/${id}`);
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  }
};

// Student Forms API
export const studentFormsAPI = {
  listHistory: async (params = {}) => (await api.get('/student-forms/history', { params })).data,
  listMine: async (params = {}) => {
    try {
      const res = await api.get('/student-forms/mine', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  listPending: async (params = {}) => {
    try {
      const res = await api.get('/student-forms/pending', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  listForHOD: async (params = {}) => {
    try {
      const res = await api.get('/student-forms/for-hod', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  listForPrincipal: async (params = {}) => {
    try {
      const res = await api.get('/student-forms/for-principal', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  listForAccounts: async (params = {}) => {
    try {
      const res = await api.get('/student-forms/for-accounts', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  listApproved: async (params = {}) => {
    try {
      const res = await api.get('/student-forms/approved', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  listRejected: async (params = {}) => {
    try {
      const res = await api.get('/student-forms/rejected', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  getById: async (id) => {
    try {
      const res = await api.get(`/student-forms/${id}`);
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
  updateById: async (id, data) => {
    try {
      const res = await api.put(`/student-forms/${id}`, data);
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
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
      throw normalizeApiError(error);
    }
  },
  deleteById: async (id) => {
    try {
      const res = await api.delete(`/student-forms/${id}`);
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  }
};

// Admin API functions - for managing faculty and staff
export const adminAPI = {
  // Get all faculty members
  getFacultyList: async (params = {}) => {
    try {
      const res = await api.get('/auth/admin/faculty', { params });
      return res.data; // { staff: [...] }
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  // Get single staff member
  getStaffById: async (id) => {
    try {
      const res = await api.get(`/auth/admin/faculty/${id}`);
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  // Create new faculty member
  createFaculty: async (data) => {
    try {
      const res = await api.post('/auth/admin/faculty', data);
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  // Update faculty member
  updateFaculty: async (id, data) => {
    try {
      const res = await api.put(`/auth/admin/faculty/${id}`, data);
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  // Delete (deactivate) faculty member
  deleteFaculty: async (id) => {
    try {
      const res = await api.delete(`/auth/admin/faculty/${id}`);
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  }
  ,
  // Get recent server logs (requires admin role)
  getLogs: async (params = {}) => {
    try {
      const res = await api.get('/admin/logs', { params });
      return res.data; // { logs: [...] }
    } catch (error) {
      throw normalizeApiError(error);
    }
  }
};

// Announcement API — dynamic reminder banner management
export const announcementAPI = {
  /** Fetch the currently active announcement for a given role. Any authenticated user. */
  getActive: async (role) => {
    try {
      const params = role ? { role } : {};
      const res = await api.get('/announcements/active', { params });
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  /** Create or update the global announcement. HOD / Principal / Admin only. */
  update: async (data) => {
    try {
      const res = await api.put('/announcements', data);
      return res.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  }
};
export const notificationAPI = {
  list: async (params = {}) => (await api.get('/notifications', { params })).data,
  read: async (id) => (await api.put(`/notifications/${id}/read`)).data,
  readAll: async () => (await api.put('/notifications/read-all')).data,
};

// Combined, server-filtered reviewer pages and aggregate reports.
export const dashboardAPI = {
  list: async (params = {}) => (await api.get('/dashboard', { params })).data,
  analytics: async (params = {}) => (await api.get('/dashboard/analytics', { params })).data,
};

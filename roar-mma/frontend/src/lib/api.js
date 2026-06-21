// API Client - Centralized HTTP request handling with Axios

import axios from 'axios';

// API Configuration
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || '',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token and logging
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (config.method) {
      console.log(config.method.toUpperCase(), config.url, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and logging
apiClient.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string' && response.data.length > 0) {
      const ct = response.headers?.['content-type'] || '';
      if (!ct.includes('application/json') && !ct.includes('text/javascript')) {
        throw new Error(`Non-JSON response from ${response.config?.url || 'API'}. Expected JSON but got ${ct || 'unknown content type'}.`);
      }
    }

    if (response.config) {
      console.log(response.config.method.toUpperCase(), response.config.url, response.data);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};

    // Log error
    console.error(
      originalRequest?.method?.toUpperCase() || 'UNKNOWN',
      originalRequest?.url || 'UNKNOWN',
      {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      }
    );

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      return Promise.reject({
        ...error,
        message: 'You do not have permission to perform this action',
      });
    }

    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        ...error,
        message: 'Network error. Please check your connection.',
      });
    }

    // Retry logic for server errors
    if (
      error.response?.status >= 500 &&
      originalRequest._retryCount < API_CONFIG.RETRY_ATTEMPTS
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      // Exponential backoff
      const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, originalRequest._retryCount - 1);

      await new Promise((resolve) => setTimeout(resolve, delay));

      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Request cancellation helper
export class CancelToken {
  constructor() {
    this.source = axios.CancelToken.source();
  }

  cancel(message) {
    this.source.cancel(message);
  }

  get token() {
    return this.source.token;
  }
}

// Generic API methods
export const api = {
  get: (url, config = {}) => {
    return apiClient.get(url, config).then((response) => response.data);
  },

  post: (url, data, config = {}) => {
    return apiClient.post(url, data, config).then((response) => response.data);
  },

  put: (url, data, config = {}) => {
    return apiClient.put(url, data, config).then((response) => response.data);
  },

  patch: (url, data, config = {}) => {
    return apiClient.patch(url, data, config).then((response) => response.data);
  },

  delete: (url, config = {}) => {
    return apiClient.delete(url, config).then((response) => response.data);
  },

  upload: (url, formData, onProgress) => {
    return apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    }).then((response) => response.data);
  },

  download: (url, filename) => {
    return apiClient.get(url, {
      responseType: 'blob',
    }).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
  },
};

// Authentication API
export const authApi = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
  register: (userData) => api.post('/api/auth/register', userData),
  refreshToken: () => api.post('/api/auth/refresh'),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/api/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.post('/api/auth/verify-email', { token }),
  getCurrentUser: () => api.get('/api/auth/me'),
};

// Members API
export const membersApi = {
  getAll: (params) => api.get('/api/members', { params }),
  getById: (id) => api.get(`/api/members/${id}`),
  create: (data) => api.post('/api/members', data),
  update: (id, data) => api.put(`/api/members/${id}`, data),
  delete: (id) => api.delete(`/api/members/${id}`),
  bulkDelete: (ids) => api.post('/api/members/bulk-delete', { ids }),
  bulkUpdate: (ids, data) => api.post('/api/members/bulk-update', { ids, data }),
  search: (query) => api.get('/api/members/search', { params: { q: query } }),
  getAttendance: (id, params) => api.get(`/api/members/${id}/attendance`, { params }),
  getPayments: (id, params) => api.get(`/api/members/${id}/payments`, { params }),
  uploadPhoto: (id, formData, onProgress) => api.upload(`/api/members/${id}/photo`, formData, onProgress),
  bulkExport: (ids) => api.post('/api/members/bulk/export', { ids }),
  bulkStatus: (ids, status) => api.post('/api/members/bulk/status', { ids, status }),
  bulkMessage: (ids, message, channel) => api.post('/api/members/bulk/message', { ids, message, channel }),
  export: (format, params) => api.get('/api/members/export', { params: { format, ...params } }),
};

// Leads API
export const leadsApi = {
  getAll: (params) => api.get('/api/leads', { params }),
  getById: (id) => api.get(`/api/leads/${id}`),
  create: (data) => api.post('/api/leads', data),
  update: (id, data) => api.put(`/api/leads/${id}`, data),
  delete: (id) => api.delete(`/api/leads/${id}`),
  bulkUpdate: (ids, data) => api.post('/api/leads/bulk-update', { ids, data }),
  convertToMember: (id, memberData) => api.post(`/api/leads/${id}/convert`, memberData),
  addNote: (id, note) => api.post(`/api/leads/${id}/notes`, { note }),
  getNotes: (id) => api.get(`/api/leads/${id}/notes`),
  bulkExport: (ids) => api.post('/api/leads/bulk/export', { ids }),
  bulkDelete: (ids) => api.post('/api/leads/bulk/delete', { ids, confirm: true }),
  export: (format, params) => api.get('/api/leads/export', { params: { format, ...params } }),
};

// Classes API
export const classesApi = {
  getAll: (params) => api.get('/api/classes', { params }),
  getById: (id) => api.get(`/api/classes/${id}`),
  create: (data) => api.post('/api/classes', data),
  update: (id, data) => api.put(`/api/classes/${id}`, data),
  delete: (id) => api.delete(`/api/classes/${id}`),
  getInstances: (params) => api.get('/api/classes/instances', { params }),
  getInstanceById: (id) => api.get(`/api/classes/instances/${id}`),
  checkIn: (instanceId, memberId) => api.post(`/api/classes/instances/${instanceId}/check-in`, { memberId }),
  removeCheckIn: (instanceId, memberId) => api.delete(`/api/classes/instances/${instanceId}/check-in/${memberId}`),
  getAttendees: (instanceId) => api.get(`/api/classes/instances/${instanceId}/attendees`),
  cancelInstance: (instanceId) => api.post(`/api/classes/instances/${instanceId}/cancel`),
};

// Payments API
export const paymentsApi = {
  getAll: (params) => api.get('/api/transactions', { params }),
  getById: (id) => api.get(`/api/transactions/${id}`),
  create: (data) => api.post('/api/transactions', data),
  refund: (id, amount, reason) => api.post(`/api/transactions/${id}/refund`, { amount, reason }),
  getSummary: (params) => api.get('/api/transactions/summary', { params }),
  export: (format, params) => api.get('/api/transactions/export', { params: { format, ...params } }),
  createStripeIntent: (amount, memberId) => api.post('/api/transactions/stripe/intent', { amount, memberId }),
  confirmStripePayment: (intentId) => api.post('/api/transactions/stripe/confirm', { intentId }),
};

// Communications API
export const communicationsApi = {
  getAll: (params) => api.get('/api/communications', { params }),
  getById: (id) => api.get(`/api/communications/${id}`),
  sendEmail: (data) => api.post('/api/communications/email', data),
  sendSMS: (data) => api.post('/api/communications/sms', data),
  sendBulk: (data) => api.post('/api/communications/bulk', data),
  getTemplates: () => api.get('/api/communications/templates'),
  createTemplate: (data) => api.post('/api/communications/templates', data),
  updateTemplate: (id, data) => api.put(`/api/communications/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/api/communications/templates/${id}`),
  scheduleMessage: (data) => api.post('/api/communications/schedule', data),
  cancelScheduled: (id) => api.delete(`/api/communications/schedule/${id}`),
  getConversations: () => api.get('/api/messaging/conversations'),
  getConversation: (phone) => api.get(`/api/messaging/conversations/${encodeURIComponent(phone)}`),
  sendReply: (phone, data) => api.post(`/api/messaging/conversations/${encodeURIComponent(phone)}/reply`, data),
  getDeliveries: (scheduledMessageId) => api.get(`/api/messaging/deliveries/${scheduledMessageId}`),
  retryDelivery: (deliveryId) => api.post(`/api/messaging/deliveries/${deliveryId}/retry`),
  sendWithAttachments: (formData) => api.upload('/api/scheduled-messages', formData),
};

// Reports API
export const reportsApi = {
  getDashboard: (params) => api.get('/api/reports/dashboard', { params }),
  getMembers: (params) => api.get('/api/reports/members', { params }),
  getRevenue: (params) => api.get('/api/reports/revenue', { params }),
  getAttendance: (params) => api.get('/api/reports/attendance', { params }),
  getLeads: (params) => api.get('/api/reports/leads', { params }),
  getRetention: (params) => api.get('/api/reports/retention', { params }),
  export: (type, format, params) => api.get(`/api/reports/${type}/export`, { params: { format, ...params } }),
};

// Settings API
export const settingsApi = {
  getAll: (params) => api.get('/api/settings', params),
  update: (data) => api.put('/api/settings', data),
  getLocations: () => api.get('/api/settings/locations'),
  createLocation: (data) => api.post('/api/settings/locations', data),
  updateLocation: (id, data) => api.put(`/api/settings/locations/${id}`, data),
  deleteLocation: (id) => api.delete(`/api/settings/locations/${id}`),
  testEmailConfig: (config) => api.post('/api/settings/test-email', config),
  testSMSConfig: (config) => api.post('/api/settings/test-sms', config),
};

// Calendar API
export const calendarApi = {
  getEvents: (params) => api.get('/api/calendar/events', { params }),
  createEvent: (data) => api.post('/api/calendar/events', data),
  updateEvent: (id, data) => api.put(`/api/calendar/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/api/calendar/events/${id}`),
};

// Analytics API
export const analyticsApi = {
  track: (event, properties) => api.post('/api/analytics/track', { event, properties }),
  identify: (userId, traits) => api.post('/api/analytics/identify', { userId, traits }),
  page: (name, properties) => api.post('/api/analytics/page', { name, properties }),
};

// Student Coaching API
export const coachingApi = {
  getAllRatings: (params) => api.get('/api/coaching/ratings', { params }),
  getRatings: (memberId, params) => api.get(`/api/coaching/${memberId}/ratings`, { params }),
  createRating: (memberId, data) => api.post(`/api/coaching/${memberId}/ratings`, data),
  getInsights: (memberId, params) => api.get(`/api/coaching/${memberId}/insights`, { params }),
  getDrills: (memberId, params) => api.get(`/api/coaching/${memberId}/drills`, { params }),
};

// Notifications API
export const notificationsApi = {
  getAll: (params) => api.get('/api/notifications', { params }),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put('/api/notifications/read-all'),
  delete: (id) => api.delete(`/api/notifications/${id}`),
  getUnreadCount: () => api.get('/api/notifications/unread-count'),
};

// Batch request helper
export async function batchRequests(requests, options = {}) {
  const { concurrency = 5, onProgress } = options;
  const results = [];
  const errors = [];

  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch);

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push({
          index: i + index,
          error: result.reason,
        });
      }
    });

    if (onProgress) {
      onProgress({
        completed: Math.min(i + concurrency, requests.length),
        total: requests.length,
        percentage: Math.round((Math.min(i + concurrency, requests.length) / requests.length) * 100),
      });
    }
  }

  return { results, errors };
}

// Polling helper for long-running operations
export async function pollUntilComplete(checkFn, options = {}) {
  const { interval = 1000, maxAttempts = 30, onProgress } = options;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const result = await checkFn();

      if (result.complete) {
        return result.data;
      }

      if (onProgress) {
        onProgress({
          attempts,
          maxAttempts,
          progress: result.progress,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      throw new Error(`Polling failed after ${attempts} attempts: ${error.message}`);
    }
  }

  throw new Error(`Polling timed out after ${maxAttempts} attempts`);
}

export default apiClient;

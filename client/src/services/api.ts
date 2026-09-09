import axios from 'axios';

export const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to all outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vphs_erp_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle expired tokens or 401s
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('vphs_erp_token');
        localStorage.removeItem('vphs_erp_user');
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.error || error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;

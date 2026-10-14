import axios from 'axios';

export const getApiBaseUrl = (): string => {
  const custom = typeof localStorage !== 'undefined' ? localStorage.getItem('pulsemeet_custom_server_url') : null;
  if (custom) {
    const clean = custom.replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  let url = import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL;
  if (!url) {
    return 'https://pulsemeet-backend-tjv7.onrender.com/api';
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  if (!url.endsWith('/api') && !url.includes('/api/')) {
    url = `${url.replace(/\/+$/, '')}/api`;
  }
  return url;
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Interceptor to inject JWT Access Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulsemeet_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Interceptor for 401 token refresh handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('pulsemeet_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = res.data;

          localStorage.setItem('pulsemeet_access_token', accessToken);
          if (newRefresh) {
            localStorage.setItem('pulsemeet_refresh_token', newRefresh);
          }

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('pulsemeet_access_token');
          localStorage.removeItem('pulsemeet_refresh_token');
          localStorage.removeItem('pulsemeet_user');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

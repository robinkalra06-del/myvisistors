import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

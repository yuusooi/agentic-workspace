import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { useAuthStore } from '@/stores/auth-store';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

function onTokenRefreshed(newToken: string) {
  pendingRequests.forEach((cb) => cb(newToken));
  pendingRequests = [];
}

// --- Request interceptor: attach access token ---
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: handle 401, auto-refresh ---
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 403) {
      message.error('权限不足，无法执行此操作');
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401 and not already retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh auth endpoints themselves
    if (originalRequest.url?.startsWith('/auth/')) {
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingRequests.push((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post('/api/auth/refresh', {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token: newRefreshToken } = res.data;
      useAuthStore.getState().setTokens(access_token, newRefreshToken);

      onTokenRefreshed(access_token);

      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return apiClient(originalRequest);
    } catch {
      // Refresh failed — force logout
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;

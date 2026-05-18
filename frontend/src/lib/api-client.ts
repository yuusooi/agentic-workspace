import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { message as antMessage } from 'antd';
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

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const result = response.data;
    if (result && typeof result === 'object' && 'code' in result) {
      if (result.code === 200) {
        response.data = result.data;
      } else {
        const error = new Error(result.message || '请求失败') as AxiosError & { code?: number; response?: { data?: { code?: number; message?: string } } };
        error.code = result.code;
        error.response = { data: { code: result.code, message: result.message } } as any;
        if (result.data) {
          (error.response!.data as any).data = result.data;
        }
        return Promise.reject(error);
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 403) {
      antMessage.error('权限不足，无法执行此操作');
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.startsWith('/auth/')) {
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

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
        refreshToken,
      });

      const result = res.data;
      const data = result.code === 200 ? result.data : result;
      const { accessToken, refreshToken: newRefreshToken } = data;
      useAuthStore.getState().setTokens(accessToken, newRefreshToken || refreshToken);

      onTokenRefreshed(accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}
import { getAccessToken, setAccessToken, clearAuthStorage, getRefreshToken } from '@/utils/storage';
import { RefreshResponse } from '@/types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string | null) => void;
  reject: (error: AxiosError) => void;
}[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const axiosClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach access token
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle 401 and refresh token
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue failed requests while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string | null) => {
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(axiosClient(originalRequest));
              } else {
                reject(error);
              }
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        isRefreshing = false;
        clearAuthStorage();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<RefreshResponse>(
          `${API_BASE_URL}users/token/refresh/`,
          { refresh: refreshToken },
          { skipAuthRefresh: true }
        );

        const { access } = response.data;
        setAccessToken(access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        processQueue(null, access);

        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        clearAuthStorage();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
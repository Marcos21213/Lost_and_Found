import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Toast } from 'antd-mobile';
import { clearAuthStorage, getToken } from '@/utils/storage';

const request = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 15000,
});

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

request.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ message?: string; msg?: string }>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.msg ||
      error.message ||
      '请求失败，请稍后重试';

    Toast.show({
      content: status === 401 ? '登录状态已失效，请重新登录' : message,
    });

    if (status === 401) {
      clearAuthStorage();

      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  },
);

export default request;

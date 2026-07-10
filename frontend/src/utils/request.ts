import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Toast } from 'antd-mobile';
import { clearAuthStorage, getToken } from '@/utils/storage';

type ErrorResponseBody = {
  message?: string;
  msg?: string;
  detail?: string | { message?: string; reason?: string } | Array<{ msg?: string; message?: string }>;
};

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
  (error: AxiosError<ErrorResponseBody>) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    const detailMessage =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.message || item.msg).filter(Boolean).join('；')
          : detail?.message || detail?.reason;
    const message =
      error.response?.data?.message ||
      error.response?.data?.msg ||
      detailMessage ||
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

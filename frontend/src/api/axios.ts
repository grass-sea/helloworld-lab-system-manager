import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000'; // Địa chỉ Local Backend Django Ninja

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động cấu hình interceptor để lấy token nếu hệ thống phát triển thêm phần Auth bảo mật
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
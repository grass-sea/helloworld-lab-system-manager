import axios from "axios";

const getDefaultApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000/api";
  }

  const hostname = window.location.hostname === "0.0.0.0" ? "127.0.0.1" : window.location.hostname;
  return `${window.location.protocol}//${hostname}:8000/api`;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? getDefaultApiBaseUrl();

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;

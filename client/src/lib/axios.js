// lib/axios.js
import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5001/api"
      : "/api",
  withCredentials: true, // keeps cookies for auth
});

// Attach JWT from localStorage to every request (if present)
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token"); 
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }

      
      if (config.data instanceof FormData) {
        if (config.headers["Content-Type"]) delete config.headers["Content-Type"];
        if (config.headers["content-type"]) delete config.headers["content-type"];
      }

      return config;
    } catch (err) {
      return config;
    }
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;

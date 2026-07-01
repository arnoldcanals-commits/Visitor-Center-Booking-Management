import axios from "axios";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// --- Attach access token to requests ---
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Handle expired tokens ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem(REFRESH_TOKEN);

      // ⛔ If no refresh token, user is simply logged out
      if (!refresh) {
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/token/refresh/`,
          { refresh }
        );

        localStorage.setItem(ACCESS_TOKEN, data.access);

        // Retry original request with new access token
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed → full logout
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);

        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

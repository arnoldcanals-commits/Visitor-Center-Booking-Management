import axios from "axios";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

/* =========================================================
   REQUEST INTERCEPTOR
   - Attaches token only if valid
   - Prevents "Bearer null" or "Bearer undefined"
========================================================= */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);

    if (token && token !== "null" && token !== "undefined") {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================================================
   REFRESH TOKEN LOGIC (Optimized)
========================================================= */

let isRefreshing = false;           // Track active refresh call
let refreshSubscribers = [];        // Queue for requests during refresh

// Notify pending requests after refresh completes
function onRefreshed(newToken) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If unauthorized & refresh token exists
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN);

      if (!refreshToken) {
        // No refresh token → logout
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
        if (window.location.pathname !== "/") window.location.href = "/";
        return Promise.reject(error);
      }

      // Mark this request for retry
      originalRequest._retry = true;

      // If a refresh call is already running → queue request
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      // Start refresh process
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/token/refresh/`,
          { refresh: refreshToken }
        );

        const newAccessToken = data.access;
        localStorage.setItem(ACCESS_TOKEN, newAccessToken);

        // Apply new token to pending requests
        onRefreshed(newAccessToken);
        isRefreshing = false;

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh token invalid → logout everywhere
        isRefreshing = false;
        refreshSubscribers = [];
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
        if (window.location.pathname !== "/") window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

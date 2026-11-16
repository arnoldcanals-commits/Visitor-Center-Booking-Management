import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants";
import {
  clearAuthTokens,
  getAuthToken,
  updateAccessToken,
} from "./utils/authTokens";
import { queueGlobalApiError } from "./utils/globalMessages";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

let refreshPromise = null;

const isAuthEndpoint = (url = "") => /(?:token|login)(?:\/|$)/i.test(url);

const refreshAccessToken = () => {
  const refresh = getAuthToken(REFRESH_TOKEN);
  if (!refresh) return Promise.reject(new Error("No refresh token available."));

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${import.meta.env.VITE_API_URL}/api/site_admin/token/refresh/`, { refresh })
      .then(({ data }) => {
        updateAccessToken(data.access);
        return data.access;
      })
      .catch((error) => {
        clearAuthTokens();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.request.use(async (config) => {
  if (isAuthEndpoint(config.url)) return config;

  let token = getAuthToken(ACCESS_TOKEN);
  if (token) {
    let exp;
    try {
      exp = jwtDecode(token).exp;
    } catch {
      // Let the API reject malformed tokens through its normal 401 flow.
    }
    if (typeof exp === "number" && exp <= Date.now() / 1000) {
      if (getAuthToken(REFRESH_TOKEN)) {
        try {
          token = await refreshAccessToken();
        } catch (error) {
          if (window.location.pathname !== "/") window.location.href = "/";
          throw error;
        }
      } else {
        clearAuthTokens();
        token = null;
      }
    }
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;
      if (!getAuthToken(REFRESH_TOKEN)) {
        clearAuthTokens();
      } else {
        try {
          const access = await refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          clearAuthTokens();
          if (window.location.pathname !== "/") window.location.href = "/";
          return Promise.reject(refreshError);
        }
      }
    }

    if (!error.config?.suppressGlobalApiError) queueGlobalApiError(error);
    return Promise.reject(error);
  }
);

export default api;

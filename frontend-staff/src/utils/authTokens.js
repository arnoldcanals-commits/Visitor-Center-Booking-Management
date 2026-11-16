import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";

export const getAuthToken = (key) =>
  localStorage.getItem(key) || sessionStorage.getItem(key);

export const storeAuthTokens = (access, refresh, rememberMe = false) => {
  clearAuthTokens();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN, access);
  storage.setItem(REFRESH_TOKEN, refresh);
};

export const updateAccessToken = (access) => {
  const storage = localStorage.getItem(REFRESH_TOKEN) ||
    localStorage.getItem(ACCESS_TOKEN)
    ? localStorage
    : sessionStorage;
  storage.setItem(ACCESS_TOKEN, access);
};

export const clearAuthTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN);
  localStorage.removeItem(REFRESH_TOKEN);
  sessionStorage.removeItem(ACCESS_TOKEN);
  sessionStorage.removeItem(REFRESH_TOKEN);
};

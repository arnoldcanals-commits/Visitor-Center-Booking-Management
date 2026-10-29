export const API_ORIGIN = import.meta.env.PROD
  ? window.location.origin
  : "http://127.0.0.1:8000";
  
export const toAbsoluteUrl = (path) => {
  if (!path) return path;
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path}`;
};
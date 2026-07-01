// src/contexts/AdminDataContext.jsx
import React, {
  createContext,
  useEffect,
  useState,
  useContext,
  useCallback,
  useRef,
} from "react";
import api from "../api";
import { AuthContext } from "./AuthContext";

export const AdminDataContext = createContext();

const READ_ONLY_MODELS = ["audit_logs"];
const FRONTEND_BLOCKED_MODELS = ["notifications"];

export const AdminDataProvider = ({ children }) => {
  const { authTokens } = useContext(AuthContext);
  const mountedRef = useRef(true);

  const [adminData, setAdminData] = useState({
    users: [],
    bookings: [],
    guests: [],
    permits: [],
    permit_templates: [],
    packages: [],
    events: [],
    qrcodes: [],
    reports: [],
    notifications: [],
    audit_logs: [],
    qualifications: [],
    permit_types: [],
    stations: [],
    faqs: [],
    information: [],
    system_settings: [],
    site_configuration: [],
    event_station_checks: [],

    // Billing
    bills: [],
    bill_items: [],
    bill_templates: [],
    fee_types: [],
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Helper: Converts state keys (underscores) to backend URL paths (hyphens)
   * e.g., 'audit_logs' -> 'audit-logs'
   */
  const getUrlModel = (model) => {
    const mapping = {
      // Add explicit overrides here if any model name varies significantly from the URL
      "qrcodes": "qrcodes",
    };
    return mapping[model] || model.replace(/_/g, "-");
  };

  // ========================================================
  // LOAD ADMIN DATA
  // ========================================================
  const loadAdminData = useCallback(async () => {
    if (!authTokens?.access) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("api/site_admin/all-data/");
      if (!mountedRef.current) return;

      const data = response.data || {};

      setAdminData((prev) => ({
        ...prev,
        ...data,
      }));
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [authTokens]);

  // ========================================================
  // POLLING (Every 5 seconds)
  // ========================================================
  useEffect(() => {
    mountedRef.current = true;
    loadAdminData();

    const interval = setInterval(loadAdminData, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [loadAdminData]);

  // ========================================================
  // CREATE
  // ========================================================
  const createItem = async (model, data) => {
    if (READ_ONLY_MODELS.includes(model)) {
      console.warn(`${model} is read-only.`);
      return false;
    }

    if (FRONTEND_BLOCKED_MODELS.includes(model)) {
      console.warn(`${model} must be handled via specific backend logic.`);
      return false;
    }

    try {
      const urlModel = getUrlModel(model);
      await api.post(`api/site_admin/${urlModel}/`, data);
      await loadAdminData();
      return true;
    } catch (error) {
      console.error(`Failed to create ${model}:`, error);
      return false;
    }
  };

  // ========================================================
  // UPDATE (PATCH)
  // ========================================================
  const updateItem = async (model, id, data) => {
    if (READ_ONLY_MODELS.includes(model)) {
      console.warn(`${model} is read-only.`);
      return false;
    }

    // Special case for Notifications mark-read
    if (model === "notifications") {
      try {
        await api.patch(
          `api/site_admin/notifications/${id}/mark-read/`,
          {}
        );
        await loadAdminData();
        return true;
      } catch (error) {
        console.error("Failed to mark notification:", error);
        return false;
      }
    }

    try {
      const urlModel = getUrlModel(model);
      await api.patch(`api/site_admin/${urlModel}/${id}/`, data);
      await loadAdminData();
      return true;
    } catch (error) {
      console.error(`Failed to update ${model}:`, error);
      return false;
    }
  };

  // ========================================================
  // DELETE
  // ========================================================
  const deleteItem = async (model, id) => {
    if (READ_ONLY_MODELS.includes(model)) {
      console.warn(`${model} is read-only.`);
      return false;
    }

    if (model === "notifications") {
      console.warn("Notifications cannot be deleted.");
      return false;
    }

    try {
      const urlModel = getUrlModel(model);
      // Logic: For QR Codes, we use the custom /delete/ path if specified in URLs
      const pathSuffix = model === "qrcodes" ? "delete/" : "";
      
      await api.delete(`api/site_admin/${urlModel}/${id}/${pathSuffix}`);
      await loadAdminData();
      return true;
    } catch (error) {
      console.error(`Failed to delete ${model}:`, error);
      return false;
    }
  };

  // ========================================================
  // SEARCH FILTER
  // ========================================================
  const filteredData = {};
  Object.keys(adminData).forEach((key) => {
    filteredData[key] = (adminData[key] || []).filter((item) => {
      if (!searchQuery) return true;

      return Object.values(item)
        .filter((v) => typeof v === "string")
        .some((v) =>
          v.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });
  });

  return (
    <AdminDataContext.Provider
      value={{
        adminData,
        filteredData,
        reload: loadAdminData,
        createItem,
        updateItem,
        deleteItem,
        loading,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
};
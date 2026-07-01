import React, { createContext, useEffect, useState, useContext, useRef } from "react";
import api from "../api";
import { AuthContext } from "./AuthContext";

export const StaffDataContext = createContext();

export const StaffDataProvider = ({ children }) => {
  const { authTokens } = useContext(AuthContext);

  const [staffData, setStaffData] = useState({
    users: [], bookings: [], guests: [], permits: [],
    permit_templates: [], packages: [], events: [],
    ratings: [], qrcodes: [], reports: [], notifications: [],
    audit_logs: [], qualifications: [], permit_types: [],
    stations: [], bills: [], bill_items: [],
    bill_templates: [], fee_types: [],
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // 🔥 NEW: Prevents background refresh while scanning/inputting
  const [isActivelyScanning, setIsActivelyScanning] = useState(false);
  const isActivelyScanningRef = useRef(false);

  // Keep ref in sync so the setInterval always sees the latest value
  useEffect(() => {
    isActivelyScanningRef.current = isActivelyScanning;
  }, [isActivelyScanning]);

  const loadStaffData = async () => {
    // 1. Abort if user is busy (Scanning or Modal open)
    // 2. Abort if page is hidden (Phone locked/Tab inactive)
    if (isActivelyScanningRef.current || document.visibilityState === 'hidden') {
      return; 
    }

    if (!authTokens?.access) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("api/booking_staff/all-data/");
      const data = response.data;

      const coreData = {
        users: data.users ?? [],
        bookings: data.bookings ?? [],
        guests: data.guests ?? [],
        permits: data.permits ?? [],
        permit_templates: data.permit_templates ?? [],
        packages: data.packages ?? [],
        events: data.events ?? [],
        ratings: data.ratings ?? [],
        qrcodes: data.qrcodes ?? [],
        reports: data.reports ?? [],
        notifications: data.notifications ?? [],
        audit_logs: data.audit_logs ?? [],
        qualifications: data.qualifications ?? [],
        permit_types: data.permit_types ?? [],
        stations: data.stations ?? [],
        bills: data.bills ?? [],
        bill_items: data.bill_items ?? [],
        bill_templates: data.bill_templates ?? [],
        fee_types: data.fee_types ?? [],
      };

      setStaffData(coreData);
    } catch (error) {
      console.error("Failed to load Staff data:", error);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // POLLING: Refreshes only when safe
  // -------------------------
  useEffect(() => {
    loadStaffData();
    const interval = setInterval(loadStaffData, 8000); // Relaxed to 8s for better mobile stability
    return () => clearInterval(interval);
  }, [authTokens]);

  // -------------------------
  // UNIVERSAL CRUD HELPERS
  // -------------------------
  const createItem = async (model, data) => {
    if (["ratings", "audit_logs", "notifications"].includes(model)) return false;

    try {
      await api.post(`api/booking_staff/${model}/`, data);
      await loadStaffData();
      return true;
    } catch (error) {
      console.error(`Failed to create ${model}:`, error);
      return false;
    }
  };

  const updateItem = async (model, id, data) => {
    if (["ratings", "audit_logs"].includes(model)) return false;

    try {
      if (model === "notifications") {
        await api.patch(`api/booking_staff/notifications/${id}/mark-read/`, {});
      } else {
        await api.put(`api/booking_staff/${model}/${id}/update/`, data);
      }
      await loadStaffData();
      return true;
    } catch (error) {
      console.error(`Failed to update ${model}:`, error);
      return false;
    }
  };

  const deleteItem = async (model, id) => {
    if (["ratings", "audit_logs", "notifications"].includes(model)) return false;

    try {
      await api.delete(`api/booking_staff/${model}/${id}/delete/`);
      await loadStaffData();
      return true;
    } catch (error) {
      console.error(`Failed to delete ${model}:`, error);
      return false;
    }
  };

  const filteredData = {};
  Object.keys(staffData).forEach((key) => {
    filteredData[key] = staffData[key].filter((item) => {
      if (!searchQuery) return true;
      return Object.values(item)
        .filter((v) => typeof v === "string")
        .some((v) => v.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  });

  return (
    <StaffDataContext.Provider
      value={{
        staffData,
        filteredData,
        reload: loadStaffData,
        createItem,
        updateItem,
        deleteItem,
        loading,
        searchQuery,
        setSearchQuery,
        setIsActivelyScanning, // Export this so the Dashboard can toggle it
      }}
    >
      {children}
    </StaffDataContext.Provider>
  );
};
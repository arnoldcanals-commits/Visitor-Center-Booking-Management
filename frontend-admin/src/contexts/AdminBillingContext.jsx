// src/contexts/AdminBillingContext.jsx
import { createContext, useContext } from "react";
import { AdminDataContext } from "./AdminDataContext";
import api from "../api";

export const AdminBillingContext = createContext();

export const AdminBillingProvider = ({ children }) => {
  const { adminData, reload } = useContext(AdminDataContext);

  // -----------------------------
  // Single source of truth
  // -----------------------------
  const bills = adminData?.bills ?? [];
  const fees = adminData?.fee_types ?? [];

  // -----------------------------
  // Bill Actions
  // -----------------------------
 const billAction = async (billId, action, data = undefined) => {
  try {
    await api.post(`api/site_admin/bills/${billId}/${action}/`, data);
    await reload();
    return true;
  } catch (error) {
    console.error(`Bill action failed (${action}):`, error.response?.data || error);
    await reload();
    return false;
  }
};


  // -----------------------------
  // Fee Actions (CRUD)
  // -----------------------------
  const createFee = async (data) => {
    try {
      await api.post("api/site_admin/fees/", data);
      await reload();
      return true;
    } catch (error) {
      console.error("Create fee failed:", error);
      return false;
    }
  };

  const updateFee = async (feeId, data) => {
    try {
      await api.put(`api/site_admin/fees/${feeId}/`, data);
      await reload();
      return true;
    } catch (error) {
      console.error("Update fee failed:", error);
      return false;
    }
  };

  const deleteFee = async (feeId) => {
    try {
      await api.delete(`api/site_admin/fees/${feeId}/`);
      await reload();
      return true;
    } catch (error) {
      console.error("Delete fee failed:", error);
      return false;
    }
  };

  // -----------------------------
  // Guards (domain rules)
  // -----------------------------
  const canIssue = (bill) => bill.status === "draft";
  const canMarkPaid = (bill) => bill.status === "issued";
  const canVerify = (bill) => bill.status === "paid";
  const canReject = (bill) => bill.status === "paid";

  // -----------------------------
  // Derived helpers
  // -----------------------------
  const getBillById = (id) =>
    bills.find((b) => b.id === Number(id));

  const getBillsByStatus = (status) =>
    bills.filter((b) => b.status === status);

  const getFeeById = (id) =>
    fees.find((f) => f.id === Number(id));

  return (
    <AdminBillingContext.Provider
      value={{
        // data
        bills,
        fees,

        // bill actions
        billAction,
        canIssue,
        canMarkPaid,
        canVerify,
        canReject,

        // fee actions
        createFee,
        updateFee,
        deleteFee,

        // helpers
        getBillById,
        getBillsByStatus,
        getFeeById,
      }}
    >
      {children}
    </AdminBillingContext.Provider>
  );
};

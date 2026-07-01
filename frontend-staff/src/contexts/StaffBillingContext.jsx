// src/contexts/StaffBillingContext.jsx
import { createContext, useContext } from "react";
import { StaffDataContext } from "./StaffDataContext";
import api from "../api";

export const StaffBillingContext = createContext();

export const StaffBillingProvider = ({ children }) => {
  const { staffData, reload } = useContext(StaffDataContext);

  // -----------------------------
  // Single source of truth
  // -----------------------------
  const bills = staffData?.bills ?? [];
  const fees = staffData?.fee_types ?? [];

  // -----------------------------
  // Bill Actions
  // -----------------------------
 const billAction = async (billId, action, data = undefined) => {
  try {
    await api.post(`api/booking_staff/bills/${billId}/${action}/`, data);
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
      await api.post("api/booking_staff/fees/", data);
      await reload();
      return true;
    } catch (error) {
      console.error("Create fee failed:", error);
      return false;
    }
  };

  const updateFee = async (feeId, data) => {
    try {
      await api.put(`api/booking_staff/fees/${feeId}/`, data);
      await reload();
      return true;
    } catch (error) {
      console.error("Update fee failed:", error);
      return false;
    }
  };

  const deleteFee = async (feeId) => {
    try {
      await api.delete(`api/booking_staff/fees/${feeId}/`);
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
    <StaffBillingContext.Provider
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
    </StaffBillingContext.Provider>
  );
};

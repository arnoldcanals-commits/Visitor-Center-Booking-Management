// src/pages/Billing.jsx
import { useContext, useState } from "react";
import { StaffBillingContext } from "../contexts/StaffBillingContext";

import BillInfoModal from "../components/billing/BillInfoModal";
import FeesPage from "../components/billing/FeesPage";

export default function Billing() {
  const { bills } = useContext(StaffBillingContext);

  const [activeTab, setActiveTab] = useState("bills");
  const [activeBill, setActiveBill] = useState(null);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">
        💰 Billing Management
      </h1>

      {/* ───────── Tabs ───────── */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setActiveTab("bills")}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "bills"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          Bills
        </button>

        <button
          onClick={() => setActiveTab("fees")}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "fees"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          Fees
        </button>
      </div>

      {/* ───────── Bills Table ───────── */}
      {activeTab === "bills" && (
        <div className="bg-white shadow rounded-xl p-4">
          <h2 className="font-bold text-lg mb-4">
            Bills ({bills.length})
          </h2>

          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="p-2 text-left">Reference No.</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left w-32">Actions</th>
              </tr>
            </thead>

            <tbody>
              {bills.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-500">
                    No bills found.
                  </td>
                </tr>
              )}

              {bills.map((bill) => (
                <tr
                  key={bill.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-2 font-medium">
                    {bill.reference_no}
                  </td>

                  <td className="p-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-gray-200">
                      {bill.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="p-2">
                    <button
                      onClick={() => setActiveBill(bill)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ───────── Fees Page ───────── */}
      {activeTab === "fees" && <FeesPage />}

      {/* ───────── Bill Info Modal ───────── */}
      {activeBill && (
        <BillInfoModal
          bill={activeBill}
          onClose={() => setActiveBill(null)}
        />
      )}
    </div>
  );
}

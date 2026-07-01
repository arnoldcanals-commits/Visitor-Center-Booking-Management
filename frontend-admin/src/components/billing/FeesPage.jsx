// src/pages/Fees.jsx
import { useContext, useState } from "react";
import { AdminBillingContext } from "../../contexts/AdminBillingContext";
import FeesModal from "./FeesModal";
export default function Fees() {
  const { fees, getFeeById } = useContext(AdminBillingContext);

  const [showModal, setShowModal] = useState(false);
  const [activeFee, setActiveFee] = useState(null);

  const openModal = (fee = null) => {
    setActiveFee(fee);
    setShowModal(true);
  };

  const closeModal = () => {
    setActiveFee(null);
    setShowModal(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">💸 Fee Management</h1>

      {/* Add Fee Button */}
      <div className="mb-4">
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          + Add Fee
        </button>
      </div>

      {/* Fees Table */}
      <div className="overflow-x-auto bg-white shadow rounded-xl p-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2">Name</th>
              <th className="p-2">Description</th>
              <th className="p-2">Default Amount</th>
              <th className="p-2 w-32">Actions</th>
            </tr>
          </thead>

          <tbody>
            {fees.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No fees found.
                </td>
              </tr>
            )}

            {fees.map((fee) => (
              <tr key={fee.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium">{fee.name}</td>
                <td className="p-2 text-xs text-gray-600">{fee.description}</td>
                <td className="p-2">₱{fee.default_amount}</td>
                <td className="p-2 space-x-1">
                  <button
                    onClick={() => openModal(fee)}
                    className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs"
                  >
                    View / Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fee Modal */}
      {showModal && (
        <FeesModal fee={activeFee} onClose={closeModal} />
      )}
    </div>
  );
}

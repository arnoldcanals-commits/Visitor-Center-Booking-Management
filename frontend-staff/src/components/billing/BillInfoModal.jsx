// src/components/billing/BillInfoModal.jsx
import { useContext, useState } from "react";
import { StaffBillingContext } from "../../contexts/StaffBillingContext";
import BillItemsTable from "./BillItemsTable";
import BillFeesModal from "./BillFeesModal";
import BillPdfPreviewModal from "./BillPdfPreviewModal";

export default function BillInfoModal({ bill, onClose }) {
  const {
    billAction,
    canVerify,
    canReject,
    deleteFee,
  } = useContext(StaffBillingContext);

  const [activeFeeItem, setActiveFeeItem] = useState(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const status = bill.status?.toLowerCase();

  const canIssueBill = status === "draft";
  const canMarkPaidBill = status === "issued";
  const hasTransactionImage = !!bill.transaction_image;

  const handleAction = async (action) => {
    setActionLoading(action);
    const payload = action === "mark-paid" ? {} : undefined;

    const success = await billAction(bill.id, action, payload);
    setActionLoading(null);

    if (success) onClose();
  };

  const handleAddFee = () => {
    setActiveFeeItem(null);
    setShowFeeModal(true);
  };

  const handleEditFee = (feeItem) => {
    setActiveFeeItem(feeItem);
    setShowFeeModal(true);
  };

  const handleDeleteFee = async (feeItem) => {
    if (window.confirm("Remove this fee from the bill?")) {
      await deleteFee(feeItem.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 relative overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Bill #{bill.reference_no}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Status */}
        <div className="mb-4">
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-200">
            {bill.status.toUpperCase()}
          </span>
        </div>

        {/* Bill Info */}
        <div className="mb-4 text-sm text-gray-700 space-y-1">
          <div><strong>Booking:</strong> {bill.booking_id || "Manual / Walk-in"}</div>
          <div><strong>Tourist:</strong> {bill.tourist_name || "N/A"}</div>
          <div>
            <strong>Template:</strong>{" "}
            {bill.template ? bill.template.name : "N/A"}
          </div>
          <div>
            <strong>Created:</strong>{" "}
            {new Date(bill.created_at).toLocaleString()}
          </div>
        </div>

        {/* Bill Items (Draft only) */}
        {canIssueBill && (
          <>
            <BillItemsTable
              bill={bill}
              onEditFee={handleEditFee}
              onDeleteFee={handleDeleteFee}
            />

            <button
              onClick={handleAddFee}
              className="bg-blue-600 text-white px-3 py-1 rounded mt-3"
            >
              + Add Fee
            </button>
          </>
        )}

        {/* Totals */}
        <div className="mt-4 text-right space-y-1">
          <div className="text-gray-500 text-sm">
            Base: ₱{bill.base_amount}
          </div>
          <div className="font-semibold text-lg">
            Total: ₱{bill.total_amount}
          </div>
        </div>

        {/* Documents */}
        <div className="mt-4 flex gap-4 flex-wrap text-sm">
          {bill.bill_document && (
            <button
              onClick={() => setShowPdfPreview(true)}
              className="text-blue-600 underline"
            >
              View PDF
            </button>
          )}

          {bill.transaction_image && (
            <a
              href={bill.transaction_image}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              View Transaction Image
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6 flex-wrap items-center">
          {canIssueBill && (
            <button
              onClick={() => handleAction("issue")}
              disabled={actionLoading === "issue"}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-60"
            >
              {actionLoading === "issue" ? "Issuing..." : "Issue"}
            </button>
          )}

          {canMarkPaidBill && (
            <>
              <button
                onClick={() => handleAction("mark-paid")}
                disabled={!hasTransactionImage || actionLoading === "mark-paid"}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
              >
                {actionLoading === "mark-paid"
                  ? "Marking..."
                  : "Mark Paid"}
              </button>

              {!hasTransactionImage && (
                <span className="text-xs text-red-600 ml-1">
                  * Proof of Transaction Required
                </span>
              )}
            </>
          )}

          {canVerify(bill) && (
            <button
              onClick={() => handleAction("verify")}
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
            >
              Verify
            </button>
          )}

          {canReject(bill) && (
            <button
              onClick={() => handleAction("reject")}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm"
            >
              Reject
            </button>
          )}
        </div>

        {/* Fee Modal */}
        {showFeeModal && (
          <BillFeesModal
            bill={bill}
            feeItem={activeFeeItem}
            onClose={() => setShowFeeModal(false)}
          />
        )}

        {/* PDF Preview Modal */}
        {showPdfPreview && (
          <BillPdfPreviewModal
            pdfUrl={bill.bill_document}
            onClose={() => setShowPdfPreview(false)}
          />
        )}
      </div>
    </div>
  );
}

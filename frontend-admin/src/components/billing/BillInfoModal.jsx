import { useContext, useState } from "react";
import { AdminBillingContext } from "../../contexts/AdminBillingContext";
import { 
  X, Calendar, User, Hash, FileText, 
  Plus, CheckCircle2, AlertCircle, FileSearch, 
  ExternalLink, Loader2, Receipt 
} from "lucide-react";
import BillItemsTable from "./BillItemsTable";
import BillFeesModal from "./BillFeesModal";
import BillPdfPreviewModal from "./BillPdfPreviewModal";
import BackButton from "../Back";
export default function BillInfoModal({ bill, onClose }) {
  const {
    billAction,
    canVerify,
    canReject,
    deleteFee,
  } = useContext(AdminBillingContext);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
        <BackButton />
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                Bill Details
              </h2>
              <span className="text-sm font-mono text-gray-500">#{bill.reference_no}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {/* Status Ribbons */}
          <div className="mb-6 flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Current Status</span>
              <StatusBadge status={bill.status} />
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Grand Total</span>
              <div className="text-2xl font-black text-gray-900">₱{bill.total_amount.toLocaleString()}</div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm">
            <InfoItem icon={<User size={16}/>} label="Tourist" value={bill.tourist_name || "N/A"} />
            <InfoItem icon={<Hash size={16}/>} label="Booking ID" value={bill.booking_id || "Walk-in"} />
            <InfoItem icon={<FileText size={16}/>} label="Template" value={bill.template?.name || "Standard"} />
            <InfoItem icon={<Calendar size={16}/>} label="Date Created" value={new Date(bill.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })} />
          </div>

          {/* Bill Items Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Breakdown</h3>
              {canIssueBill && (
                <button
                  onClick={handleAddFee}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Plus size={14} /> Add Extra Fee
                </button>
              )}
            </div>
            
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <BillItemsTable
                bill={bill}
                onEditFee={handleEditFee}
                onDeleteFee={handleDeleteFee}
              />
            </div>

            <div className="mt-3 p-3 bg-gray-50 rounded-lg flex justify-between items-center text-sm">
               <span className="text-gray-500">Base Amount</span>
               <span className="font-medium text-gray-700">₱{bill.base_amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Quick Documents */}
          {(bill.bill_document || bill.transaction_image) && (
            <div className="flex gap-3 mb-8">
              {bill.bill_document && (
                <button
                  onClick={() => setShowPdfPreview(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                >
                  <FileSearch size={16} className="text-blue-500" /> View PDF
                </button>
              )}
              {bill.transaction_image && (
                <a
                  href={bill.transaction_image}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                >
                  <ExternalLink size={16} className="text-emerald-500" /> Proof Image
                </a>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center gap-3">
          {canIssueBill && (
            <ActionButton 
              onClick={() => handleAction("issue")} 
              loading={actionLoading === "issue"}
              variant="primary"
              icon={<CheckCircle2 size={18}/>}
              label="Issue Bill"
            />
          )}

          {canMarkPaidBill && (
            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <ActionButton 
                onClick={() => handleAction("mark-paid")} 
                disabled={!hasTransactionImage || actionLoading === "mark-paid"}
                loading={actionLoading === "mark-paid"}
                variant="success"
                icon={<CheckCircle2 size={18}/>}
                label="Mark as Paid"
              />
              {!hasTransactionImage && (
                <div className="flex items-center gap-1 text-[11px] text-rose-500 font-medium">
                  <AlertCircle size={12}/> Needs transaction proof to proceed
                </div>
              )}
            </div>
          )}

          {canVerify(bill) && (
            <ActionButton 
              onClick={() => handleAction("verify")} 
              variant="purple"
              label="Verify Payment"
            />
          )}

          {canReject(bill) && (
            <ActionButton 
              onClick={() => handleAction("reject")} 
              variant="danger"
              label="Reject Bill"
            />
          )}
        </div>

        {/* Sub-Modals */}
        {showFeeModal && (
          <BillFeesModal
            bill={bill}
            feeItem={activeFeeItem}
            onClose={() => setShowFeeModal(false)}
          />
        )}
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

// --- Helper Components ---

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-xl">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight leading-none mb-1">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({ onClick, loading, disabled, variant, icon, label }) {
  const themes = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200",
    purple: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${themes[variant]}`}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

function StatusBadge({ status }) {
  const normalized = status?.toLowerCase();
  const styles = {
    paid: "bg-emerald-100 text-emerald-700",
    issued: "bg-blue-100 text-blue-700",
    draft: "bg-gray-100 text-gray-600",
    pending: "bg-amber-100 text-amber-700",
    overdue: "bg-rose-100 text-rose-700"
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${styles[normalized] || styles.draft}`}>
      {status}
    </span>
  );
}
import React from "react";
import { AlertTriangle, Info } from "lucide-react";

/**
 * Reusable confirmation / message modal.
 *
 * Usage:
 *   <ConfirmModal
 *     open={step === "cancel-1"}
 *     title="Cancel this booking?"
 *     message="Are you sure you want to cancel this booking?"
 *     confirmText="Continue"
 *     cancelText="Keep booking"
 *     onConfirm={...}
 *     onCancel={...}
 *   />
 *
 * For a single-button informational message (replacing window.alert),
 * omit onCancel / pass singleButton.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
  singleButton = false,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-2">
          <div
            className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
              danger
                ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                : "bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]"
            }`}
          >
            {danger ? <AlertTriangle size={18} /> : <Info size={18} />}
          </div>
          {title && (
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 pt-1.5">
              {title}
            </h3>
          )}
        </div>

        {message && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 whitespace-pre-line pl-12">
            {message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {!singleButton && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[var(--accent)] hover:opacity-90"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
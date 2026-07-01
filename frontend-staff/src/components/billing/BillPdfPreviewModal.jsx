// src/components/billing/BillPdfPreviewModal.jsx
export default function BillPdfPreviewModal({ pdfUrl, onClose }) {
  if (!pdfUrl) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-4xl h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Bill PDF Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={pdfUrl}
            title="Bill PDF"
            className="w-full h-full border-none"
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t flex justify-end gap-3">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 underline"
          >
            Open in New Tab
          </a>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

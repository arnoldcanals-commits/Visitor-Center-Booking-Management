import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheckCircle } from "react-icons/fa";

export default function GuestList({ guestList, setGuestList, showGuests, setShowGuests }) {
  const [openIndex, setOpenIndex] = useState(-1); // collapsed by default
  const [previewModal, setPreviewModal] = useState({ open: false, src: null });
  const minAge = 1;
  const maxAge = 120;

  // Check if guest is complete
  const isGuestComplete = (g) => {
    return (
      g.full_name.trim() !== "" &&
      typeof g.age === "number" &&
      g.age >= minAge &&
      g.age <= maxAge &&
      g.id_document
    );
  };

  // Update guest field
  const updateGuest = (index, field, value) => {
    setGuestList((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Add a new guest
  const addGuest = () => {
    setGuestList((prev) => [
      ...prev,
      {
        full_name: "",
        age: "",
        id_number: null,     // ✅ hidden, default null
        id_document: null,
        id_preview: null,
      },
    ]);
    setOpenIndex(-1);
  };

  // Remove guest
  const removeGuest = (index) => {
    if (guestList.length <= 1) return;

    const doc = guestList[index]?.id_preview;
    if (doc) URL.revokeObjectURL(doc);

    const newList = guestList.filter((_, i) => i !== index);
    setGuestList(newList);
    setOpenIndex(-1);
  };

  // Handle file input
  const handleFileChange = (index, file) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Only images or PDFs are allowed.");
      return;
    }

    if (guestList[index]?.id_preview) {
      URL.revokeObjectURL(guestList[index].id_preview);
    }

    let preview = null;
    const isImage = file.type.startsWith("image/");
    if (isImage) preview = URL.createObjectURL(file);

    updateGuest(index, "id_document", file);
    updateGuest(index, "id_preview", preview);

    // ✅ Auto-collapse ONLY if guest is complete
    if (isImage && isGuestComplete({ ...guestList[index], id_document: file })) {
      setOpenIndex(-1);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowGuests(!showGuests)}
        className="w-full bg-gray-200 py-2 rounded-lg text-left px-3 font-medium"
      >
        {showGuests ? "Hide Guest List" : "Show Guest List"}
      </button>

      {showGuests && (
        <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
          {guestList.map((g, idx) => {
            const complete = isGuestComplete(g);

            return (
              <div key={idx} className="border-b pb-2">
                <button
                  type="button"
                  className="w-full flex justify-between items-center font-semibold"
                  onClick={() => {
                    if (openIndex === idx) {
                      if (complete) setOpenIndex(-1);
                    } else {
                      setOpenIndex(idx);
                    }
                  }}
                >
                  <span className="flex items-center gap-2">
                    {g.full_name || `Guest ${idx + 1}`}
                    {complete && (
                      <FaCheckCircle className="text-green-600" />
                    )}
                  </span>
                  <span>{openIndex === idx ? "▲" : "▼"}</span>
                </button>

                <AnimatePresence>
                  {openIndex === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 space-y-2 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={g.full_name}
                          onChange={(e) => updateGuest(idx, "full_name", e.target.value)}
                          className="w-full border rounded-lg p-2"
                          required
                        />

                        <input
                          type="number"
                          placeholder="Age"
                          value={g.age}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = parseInt(val, 10);

                            if (val === "" || isNaN(num) || num < minAge || num > maxAge) {
                              updateGuest(idx, "age", "");
                            } else {
                              updateGuest(idx, "age", num);
                            }
                          }}
                          className="w-full border rounded-lg p-2"
                          required
                        />
                      </div>

                      {/* ID Document Upload */}
                      <div className="flex items-center gap-2">
                        <label className="block text-sm font-medium flex-1 truncate">
                          {g.id_document ? g.id_document.name : "Choose file"}
                        </label>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileChange(idx, e.target.files[0])}
                          className="hidden"
                          id={`guest-file-${idx}`}
                        />
                        <button
                          type="button"
                          className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 text-sm"
                          onClick={() =>
                            document.getElementById(`guest-file-${idx}`).click()
                          }
                        >
                          Upload
                        </button>
                        {g.id_preview && (
                          <button
                            type="button"
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                            onClick={() =>
                              setPreviewModal({ open: true, src: g.id_preview })
                            }
                          >
                            View
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeGuest(idx)}
                        className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        Remove Guest
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addGuest}
            className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Guest
          </button>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewModal.open && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewModal({ open: false, src: null })}
          >
            <motion.img
              src={previewModal.src}
              alt="Preview"
              className="max-h-[80%] max-w-[80%] object-contain rounded-lg shadow-lg"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
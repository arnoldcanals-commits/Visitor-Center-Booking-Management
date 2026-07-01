import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserPlus, Trash2, User, IdCard, 
  Calendar, X, Check, Upload, ChevronDown 
} from "lucide-react";

// --- Sub-module for individual Guest Cards ---
const GuestCard = ({ guest, index, onUpdate, onRemove }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (field, value) => {
    onUpdate(index, { ...guest, [field]: value });
  };

  const imageSrc = guest.uploaded_image 
    ? URL.createObjectURL(guest.uploaded_image) 
    : (guest.id_document_url || guest.id_document);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden mb-3 shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600">
            <User size={18} />
          </div>
          <div className="text-left">
            <span className="font-medium text-gray-700 block">
              {guest.full_name || `New Guest ${index + 1}`}
            </span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
               {guest.local ? "Local Resident" : "Foreigner"}
            </span>
          </div>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown size={20} className="text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100 bg-white"
          >
            <div className="p-4 space-y-4">
              
              {/* Is Local Checkbox */}
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer active:bg-gray-100 transition">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={guest.local || false}
                  onChange={(e) => handleChange("local", e.target.checked)}
                />
                <span className="text-sm font-semibold text-gray-700">Local Resident / Citizen</span>
              </label>

              {/* Name Field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={guest.full_name || ""} 
                    onChange={(e) => handleChange("full_name", e.target.value)} 
                  />
                </div>
              </div>

              {/* Age & ID Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Age</label>
                  <input 
                    type="number" 
                    placeholder="25" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                    value={guest.age || ""} 
                    onChange={(e) => handleChange("age", e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">ID / Passport No.</label>
                  <input 
                    type="text" 
                    placeholder="ID Number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                    value={guest.id_number || ""} 
                    onChange={(e) => handleChange("id_number", e.target.value)} 
                  />
                </div>
              </div>

              {/* Document Upload */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">ID Document</label>
                {imageSrc && (
                  <img src={imageSrc} alt="ID Preview" className="w-full h-40 object-cover rounded-lg border border-gray-200" />
                )}
                <label className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload size={18} className="text-gray-400" />
                  <span className="text-sm text-gray-600 font-medium">Upload ID Photo</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) handleChange("uploaded_image", file);
                    }} 
                  />
                </label>
              </div>

              <button 
                onClick={() => onRemove(index)}
                className="w-full flex items-center justify-center gap-2 py-2 text-red-600 bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
                <span className="text-sm font-medium">Remove Guest</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function GuestModal({ guestModal, setGuestModal, updateItem }) {
  const [isError, setIsError] = useState(false);
  if (!guestModal.open) return null;

  const handleUpdateGuest = (index, updatedGuest) => {
    const updatedGuests = [...guestModal.guests];
    updatedGuests[index] = updatedGuest;
    setGuestModal({ ...guestModal, guests: updatedGuests });
  };

  const handleAddGuest = () => {
    const newGuest = { 
      full_name: "", age: "", id_number: "", 
      id_document_url: null, uploaded_image: null, 
      local: true // Default to true for ease
    };
    setGuestModal({ ...guestModal, guests: [...guestModal.guests, newGuest] });
  };

  const handleSaveGuests = async () => {
    // Check if every guest has a name
    const isValid = guestModal.guests.every(g => g.full_name?.trim().length > 0);

    if (!isValid) {
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
      return;
    }

    const guestsToSend = guestModal.guests.map((g) => ({
      id: g.id,
      full_name: g.full_name,
      age: g.age,
      id_number: g.id_number,
      local: g.local, // Saving the checker status
      uploaded_image: g.uploaded_image || null,
      id_document_url: g.id_document_url || null,
    }));
    
    await updateItem("bookings", guestModal.bookingId, { guests: guestsToSend });
    setGuestModal({ open: false, guests: [], bookingId: null });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }}
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
      >
        <div className="p-5 border-b flex items-center justify-between bg-gray-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800">Guest Registration</h2>
          <button onClick={() => setGuestModal({ open: false, guests: [], bookingId: null })} className="p-2 hover:bg-gray-200 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 bg-white">
          {guestModal.guests.map((g, idx) => (
            <GuestCard key={idx} guest={g} index={idx} onUpdate={handleUpdateGuest} onRemove={(i) => setGuestModal({ ...guestModal, guests: guestModal.guests.filter((_, idx) => idx !== i) })} />
          ))}

          <button onClick={handleAddGuest} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 transition mb-4">
            <UserPlus size={20} />
            <span className="font-semibold">Add New Guest</span>
          </button>
        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button onClick={() => setGuestModal({ open: false, guests: [], bookingId: null })} className="flex-1 py-3 text-gray-600 font-semibold">Cancel</button>
          <motion.button 
            animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
            onClick={handleSaveGuests}
            className={`flex-1 py-3 font-semibold rounded-xl text-white shadow-lg flex items-center justify-center gap-2 transition-colors ${isError ? 'bg-red-500' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <Check size={20} />
            {isError ? "Name Required" : "Save All"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
import { motion, AnimatePresence } from "framer-motion";

export default function GuestModal({ guestModal, setGuestModal, updateItem }) {
  if (!guestModal.open) return null;

  const handleSaveGuests = async () => {
    const guestsToSend = guestModal.guests.map((g) => ({
      id: g.id,
      full_name: g.full_name,
      age: g.age,
      id_number: g.id_number,
      uploaded_image: g.uploaded_image || null,
      id_document_url: g.id_document_url || null,
    }));
    await updateItem("bookings", guestModal.bookingId, { guests: guestsToSend });
    setGuestModal({ open: false, guests: [], bookingId: null });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-96 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Guests</h2>

        <div className="space-y-2">
          {guestModal.guests.map((g, idx) => (
            <details key={idx} className="border p-2 rounded" open={false}>
              <summary className="font-semibold cursor-pointer">{g.full_name || `Guest ${idx + 1}`}</summary>
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-1 space-y-2 overflow-hidden">
                  <input type="text" placeholder="Full Name" className="w-full border p-1 rounded" value={g.full_name || ""} onChange={(e) => { const updated = [...guestModal.guests]; updated[idx].full_name = e.target.value; setGuestModal({ ...guestModal, guests: updated }); }} />
                  <input type="number" placeholder="Age" className="w-full border p-1 rounded" value={g.age || ""} onChange={(e) => { const updated = [...guestModal.guests]; updated[idx].age = e.target.value; setGuestModal({ ...guestModal, guests: updated }); }} />
                  <label className="block">
                    <span className="text-sm">ID Number</span>
                    <input type="text" className="w-full border p-1 rounded" value={g.id_number || ""} onChange={(e) => { const updated = [...guestModal.guests]; updated[idx].id_number = e.target.value; setGuestModal({ ...guestModal, guests: updated }); }} />
                  </label>
                  <label className="block">
                    <span className="text-sm">ID Image</span>
                    {(g.uploaded_image || g.id_document_url || g.id_document) && (
                      <img
                        onClick={() => setGuestModal({ ...guestModal, imagePreview: g.uploaded_image ? URL.createObjectURL(g.uploaded_image) : g.id_document_url || g.id_document })}
                        src={g.uploaded_image ? URL.createObjectURL(g.uploaded_image) : g.id_document_url || g.id_document}
                        alt="ID"
                        className="w-full h-28 object-cover rounded mb-1 cursor-pointer hover:opacity-80 transition"
                      />
                    )}
                    <input type="file" onChange={(e) => { const file = e.target.files[0]; if (file) { const updated = [...guestModal.guests]; updated[idx].uploaded_image = file; setGuestModal({ ...guestModal, guests: updated }); } }} className="w-full" />
                  </label>
                  <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => { const updated = guestModal.guests.filter((_, i) => i !== idx); setGuestModal({ ...guestModal, guests: updated }); }}>Remove</button>
                </motion.div>
              </AnimatePresence>
            </details>
          ))}
        </div>

        <button className="mt-2 px-3 py-1 bg-green-600 text-white rounded" onClick={() => setGuestModal({ ...guestModal, guests: [...guestModal.guests, { full_name: "", age: "", id_number: "", id_document_url: null, uploaded_image: null }] })}>Add Guest</button>

        <div className="flex justify-end mt-4 gap-2">
          <button onClick={handleSaveGuests} className="px-3 py-1 bg-blue-600 text-white rounded">Save Guests</button>
          <button onClick={() => setGuestModal({ open: false, guests: [], bookingId: null })} className="px-3 py-1 bg-gray-300 rounded">Close</button>
        </div>
      </div>
    </div>
  );
}

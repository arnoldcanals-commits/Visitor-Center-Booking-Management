import React from "react";
import DatePicker from "react-datepicker";
import { motion, AnimatePresence } from "framer-motion";

export default function BookingModal({ isOpen, close, form, setForm, handleSave, editing, events }) {
  
  const today = new Date();

  return (
    <AnimatePresence>
      {isOpen && (
        
        <motion.div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={close}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          
          <motion.div 
            className="bg-white p-6 rounded-xl w-96 shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
          >
            <h2 className="text-xl font-semibold mb-6">{editing ? "Edit Booking" : "Add Booking"}</h2>
            
            {/* Added a container div for consistent spacing and alignment */}
            <div className="space-y-4"> 

                {/* Event */}
                <div className="flex flex-col">
                    <label className="block text-sm mb-1 font-medium text-gray-700">Event</label>
                    <select
                      className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                      value={form.event?.id || form.event || ""}
                      onChange={(e) => setForm({ ...form, event: e.target.value })}
                    >
                      <option value="">Select event</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>{ev.package_name}</option>
                      ))}
                    </select>
                </div>

                {/* Check-in */}
                <div className="flex flex-col">
                    <label className="block text-sm mb-1 font-medium text-gray-700">Check In</label>
                    <DatePicker
                      selected={form.check_in ? new Date(form.check_in) : null}
                      onChange={(date) => setForm({ ...form, check_in: date })}
                      placeholderText="Select check-in date"
                      minDate={today}
                      // Note: DatePicker internal input needs w-full for alignment
                      className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                      dateFormat="yyyy-MM-dd"
                    />
                </div>

                {/* Check-out */}
                <div className="flex flex-col">
                    <label className="block text-sm mb-1 font-medium text-gray-700">Check Out</label>
                    <DatePicker
                      selected={form.check_out ? new Date(form.check_out) : null}
                      onChange={(date) => setForm({ ...form, check_out: date })}
                      placeholderText="Select check-out date"
                      minDate={form.check_in ? new Date(form.check_in) : today}
                      className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                      dateFormat="yyyy-MM-dd"
                    />
                </div>

                {/* Total Amount */}
                <div className="flex flex-col">
                    <label className="block text-sm mb-1 font-medium text-gray-700">Total Amount</label>
                    <input
                      type="number"
                      className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                      value={form.total_amount}
                      onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                      placeholder="e.g. 500.00"
                    />
                </div>

            </div> {/* end space-y-4 container */}


            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={close} 
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editing ? "Save Changes" : "Create Booking"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
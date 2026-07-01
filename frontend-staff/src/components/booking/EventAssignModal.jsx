import React, { useState, useEffect } from "react";
import moment from "moment";
import { CSSTransition } from "react-transition-group"; // For fade animations
import "../../styles/EventModal.css";

export default function EventAssignModal({ eventModal, setEventModal, assignEvent, createItem }) {
  const { open, booking, validEvents } = eventModal;
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    start_date: "",
    end_date: "",
    slot_limit: 10,
    is_group_event: false,
    requires_permit: false,
  });

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open]);

  // Ensure the modal only renders if open and a booking object exists
  if (!open || !booking) return null;

  const handleClose = () => {
    setEventModal({ open: false, booking: null, validEvents: [] });
    setCreating(false);
    setNewEvent({
      start_date: "",
      end_date: "",
      slot_limit: 10,
      is_group_event: false,
      requires_permit: false,
    });
  };

  const handleAssign = (event) => {
    assignEvent(event);
    handleClose();
  };

  // 🚨 CORRECTED FUNCTION: Includes integer casting and robust error handling
  const handleCreate = async () => {
    if (!newEvent.start_date || !newEvent.end_date) {
      return alert("Start and End dates required");
    }

    if (!booking.package) {
      // Safety check just in case the parent component missed it
      return alert("Error: Cannot create event, the booking is missing a package ID.");
    }

    const eventData = {
      ...newEvent,
      // FIX: Explicitly convert the package ID to an integer for the API
      package: parseInt(booking.package),
    };

    const createdSuccessfully = await createItem("events", eventData);

    if (createdSuccessfully) {
      handleClose();
    } else {
      // Provide crucial feedback to the user and prompt console check
      alert("Failed to create the event. Please check the browser console for API errors.");
    }
  };

  return (
    <CSSTransition in={open} timeout={200} classNames="fade" unmountOnExit>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 "
        onClick={handleClose} // Clicking outside closes
      >
        <div
          className="bg-white p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto relative shadow-lg transform transition-all"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>

          <h2 className="text-lg font-semibold mb-4">
            Assign Event for {booking.tourist_name || booking.tourist}
          </h2>

          {!creating ? (
            <>
              <h3 className="font-medium mb-2">Select from existing events:</h3>
              {validEvents.length > 0 ? (
                <ul className="space-y-2 mb-4">
                  {validEvents.map((ev) => (
                    <li key={ev.id} className="flex justify-between items-center border p-2 rounded">
                      <div>
                        <p className="font-medium">{ev.package_name}</p>
                        <p className="text-xs text-gray-500">
                          {moment(ev.start_date).format("MMM DD, YYYY")} -{" "}
                          {moment(ev.end_date).format("MMM DD, YYYY")}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAssign(ev)}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded"
                      >
                        Assign
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 mb-4">
                  No valid events found. You can create a new one.
                </p>
              )}

              <button
                onClick={() => setCreating(true)}
                className="px-3 py-2 bg-green-600 text-white rounded"
              >
                + Create New Event
              </button>
            </>
          ) : (
            <>
              <h3 className="font-medium mb-2">Create New Event</h3>
              <div className="flex flex-col gap-2 mb-4">
                <label>
                  Start Date:
                  <input
                    type="date"
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    className="border p-1 w-full rounded"
                  />
                </label>
                <label>
                  End Date:
                  <input
                    type="date"
                    value={newEvent.end_date}
                    onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    className="border p-1 w-full rounded"
                  />
                </label>
                <label>
                  Slot Limit:
                  <input
                    type="number"
                    min={1}
                    value={newEvent.slot_limit}
                    onChange={(e) => setNewEvent({ ...newEvent, slot_limit: parseInt(e.target.value) })}
                    className="border p-1 w-full rounded"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newEvent.is_group_event}
                    onChange={(e) => setNewEvent({ ...newEvent, is_group_event: e.target.checked })}
                  />
                  Is Group Event
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newEvent.requires_permit}
                    onChange={(e) => setNewEvent({ ...newEvent, requires_permit: e.target.checked })}
                  />
                  Requires Permit
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={handleClose} className="px-3 py-2 bg-gray-300 rounded">
                  Cancel
                </button>
                <button onClick={handleCreate} className="px-3 py-2 bg-green-600 text-white rounded">
                  Create & Assign
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </CSSTransition>
  );
}
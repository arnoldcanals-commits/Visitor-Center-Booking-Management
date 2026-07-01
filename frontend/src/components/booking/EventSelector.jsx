import { useState, useEffect } from "react";
import api from "../../api";

export default function EventSelector({ packageId, form, setForm }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!packageId) return;

    const fetchEvents = async () => {
      try {
        const res = await api.get(`api/packages/${packageId}/events/`);
        setEvents(res.data);

        if (res.data.length > 0) {
          // set default to most recent event as integer
          setForm((prev) => ({ ...prev, event: Number(res.data[0].id) }));
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchEvents();
  }, [packageId]);

  return (
    <div className="space-y-1">
      <label className="font-medium">Select Event</label>
      <select
        value={form.event || ""}
        onChange={(e) =>
          setForm({ ...form, event: e.target.value ? Number(e.target.value) : "" })
        }
        className="w-full border rounded-lg p-2"
      >
        <option value="">-- Select Event (optional) --</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {new Date(event.date).toLocaleDateString()} – {event.package_name}
          </option>
        ))}
      </select>
    </div>
  );
}

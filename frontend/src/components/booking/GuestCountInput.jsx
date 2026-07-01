import { useState, useEffect } from "react";

export default function GuestCountInput({ form, setForm, guestList, setGuestList, minGuests = 1, maxGuests = 20 }) {
  const [error, setError] = useState("");

  // Sync form.guests with guestList length
  useEffect(() => {
    if (guestList.length !== form.guests) {
      setForm((prev) => ({ ...prev, guests: guestList.length }));
    }
  }, [guestList]);

  const handleGuestCountChange = (e) => {
    let rawValue = e.target.value;

    // Allow empty temporarily
    if (rawValue === "") {
      setForm((prev) => ({ ...prev, guests: "" }));
      return;
    }

    let count = parseInt(rawValue, 10);
    if (isNaN(count)) count = minGuests;

    if (count > maxGuests) {
      count = maxGuests;
      setError(`Cannot exceed maximum of ${maxGuests} guests`);
    } else {
      setError("");
    }

    if (count < minGuests) count = minGuests;

    setForm((prev) => ({ ...prev, guests: count }));

    // Sync guestList length safely
    const newArr = [...guestList];
    if (count > newArr.length) {
      for (let i = newArr.length; i < count; i++) {
        newArr.push({ full_name: "", age: "", id_number: "" });
      }
    } else {
      newArr.length = count; // safe because count is valid integer
    }
    setGuestList(newArr);
  };

  const handleBlur = () => {
    if (form.guests === "") {
      setForm((prev) => ({ ...prev, guests: minGuests }));
      const newArr = [...guestList];
      newArr.length = Math.max(minGuests, guestList.length);
      setGuestList(newArr);
    }
  };

  return (
    <div className="space-y-1">
      <label className="font-medium">Number of Guests</label>
      <input
        type="number"
        min={minGuests}
        max={maxGuests}
        value={form.guests}
        onChange={handleGuestCountChange}
        onBlur={handleBlur}
        className="w-full border rounded-lg p-2"
        required
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

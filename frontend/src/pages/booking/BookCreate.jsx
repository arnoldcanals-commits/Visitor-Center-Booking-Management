import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Topbar from "../../components/TopBar";
import api from "../../api";
import { FaCheckCircle, FaCalendarAlt } from "react-icons/fa";
import PaymentMethodSelector from "../../components/PaymentMethodSelector";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./calendar.css";

/* =======================
   Date helpers
   ======================= */
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pkg, setPkg] = useState(null);
  const [user, setUser] = useState(null);
  const [userGuests, setUserGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    startDate: new Date(),
    endDate: new Date(),
    guests: [],
    paymentMethod: "gcash", // NEW
  });

  const fetchPackage = useCallback(async () => {
    try {
      const res = await api.get(`api/packages/${id}/`);
      setPkg(res.data);
    } catch {
      navigate("/packages");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get("api/user/me/");
      setUser(res.data);
    } catch {}
  }, []);

  const fetchUserGuests = useCallback(async () => {
    try {
      const res = await api.get("api/guests/");
      setUserGuests(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPackage();
    fetchUser();
    fetchUserGuests();
  }, [fetchPackage, fetchUser, fetchUserGuests]);

  const handleGuestToggle = (guest) => {
    setForm((f) => {
      const exists = f.guests.find((g) => g.id === guest.id);
      return exists
        ? { ...f, guests: f.guests.filter((g) => g.id !== guest.id) }
        : { ...f, guests: [...f.guests, guest] };
    });
  };

  const handleDateChange = (field, value) => {
    if (!value) return;

    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "startDate" && updated.endDate < value) {
        updated.endDate = value;
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.guests.length === 0) {
      alert("Select at least one guest!");
      return;
    }

    const payload = {
      package: pkg.id,
      check_in: startOfDay(form.startDate).toISOString(),
      check_out: endOfDay(form.endDate).toISOString(),
      payment_method: form.paymentMethod, // NEW
      guests: form.guests.map((g) => ({
        guest: g.id,
      })),
    };

    try {
      await api.post("api/booking/book/", payload);
      alert("Booking successful!");
      navigate("/profile");
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Booking failed");
    }
  };

  if (loading || !pkg || !user) return null;

  const totalSlots = Math.ceil(userGuests.length / 4) * 4;
  const placeholders = Array.from({
    length: totalSlots - userGuests.length,
  });

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;700&display=swap"
        rel="stylesheet"
      />
      <Topbar />

      <div className="max-w-6xl mx-auto p-6 mt-12">
        <div className="flex justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="bg-teal-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Return
          </button>

          <Link
            to="/profile"
            className="bg-amber-400 text-white px-4 py-2 rounded-lg font-semibold hover:bg-amber-700 transition-colors"
          >
            Edit Guest List
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-100 mb-6 bg-slate-500 rounded-lg p-2">
          Book: {pkg.name}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col lg:flex-row gap-6 bg-slate-400 p-6 rounded-lg"
        >
          {/* Left column */}
          <div className="flex-1 bg-white border rounded-lg shadow p-6 space-y-4">
            <div className="border rounded-lg overflow-hidden border-gray-300">
              {pkg.image && (
                <img
                  src={pkg.image}
                  alt={pkg.name}
                  className="w-full h-64 object-cover"
                />
              )}
              <div className="p-4">
                <h2 className="font-semibold text-xl">{pkg.name}</h2>
                <p className="text-gray-600 mt-1">{pkg.description}</p>
              </div>
            </div>

            <div className="flex justify-between font-semibold text-gray-700 text-lg">
              <span>Base Price: ₱{pkg.base_price}</span>
              <span>Total: ₱{pkg.base_price * (form.guests.length || 1)}</span>
            </div>

            {/* Payment Options */}
         <PaymentMethodSelector
  value={form.paymentMethod}
  onChange={(val) =>
    setForm((prev) => ({ ...prev, paymentMethod: val }))
  }
/>

            {/* Calendar */}
            <div className="flex space-x-4 mt-4">
              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">
                  Check-in
                </label>
                <div className="relative">
                  <DatePicker
                    selected={form.startDate}
                    onChange={(date) => handleDateChange("startDate", date)}
                    minDate={new Date()}
                    className="w-full border p-2 pl-10 rounded-lg"
                    dateFormat="MMMM d, yyyy"
                  />
                  <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">
                  Check-out
                </label>
                <div className="relative">
                  <DatePicker
                    selected={form.endDate}
                    onChange={(date) => handleDateChange("endDate", date)}
                    minDate={form.startDate}
                    className="w-full border p-2 pl-10 rounded-lg"
                    dateFormat="MMMM d, yyyy"
                  />
                  <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Guests */}
          <div className="flex-1 grid grid-cols-4 gap-4">
            {userGuests.map((g) => {
              const selected = form.guests.find((x) => x.id === g.id);
              return (
                <div
                  key={g.id}
                  onClick={() => handleGuestToggle(g)}
                  className={`aspect-square p-2 border rounded-lg cursor-pointer text-center
                    ${selected ? "bg-blue-100 border-blue-500" : "bg-gray-50"}`}
                >
                  <h3 className="font-semibold text-sm">{g.full_name}</h3>
                  <p className="text-xs">Age: {g.age}</p>
                  {selected && (
                    <FaCheckCircle className="text-blue-500 mx-auto mt-1" />
                  )}
                </div>
              );
            })}

            {placeholders.map((_, i) => (
              <div key={i} className="aspect-square invisible" />
            ))}
          </div>
        </form>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            className="bg-sky-700 text-white py-3 px-6 rounded-lg font-semibold hover:bg-sky-900"
          >
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
}

import { useContext, useEffect, useRef, useState, useMemo } from "react";
import { StationContext } from "../../contexts/StationStaffDataContext";
import {
  FiCheckCircle,
  FiXCircle,
  FiCamera,
  FiUpload,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";
import { Html5Qrcode } from "html5-qrcode";

export default function StationDashboard() {
  const { 
    station, 
    stationData, 
    scanQR, 
    submitChecks, 
    loading, 
    canScan,
    setIsActivelyScanning 
  } = useContext(StationContext);

  const qrRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastCoords = useRef(null); // Store coords to avoid re-fetching inside the loop

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState(null);
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [currentCheck, setCurrentCheck] = useState(null);
  const [readOnly, setReadOnly] = useState(false);

  const [selectedGuests, setSelectedGuests] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const getCoordinates = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject("GPS Not Supported");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lastCoords.current = pos.coords;
          resolve(pos.coords);
        },
        (err) => reject("Location Access Required"),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  useEffect(() => {
    setIsActivelyScanning?.(scannerOpen || checkModalOpen || scanning || submitting);
  }, [scannerOpen, checkModalOpen, scanning, submitting, setIsActivelyScanning]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // -------------------------
  // Fixed Camera Logic
  // -------------------------
  const startCamera = async () => {
    if (!canScan) return;
    
    // 1. Force GPS check BEFORE opening camera
    setScanning(true);
    try {
      await getCoordinates();
    } catch (e) {
      setToast({ type: "error", message: "Error: Location is mandatory to start." });
      setScannerOpen(false);
      setScanning(false);
      return;
    }

    // 2. Clear existing instance
    if (qrRef.current) await stopCamera();

    qrRef.current = new Html5Qrcode("qr-reader");
    const config = { 
        fps: 15, // Slightly higher for smoother detection
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
    };

    try {
      await qrRef.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          // STOP scanning immediately on find to prevent loop-hang
          if (qrRef.current) {
            await qrRef.current.pause(true); 
          }
          await handleScan(decodedText);
        }
      );
    } catch (err) {
      setToast({ type: "error", message: "Camera failed to start." });
      setScannerOpen(false);
    } finally {
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (qrRef.current) {
      try {
        if (qrRef.current.isScanning) {
          await qrRef.current.stop();
        }
      } catch (e) {
        console.warn("Camera stop error", e);
      } finally {
        qrRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (scannerOpen) startCamera();
    else stopCamera();
    return () => { if (qrRef.current) stopCamera(); };
  }, [scannerOpen]);

  // -------------------------
  // Handle QR scan
  // -------------------------
  const handleScan = async (code) => {
    setScanning(true);
    try {
      // Use the cached coords or fetch fresh ones quickly
      const coords = lastCoords.current || await getCoordinates();
      
      const data = await scanQR({
        code,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      setCurrentCheck(data);
      setSelectedGuests([]);
      setSelectedGuide(null);
      setCheckModalOpen(true);
      setScannerOpen(false); // This triggers stopCamera via useEffect
      setReadOnly(false);
      setToast({ type: "success", message: "Verified" });
    } catch (err) {
      // If error, resume scanner so they can try again
      if (qrRef.current && scannerOpen) {
          qrRef.current.resume();
      }
      const msg = err?.response?.data?.detail || "Invalid QR or Location Error";
      setToast({ type: "error", message: msg });
    } finally {
      setScanning(false); 
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !canScan) return;
    setScanning(true);
    const reader = new Html5Qrcode("hidden-qr-reader");
    try {
      const decodedText = await reader.scanFile(file, true);
      await handleScan(decodedText);
    } catch (err) {
      setToast({ type: "error", message: "No QR code found" });
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  };

  // -------------------------
  // Submit checks
  // -------------------------
  const handleSubmitChecks = async () => {
    if (!currentCheck || submitting) return;
    setSubmitting(true);
    try {
      const coords = await getCoordinates();
      await submitChecks({
        guestCheckIds: selectedGuests,
        guideCheckId: selectedGuide,
        coords: { latitude: coords.latitude, longitude: coords.longitude },
      });
      setToast({ type: "success", message: "Success" });
      setCheckModalOpen(false);
    } catch (err) {
      setToast({ type: "error", message: "Update failed" });
    } finally {
      setSubmitting(false);
    }
  };

  // Recent Activity memo logic (same as before)
  const recentScans = useMemo(() => {
    return (stationData?.dashboard || []).map((event) => {
      const stationCheck = event.station_checks?.find(sc => sc.event === event.id) || event.station_checks?.[0];
      const guestChecks = stationCheck?.guest_checks || [];
      const guideCheck = stationCheck?.guide_check;
      const times = [...guestChecks.map(g => g.checked_at), guideCheck?.checked_at].filter(Boolean);
      return {
        id: event.id,
        title: event.package_name || "Event",
        time: times.length ? times.sort().pop() : null,
        status: times.length > 0 ? "complete" : "pending",
        stationCheck: stationCheck,
      };
    });
  }, [stationData]);

  if (!canScan) return <div className="p-10 text-center">Access Restricted</div>;

  return (
    <div className="min-h-screen bg-gray-50/50 pt-12 pb-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        
        {toast && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full shadow-lg text-white font-medium ${
            toast.type === "success" ? "bg-teal-600" : "bg-red-500"
          }`}>
            {toast.message}
          </div>
        )}

        {scanning && (
          <div className="fixed inset-0 bg-white/40 backdrop-blur-[2px] z-[150] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        )}

        {/* Station Info */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase text-teal-600 font-bold">Station</p>
            <h1 className="text-xl font-black">{station?.name}</h1>
          </div>
          <FiCheckCircle className="text-teal-600" size={24}/>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="col-span-3 bg-teal-600 text-white font-bold py-4 rounded-2xl shadow-md flex items-center justify-center gap-2"
          >
            <FiCamera size={22} /> Start QR Scan
          </button>
          <button
            onClick={() => { getCoordinates().catch(()=>{}); fileInputRef.current.click(); }}
            className="col-span-1 border-2 border-gray-200 bg-white rounded-2xl flex items-center justify-center"
          >
            <FiUpload size={22} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
        </div>

        {scannerOpen && (
          <div className="bg-black rounded-3xl overflow-hidden relative border-4 border-white shadow-2xl">
            <button
              onClick={() => setScannerOpen(false)}
              className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white z-20"
            >
              <FiX size={20} />
            </button>
            <div id="qr-reader" className="w-full aspect-square" />
          </div>
        )}

        {/* Activity List */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50/50 font-bold text-gray-700">Recent Activity</div>
          {loading ? (
            <div className="p-10 text-center text-gray-400">Loading...</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentScans.slice(0, 6).map((scan) => (
                <li
                  key={scan.id}
                  className="flex justify-between items-center p-5 hover:bg-teal-50/30 cursor-pointer"
                  onClick={() => {
                    setCurrentCheck(scan.stationCheck);
                    setCheckModalOpen(true);
                    setReadOnly(true);
                    setSelectedGuests(scan.stationCheck?.guest_checks?.filter(g => g.checked).map(g => g.id) || []);
                    setSelectedGuide(scan.stationCheck?.guide_check?.checked ? scan.stationCheck.guide_check.id : null);
                  }}
                >
                  <div>
                    <div className="font-bold">{scan.title}</div>
                    <div className="text-[10px] text-gray-400">
                      {scan.time ? new Date(scan.time).toLocaleTimeString() : 'Pending'}
                    </div>
                  </div>
                  {scan.status === "complete" ? <FiCheckCircle className="text-green-500" /> : <FiXCircle className="text-red-400" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Check Modal */}
      {checkModalOpen && currentCheck && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-6">
            <h3 className="text-xl font-black">Check-in</h3>
            <div className="space-y-4">
              {currentCheck.guide_check && (
                <div className="p-4 rounded-xl border">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-teal-600"
                      checked={selectedGuide === currentCheck.guide_check.id || currentCheck.guide_check.checked}
                      onChange={() => !currentCheck.guide_check.checked && setSelectedGuide(prev => prev ? null : currentCheck.guide_check.id)}
                      disabled={readOnly || currentCheck.guide_check.checked}
                    />
                    <span className="font-bold">{currentCheck.guide_check.guide_name} (Guide)</span>
                  </label>
                </div>
              )}
              <div className="space-y-2">
                {currentCheck.guest_checks?.map((g) => (
                  <div key={g.id} className="p-3 rounded-xl border">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-teal-600"
                        checked={selectedGuests.includes(g.id) || g.checked}
                        onChange={() => !g.checked && setSelectedGuests(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id])}
                        disabled={readOnly || g.checked}
                      />
                      <span className={g.checked ? 'text-gray-400' : ''}>{g.guest_name}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {!readOnly && (
                <button
                  onClick={handleSubmitChecks}
                  disabled={submitting || (selectedGuests.length === 0 && !selectedGuide)}
                  className="w-full bg-teal-600 text-white font-bold py-4 rounded-2xl disabled:bg-gray-200"
                >
                  {submitting ? "Processing..." : "Confirm Checks"}
                </button>
              )}
              <button onClick={() => setCheckModalOpen(false)} className="w-full bg-gray-100 py-3 rounded-2xl font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
      <div id="hidden-qr-reader" className="hidden" />
    </div>
  );
}
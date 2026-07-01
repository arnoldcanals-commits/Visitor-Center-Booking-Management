import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthPanel from "../components/AuthPanel";
import LogoutButton from "../components/LogoutButton";
import PackageList from "../components/PackageList";
import TopBar from "../components/TopBar";
import { ACCESS_TOKEN } from "../constants";
import "../styles/Home.css";

export default function Home() {
  const [auth, setAuth] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // ✅ Check for an existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN);

    if (!token) {
      setAuth(false);
      setLoading(false);
      return;
    }

    setAuth(true);
  }, []);

  // ✅ Fetch packages after successful login
  useEffect(() => {
    if (!auth) return;

    const token = localStorage.getItem(ACCESS_TOKEN);

    fetch("/api/home/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.has_active_booking) {
          navigate("/my-booking");
          return;
        }

        setPackages(data.packages || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Home API error:", err);
        setLoading(false);
      });
  }, [auth, navigate]);

  // ✅ Still unauthenticated → show AuthPanel
  if (!auth) {
    return (
      <AuthPanel
        onLoginSuccess={() => setAuth(true)}  // ✅ update Home state
        closePanel={() => {}}                 // ✅ safe no-op for ✖ button
      />
    );
  }

  // ✅ After login but still loading data
  if (loading) return <div>Loading...</div>;

  // ✅ Fully authenticated
  return (
    <div className="home-container">
      <TopBar />

      <div className="home-header">
        <h2>Tour Packages</h2>
        <LogoutButton />
      </div>

      <PackageList packages={packages} />
    </div>
  );
}

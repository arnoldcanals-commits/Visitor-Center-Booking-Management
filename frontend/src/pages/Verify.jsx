import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";


import TopBar from "../components/TopBar";
import "../styles/Home.css"

import api from "../api";


export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    const uid = searchParams.get("uid");
    const token = searchParams.get("token");

    if (!uid || !token) {
      setStatus("invalid");
      return;
    }

    axios
      .post("/api/verify-email/", { uid, token })
      .then(() => {
        setStatus("success");
        setTimeout(() => navigate("/"), 2000);
      })
      .catch(() => {
        setStatus("error");
      });
  }, [searchParams, navigate]);

  return (

    <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <TopBar/>
      {status === "verifying" && <p>Verifying your email…</p>}
      {status === "success" && <p>✅ Email verified! Redirecting to login…</p>}
      {status === "error" && <p>❌ Verification link is invalid or expired.</p>}
      {status === "invalid" && <p>❌ Invalid verification link.</p>}

    </div>
 
  );
}

import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Register from "./pages/Register";     // ✅ keep this, ensures default import
import Home from "./pages/home";
import Test from "./pages/test";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import SearchPage from "./pages/SearchPage";
//packages
import PackagesList from "./pages/packages/PackageList";
import PackageCreate from "./pages/packages/PackageCreate";
import PackageEdit from "./pages/packages/PackageEdit";
import PackageView from "./pages/packages/PackageView";
import GuestManagement from "./pages/Guests";
//booking
import BookCreate from "./pages/booking/BookCreate";
import BookingView from "./pages/booking/BookingView";

import './charts/ChartjsConfig';
import './css/style.css';
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPanel from "./components/AuthPanel";
import InformationView from "./pages/Information";
import Footer from "./components/Footer";
import VerifyEmail from "./pages/Verify";
import { useEffect } from "react";

function Logout() {
  useEffect(() => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  }, []);
  return <Navigate to="/" replace />;
}

function RegisterAndLogout() {
  localStorage.clear();
  return <Register />;   // ✅ Valid now, no changes needed
}

function App() {
  // ✅ GLOBAL AUTH
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("access")
  );

  // ✅ AUTH PANEL CONTROL
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"

  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setAuthPanelOpen(true);
  };

  return (
    <BrowserRouter>
      {/* ✅ Global Auth Panel */}
      <div>
      {authPanelOpen && (
        <AuthPanel
          defaultMode={authMode}
          closePanel={() => setAuthPanelOpen(false)}
          onLoginSuccess={() => setIsAuthenticated(true)}
        />
      )}

      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
               <Dashboard />
            </ProtectedRoute>
          }
        />

           <Route
          path="/booking/book/:id/"
          element={
            <ProtectedRoute>
               <BookCreate />
            </ProtectedRoute>
          }
        />

           <Route
          path="/guests/"
          element={
            <ProtectedRoute>
               <GuestManagement />
            </ProtectedRoute>
          }
        />

              <Route
          path="/profile/"
          element={
            <ProtectedRoute>
               <Profile />
            </ProtectedRoute>
          }
        />

        {/* ✅ pass openAuth to Home */}
        <Route path="/" element={<Home openAuth={openAuth} />} />
          <Route path="/information"element={<InformationView />} />

        <Route path="/register" element={<RegisterAndLogout />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
        <Route path="/logout" element={<Logout />} />

       <Route path="*" element={<Navigate to="/" replace />} />

        <Route path="/search" element={<SearchPage />} />
        <Route path="/test" element={<Test />} />

        <Route path="/packages" element={<PackagesList />} />
        <Route path="/packages/create" element={<PackageCreate />} />
          
        <Route path="/packages/:id" element={<PackageView />} />
        <Route path="/packages/:id/edit" element={<PackageEdit />} />


        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/booking/my/" element={<BookingView/>} />
      </Routes>
      <Footer></Footer>
      </div>

    </BrowserRouter>
  );
}

export default App;

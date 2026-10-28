import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Register from "./pages/Register";
import Home from "./pages/Home";
import Test from "./pages/test";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import SearchPage from "./pages/SearchPage";
import Travel from "./pages/travel";
import PermitPage from "./pages/Permit";
//packages
import PackagesList from "./pages/packages/PackageList";

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
import Sidebar from "./components/Sidebar";

import VerifyEmail from "./pages/Verify";
import AuthProvider, { AuthContext } from "./components/Auth";

function Logout() {
  useEffect(() => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  }, []);
  return <Navigate to="/" replace />;
}

function RegisterAndLogout() {
  localStorage.clear();
  return <Register />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("access")
  );
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
 

  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setAuthPanelOpen(true);
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-900">
          {/* Column 1: sidebar */}
          <Sidebar />

          {/* Column 2: everything else, stacked vertically */}
          <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
           

            {authPanelOpen && (
              <AuthPanel
                defaultMode={authMode}
                closePanel={() => setAuthPanelOpen(false)}
                onLoginSuccess={() => setIsAuthenticated(true)}
              />
            )}

            <main className="flex-1">
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
                  path="/profile/"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Home openAuth={openAuth} />} />
                <Route path="/information" element={<InformationView />} />
                <Route path="/register" element={<RegisterAndLogout />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/test" element={<Test />} />
                <Route path="/packages" element={<PackagesList />} />
     
                <Route path="/packages/:id" element={<PackageView />} />
                <Route path="/packages/:id/edit" element={<PackageEdit />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/booking/my/" element={<BookingView />} />
                <Route path="/travel" element={<Travel />} />
                <Route path="/guests/" element={<GuestManagement />} />
                 <Route path="/permit/" element={<PermitPage />} />
              </Routes>
            </main>

            <Footer />
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
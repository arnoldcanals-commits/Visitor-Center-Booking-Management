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
import GlobalMessageModal from "./components/GlobalMessageModal";
import InformationView from "./pages/Information";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import { SidebarContext } from "./components/SidebarContext";

import VerifyEmail from "./pages/Verify";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ArticleDetail from "./pages/ArticleDetail";
import AuthProvider, { AuthContext } from "./components/Auth";
import { clearAuthTokens, getAuthToken } from "./utils/authTokens";

function Logout() {
  useEffect(() => {
    clearAuthTokens();
  }, []);
  return <Navigate to="/" replace />;
}

function RegisterAndLogout() {
  clearAuthTokens();
  return <Register />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!getAuthToken("access")
  );
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
 

  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setAuthPanelOpen(true);
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <SidebarContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed }}>
          <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-slate-900">
            {/* Column 1: sidebar */}
            <Sidebar collapsed={sidebarCollapsed} />

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
                <Route path="/" element={<Dashboard />} />
                <Route path="/information" element={<InformationView />} />
                <Route path="/register" element={<RegisterAndLogout />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/articles/:slug" element={<ArticleDetail />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/test" element={<Test />} />
                <Route path="/packages" element={<Home openAuth={openAuth} />} />
     
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
          <GlobalMessageModal />
        </SidebarContext.Provider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
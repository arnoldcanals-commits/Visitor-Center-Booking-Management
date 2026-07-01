import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// ================= STAFF PAGES =================
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Packages from "./pages/Packages";
import Events from "./pages/Events";
import Bookings from "./pages/Bookings";
import Guests from "./pages/Guests";
import Permits from "./pages/Permits";
import Ratings from "./pages/Ratings";
import QRCodes from "./pages/QRCodes";
import Billing from "./pages/Billing";

// ================= TOUR GUIDE PAGES =================
import TourGuideDashboard from "./pages/tourguide/Dashboard";
import TourGuideBookings from "./pages/tourguide/Bookings";
import TourGuideEvents from "./pages/tourguide/Events";
import TourGuideReviews from "./pages/tourguide/Reviews";
import TourGuideProfile from "./pages/tourguide/Profile";
import TourGuideEventDetail from "./pages/tourguide/TourGuideEventDetail";

// ================= STATION STAFF PAGES =================
import StationDashboard from "./pages/station/Dashboard";
import StationProfile from "./pages/station/Profile";

// ================= GUARDS & CONTEXT =================
import RoleRoute from "./components/RoleRoute";
import { AuthProvider, AuthContext } from "./contexts/AuthContext";
import { StaffDataProvider } from "./contexts/StaffDataContext";
import { StaffBillingProvider } from "./contexts/StaffBillingContext";
import { TourGuideDataProvider } from "./contexts/TourGuideDataContext";
import { StationProvider } from "./contexts/StationStaffDataContext";

// ================= LAYOUT =================
import Layout from "./components/Layout";

import "./charts/ChartjsConfig";
import "./css/style.css";

// =====================================================
// Root Redirect
// =====================================================
function RootRedirect() {
  const { user } = React.useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "tour_guide") {
    return <Navigate to="/tour-guide" replace />;
  }

  if (user.role === "station_staff") {
    return <Navigate to="/station" replace />;
  }

  // staff / admin
  return <Navigate to="/staff" replace />;
}

// =====================================================
// Login Guard
// =====================================================
function LoginGuard({ children }) {
  const { user } = React.useContext(AuthContext);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// =====================================================
// Logout
// =====================================================
function Logout() {
  const { logout } = React.useContext(AuthContext);

  React.useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
}

// =====================================================
// Routes
// =====================================================
function AppRoutes() {
  return (
    <Routes>
      {/* ================= PUBLIC ================= */}
      <Route
        path="/login"
        element={
          <LoginGuard>
            <Login />
          </LoginGuard>
        }
      />
      <Route path="/logout" element={<Logout />} />

      {/* ================= ROOT ================= */}
      <Route path="/" element={<RootRedirect />} />

      {/* ================= STAFF AREA ================= */}
      <Route
        path="/staff"
        element={
          <RoleRoute allow={["staff", "admin"]}>
            <StaffDataProvider>
              <StaffBillingProvider>
                <Layout />
              </StaffBillingProvider>
            </StaffDataProvider>
          </RoleRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="packages" element={<Packages />} />
        <Route path="events" element={<Events />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="guests" element={<Guests />} />
        <Route path="permits" element={<Permits />} />
        <Route path="ratings" element={<Ratings />} />
        <Route path="qrcodes" element={<QRCodes />} />
        <Route path="billing" element={<Billing />} />
      </Route>

      {/* ================= STATION STAFF AREA ================= */}
      <Route
        path="/station"
        element={
          <RoleRoute allow={["station_staff"]}>
            <StationProvider>
              <Layout />
            </StationProvider>
          </RoleRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StationDashboard />} />
        <Route path="profile" element={<StationProfile />} />
      </Route>

      {/* ================= TOUR GUIDE AREA ================= */}
      <Route
        path="/tour-guide"
        element={
          <RoleRoute allow={["tour_guide"]}>
            <TourGuideDataProvider>
              <Layout />
            </TourGuideDataProvider>
          </RoleRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TourGuideDashboard />} />
        <Route path="bookings" element={<TourGuideBookings />} />
        <Route path="events" element={<TourGuideEvents />} />
        <Route path="reviews" element={<TourGuideReviews />} />
        <Route path="profile" element={<TourGuideProfile />} />
        <Route path="events/:id" element={<TourGuideEventDetail />} />

      </Route>

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// =====================================================
// App Root
// =====================================================
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

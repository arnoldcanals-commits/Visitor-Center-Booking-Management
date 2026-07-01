// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Packages from "./pages/Packages";
import Events from "./pages/Events";
import Bookings from "./pages/Bookings";
import Ratings from "./pages/Ratings";
import Tracking from "./pages/Tracking";
import Reports from "./pages/Reports";
import Billing from "./pages/Billing";
import Transport from "./pages/Transport";
import FeesManager from "./pages/FeesManager";
import SystemSettings from "./pages/SystemSettings";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, AuthContext } from "./contexts/AuthContext";
import { AdminDataProvider } from "./contexts/AdminDataContext";
import { AdminBillingProvider } from "./contexts/AdminBillingContext";

import Layout from "./components/Layout";

import "./charts/ChartjsConfig";
import "./css/style.css";

function Logout() {
  const { logout } = React.useContext(AuthContext);

  React.useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = React.useContext(AuthContext);

  return (
    <Routes>
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
      />

      <Route path="/logout" element={<Logout />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="packages" element={<Packages />} />
        <Route path="events" element={<Events />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="tracking" element={<Tracking />} />
         <Route path="ratings" element={<Ratings />} />
        <Route path="billing" element={<Billing />} />
                <Route path="fees" element={<FeesManager />} />
        <Route path="billing/:refNumber" element={<Billing />} />
           <Route path="reports" element={<Reports />} />
        <Route path="systemsetting" element={<SystemSettings />} />
        <Route path="transport" element={<Transport />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdminDataProvider>
        <AdminBillingProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          </AdminBillingProvider>
      </AdminDataProvider>
    </AuthProvider>
  );
}

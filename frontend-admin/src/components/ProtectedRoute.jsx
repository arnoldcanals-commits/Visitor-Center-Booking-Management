import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

function ProtectedRoute({ children }) {
  const { user, authLoading } = useContext(AuthContext);

  if (authLoading) return <div>Loading...</div>;

  return user ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
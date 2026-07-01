import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // ✅ correct import
import api from "../api";
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../constants";
import { useState, useEffect } from "react";

function ProtectedRoute({ children }) {
    const [isAuthorized, setIsAuthorized] = useState(null);

    useEffect(() => {
        auth().catch(() => {
            localStorage.removeItem(ACCESS_TOKEN);
            localStorage.removeItem(REFRESH_TOKEN);
            setIsAuthorized(false);
        });
    }, []);

    const refreshToken = async () => {
        const refresh = localStorage.getItem(REFRESH_TOKEN);
        if (!refresh) return false;

        try {
            const res = await api.post("api/token/refresh/", { refresh });
            if (res.status === 200) {
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                return true;
            }
        } catch (error) {
            console.error("Refresh token failed:", error);
        }
        return false;
    };

    const auth = async () => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (!token) {
            setIsAuthorized(false);
            return;
        }

        const decoded = jwtDecode(token); // ✅ correct
        const now = Date.now() / 1000;

        if (decoded.exp < now) {
            const refreshed = await refreshToken();
            setIsAuthorized(refreshed);
        } else {
            setIsAuthorized(true);
        }
    };

    if (isAuthorized === null) return <div>Loading...</div>;

    return isAuthorized ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;

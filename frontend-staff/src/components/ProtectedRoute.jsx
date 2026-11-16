import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // ✅ correct import
import api from "../api";
import { useState, useEffect } from "react";
import {
    clearAuthTokens,
    getAuthToken,
    updateAccessToken,
} from "../utils/authTokens";

function ProtectedRoute({ children }) {
    const [isAuthorized, setIsAuthorized] = useState(null);

    useEffect(() => {
        auth().catch(() => {
            clearAuthTokens();
            setIsAuthorized(false);
        });
    }, []);

    const refreshToken = async () => {
        const refresh = getAuthToken("refresh");
        if (!refresh) return false;

        try {
            const res = await api.post("/api/staff/token/refresh/", { refresh });
            if (res.status === 200) {
                updateAccessToken(res.data.access);
                return true;
            }
        } catch (error) {
            console.error("Refresh token failed:", error);
            clearAuthTokens();
        }
        return false;
    };

    const auth = async () => {
        const token = getAuthToken("access");
        if (!token) {
            setIsAuthorized(await refreshToken());
            return;
        }

        const decoded = jwtDecode(token); // ✅ correct
        const now = Date.now() / 1000;

        if (!decoded.exp || decoded.exp <= now) {
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

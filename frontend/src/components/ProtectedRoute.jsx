import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
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
        })
    }, [])

    const refreshToken = async () => {
        const refreshToken = getAuthToken("refresh");
        if (!refreshToken) return false;
        try {
            const res = await api.post("/api/token/refresh/", {
                refresh: refreshToken,
            });
            if (res.status === 200) {
                updateAccessToken(res.data.access)
                setIsAuthorized(true)
                return true;
            } else {
                setIsAuthorized(false)
                return false;
            }
        } catch (error) {
            console.error("Refresh token failed:", error);
            clearAuthTokens();
            setIsAuthorized(false);
            return false;
        }
    };

    const auth = async () => {
        const token = getAuthToken("access");
        if (!token) {
            setIsAuthorized(await refreshToken());
            return;
        }
        const decoded = jwtDecode(token);
        const tokenExpiration = decoded.exp;
        const now = Date.now() / 1000;

        if (!tokenExpiration || tokenExpiration <= now) {
            setIsAuthorized(await refreshToken());
        } else {
            setIsAuthorized(true);
        }
    };

    if (isAuthorized === null) {
        return <div>Loading...</div>;
    }

    return isAuthorized ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;
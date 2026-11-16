// pages/Login.jsx
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import Form from "../components/Form";
import { AuthContext } from "../contexts/AuthContext";
import { showGlobalMessage } from "../utils/globalMessages";
import { clearAuthTokens, getAuthToken } from "../utils/authTokens";

function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (credentials) => {
    const success = await login(credentials);

    if (success) {
      // Decode token to check if user is admin
      const access = getAuthToken("access");
      const tokenData = access ? JSON.parse(atob(access.split(".")[1])) : null;

      if (tokenData?.is_admin) {
        navigate("/dashboard", { replace: true });
      } else {
        showGlobalMessage("Only admin users can log in.", "error");
        clearAuthTokens();
      }
    } else {
      showGlobalMessage("Login failed. Check your credentials.", "error");
    }
  };

  return (
    <Form
      route="/api/token/"
      method="login"
      onSubmit={handleLogin} // pass our custom handler
    />
  );
}

export default Login;

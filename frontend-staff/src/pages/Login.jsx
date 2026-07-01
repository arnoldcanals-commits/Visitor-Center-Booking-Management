// pages/Login.jsx
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import Form from "../components/Form";
import { AuthContext } from "../contexts/AuthContext";

function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (credentials) => {
    const success = await login(credentials);

    if (success) {
      // Decode token to check if user is admin
      const access = localStorage.getItem("access");
      const tokenData = access ? JSON.parse(atob(access.split(".")[1])) : null;

      if (tokenData?.is_admin) {
        navigate("/dashboard", { replace: true });
      } else {
        alert("Only admin users can log in.");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
      }
    } else {
      alert("Login failed. Check your credentials.");
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

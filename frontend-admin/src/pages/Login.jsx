// pages/Login.jsx
import React, { useContext } from "react";
import Form from "../components/Form";
import { AuthContext } from "../contexts/AuthContext";
import { showGlobalMessage } from "../utils/globalMessages";

function Login() {
  const { login } = useContext(AuthContext);

  const handleLogin = async (credentials) => {
  // Must be set before login() runs, since setting the AuthContext user
  // (inside login()) triggers the /login -> /dashboard redirect
  // synchronously, and Dashboard reads this flag on that very mount.
  sessionStorage.setItem("showWelcome", "true");

  const success = await login(credentials);

  if (!success) {
    // Login failed — don't leave the flag armed for a future session.
    sessionStorage.removeItem("showWelcome");
    showGlobalMessage("Login failed. Check your credentials.", "error");
  }
};

  return <Form onSubmit={handleLogin} />;
}

export default Login;
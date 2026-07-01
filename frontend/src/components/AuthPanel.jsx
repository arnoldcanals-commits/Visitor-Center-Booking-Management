import React, { useState } from "react";
import Form from "./Form.jsx";

export default function AuthPanel({ defaultMode = "login", closePanel, onLoginSuccess }) {
  const [mode, setMode] = useState(defaultMode);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={closePanel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-96 p-6 relative transform transition-transform duration-300 scale-95 hover:scale-100 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closePanel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-lg"
        >
          ✖
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold text-teal-600 mb-4 text-center">
          {mode === "login" ? "Welcome Back" : "Create an Account"}
        </h2>

        {/* Form */}
        <div className="mb-4">
          {mode === "login" ? (
            <Form
              route="/api/login/"
              method="login"
              onAuthSuccess={() => {
                onLoginSuccess();
                closePanel();
              }}
            />
          ) : (
            <Form
              route="/api/user/register/"
              method="register"
              onAuthSuccess={() => setMode("login")}
            />
          )}
        </div>

        {/* Mode toggle at bottom */}
        <div className="text-center mt-4">
          {mode === "login" ? (
            <p className="text-sm text-gray-600">
              No account?{" "}
              <button
                className="text-teal-600 font-semibold hover:underline"
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button
                className="text-teal-600 font-semibold hover:underline"
                onClick={() => setMode("login")}
              >
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

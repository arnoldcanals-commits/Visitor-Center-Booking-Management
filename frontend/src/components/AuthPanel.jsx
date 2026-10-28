import React, { useState } from "react";
import Form from "./Form.jsx";

export default function AuthPanel({ defaultMode = "login", closePanel, onLoginSuccess }) {
  const [mode, setMode] = useState(defaultMode);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-[backdropFadeIn_0.25s_ease-out]"
      onClick={closePanel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-[90vw] sm:w-140 p-6 relative animate-[panelIn_0.35s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closePanel}
          className="absolute top-4 right-4 text-gray-500 text-lg transition-all duration-200 hover:text-gray-800 hover:rotate-90 active:scale-90"
        >
          ✖
        </button>

        {/* Badge */}
        <div className="flex justify-center mb-3">
          <span
            key={mode}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold tracking-wide uppercase animate-[badgeIn_0.4s_cubic-bezier(0.16,1,0.3,1)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            {mode === "login" ? "Welcome Back" : "New Here"}
          </span>
        </div>

        {/* Header */}
        <h2
          key={`heading-${mode}`}
          className="text-2xl font-bold text-teal-600 mb-4 text-center animate-[fadeIn_0.3s_ease-out]"
        >
          {mode === "login" ? "Sign In" : "Create an Account"}
        </h2>

        {/* Form */}
        <div key={`form-${mode}`} className="mb-4 text-gray-700 animate-[fadeIn_0.35s_ease-out]">
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
                className="text-teal-600 font-semibold transition-colors duration-150 hover:text-teal-800 hover:underline"
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button
                className="text-teal-600 font-semibold transition-colors duration-150 hover:text-teal-800 hover:underline"
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
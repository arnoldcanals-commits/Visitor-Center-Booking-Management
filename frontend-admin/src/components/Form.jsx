import { useState } from "react";
import LoadingIndicator from "./LoadingIndicator";

// This component no longer calls login() or navigate() itself — it just
// collects credentials and hands them to whatever `onSubmit` the parent
// provides. Previously it did its own login + redirect internally, which
// meant Login.jsx's handleLogin (and the welcome animation it triggers)
// was never reached: this component was navigating away on its own before
// Login.jsx's logic ever ran.
function Form({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ email, password });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="
        relative mx-auto my-10 w-full max-w-[420px]
        rounded-2xl border border-blue-500/20
        bg-white/80 backdrop-blur-lg
        shadow-xl shadow-blue-500/10
        p-6
      "
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-blue-600 tracking-wide">
          Admin Portal
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Admin only
        </p>
      </div>

      {/* Email */}
      <input
        className="
          w-full p-3 mb-3 rounded-lg
          border border-gray-300
          focus:outline-none focus:ring-2 focus:ring-blue-500
          focus:border-transparent
          transition
        "
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        required
      />

      {/* Password */}
      <div className="relative mb-4">
        <input
          className="
            w-full p-3 rounded-lg
            border border-gray-300
            pr-14
            focus:outline-none focus:ring-2 focus:ring-blue-500
            focus:border-transparent
            transition
          "
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />

        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            text-sm font-medium text-blue-600
            hover:text-blue-700
            transition
          "
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="my-3 flex justify-center">
          <LoadingIndicator />
        </div>
      )}

      {/* Submit */}
      <button
        className="
          w-full mt-2 p-3 rounded-lg
          bg-blue-500 text-white font-semibold
          hover:bg-blue-600
          active:scale-[0.98]
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-all
        "
        type="submit"
        disabled={loading}
      >
        Sign In
      </button>
    </form>
  );
}

export default Form;
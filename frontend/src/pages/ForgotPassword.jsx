import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import TopBar from "../components/TopBar";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const { data } = await api.post("/api/forgot-password/", { email });
      setMessage(data.message || "If the email exists, a reset link was sent.");
    } catch (requestError) {
      const data = requestError.response?.data;
      setError(
        data?.error ||
          data?.detail ||
          "Unable to request a password reset. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar />
      <main className="mx-auto max-w-lg px-4 py-12">
        <section className="rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Enter your account email and we’ll send a password reset link if it
            matches an account.
          </p>

          {message && (
            <p role="status" className="mt-5 rounded-lg bg-green-100 p-3 text-sm text-green-800">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-red-100 p-3 text-sm text-red-800">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6">
            <label
              htmlFor="reset-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <Link
            to="/"
            className="mt-5 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Back to the site
          </Link>
        </section>
      </main>
    </div>
  );
}

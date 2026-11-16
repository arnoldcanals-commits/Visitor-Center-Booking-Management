import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import TopBar from "../components/TopBar";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (password !== passwordConfirmation) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/reset-password/", {
        uid,
        token,
        password,
      });
      setMessage(data.message || "Your password has been reset.");
      setPassword("");
      setPasswordConfirmation("");
    } catch (requestError) {
      const data = requestError.response?.data;
      setError(
        data?.errors?.join(" ") ||
          data?.error ||
          data?.detail ||
          "Unable to reset the password. The link may be invalid or expired."
      );
    } finally {
      setLoading(false);
    }
  };

  const hasResetCredentials = Boolean(uid && token);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar />
      <main className="mx-auto max-w-lg px-4 py-12">
        <section className="rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reset your password
          </h1>

          {!hasResetCredentials ? (
            <>
              <p role="alert" className="mt-4 text-sm text-red-700">
                This reset link is incomplete. Request a new one to continue.
              </p>
              <Link
                to="/forgot-password"
                className="mt-5 inline-block font-medium text-blue-600 hover:underline"
              >
                Request a new reset link
              </Link>
            </>
          ) : (
            <>
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

              {message ? (
                <Link
                  to="/"
                  className="mt-5 inline-block font-medium text-blue-600 hover:underline"
                >
                  Return to the site
                </Link>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="new-password"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      New password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Confirm new password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Resetting..." : "Reset password"}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

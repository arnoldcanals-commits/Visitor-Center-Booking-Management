import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import LoadingIndicator from "./LoadingIndicator";

function Form({ route, method, onAuthSuccess }) {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const name = method === "login" ? "Login" : "Register";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const payload =
                method === "login"
                    ? { email, password }
                    : { username, email, password, password2 };

            const minDelay = new Promise((resolve) => setTimeout(resolve, 1500));

            const [res] = await Promise.all([
                api.post(route, payload),
                minDelay,
            ]);

            // ✅ LOGIN FLOW
            if (method === "login") {
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh);

                if (onAuthSuccess) onAuthSuccess();
                return;
            }

            // ✅ REGISTER FLOW
            setMessage(
                "Registration successful! Please check your email to verify your account."
            );

            // Optional auto-redirect or state reset
            setUsername("");
            setEmail("");
            setPassword("");
            setPassword2("");
        } catch (err) {
            const data = err.response?.data;

            // 🔐 Email not verified (from backend)
            if (
                typeof data === "string" &&
                data.toLowerCase().includes("verify")
            ) {
                setError(data);
            } else if (data?.non_field_errors) {
                setError(data.non_field_errors[0]);
            } else if (data) {
                setError(JSON.stringify(data));
            } else {
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col items-center justify-center mx-auto my-6 p-5 max-w-[520px] rounded-lg shadow-md bg-white/10 backdrop-blur-md transition-shadow duration-300 hover:shadow-lg"
        >
            <h1 className="text-xl font-bold mb-4">
                {name}
            </h1>

            {/* ✅ SUCCESS MESSAGE */}
            {message && (
                <div className="w-11/12 mb-3 p-2 text-sm text-green-700 bg-green-100 rounded animate-[fadeIn_0.3s_ease-out]">
                    {message}
                </div>
            )}

            {/* ❌ ERROR MESSAGE */}
            {error && (
                <div className="w-11/12 mb-3 p-2 text-sm text-red-700 bg-red-100 rounded animate-[fadeIn_0.3s_ease-out]">
                    {error}
                </div>
            )}

            {/* LOGIN */}
            {method === "login" && (
                <>
                    <input
                        className="w-11/12 p-2 my-2 border border-gray-300 rounded outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                    />

                    <div className="w-11/12 relative my-2">
                        <input
                            className="w-full p-2 border border-gray-300 rounded pr-12 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 transition-transform duration-150 hover:text-gray-800 hover:scale-110 active:scale-95"
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>

                    {/* 🔗 Forgot Password Hook */}
                    <div className="w-11/12 text-right text-sm mt-1">
                        
                         <a   href="/forgot-password"
                            className="text-blue-600 transition-colors duration-150 hover:text-blue-800 hover:underline"
                        >
                            Forgot password?
                        </a>
                    </div>
                </>
            )}

            {/* REGISTER */}
            {method !== "login" && (
                <>
                    <div className="w-full flex flex-col md:flex-row md:gap-2">
                        <input
                            className="w-full p-2 my-2 border border-gray-300 rounded outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            required
                        />
                        <input
                            className="w-full p-2 my-2 border border-gray-300 rounded outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                        />
                    </div>

                    <div className="w-full flex flex-col md:flex-row md:gap-2">
                        <div className="w-full relative">
                            <input
                                className="w-full p-2 my-2 border border-gray-300 rounded pr-12 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 transition-transform duration-150 hover:text-gray-800 hover:scale-110 active:scale-95"
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>

                        <div className="w-full relative">
                            <input
                                className="w-full p-2 my-2 border border-gray-300 rounded pr-12 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                type={showPassword2 ? "text" : "password"}
                                value={password2}
                                onChange={(e) => setPassword2(e.target.value)}
                                placeholder="Confirm Password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword2((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 transition-transform duration-150 hover:text-gray-800 hover:scale-110 active:scale-95"
                            >
                                {showPassword2 ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {loading && (
                <div className="animate-[fadeIn_0.2s_ease-out]">
                    <LoadingIndicator />
                </div>
            )}

            <button
                className="w-11/12 p-3 mt-4 bg-blue-600 text-white rounded transition-all duration-200 hover:bg-blue-700 hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                type="submit"
                disabled={loading}
            >
                {name}
            </button>
        </form>
    );
}

export default Form;
import React, { useState, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

const API_BASE_URL = "https://jobtracker-adjt.onrender.com/api/v1";

interface RegisterResponse {
    status: "success" | "error";
    message: string;
    data?: {
        token?: string;
        access_token?: string;
        user?: User;
        [key: string]: any;
    };
}

interface User {
    id: number;
    name: string;
    email: string;
    role_id?: number;
    [key: string]: any;
}

interface RegisterPageProps {
    onRegisterSuccess?: (token: string, user: User) => void;
}

export default function RegisterPage({ onRegisterSuccess }: RegisterPageProps) {
    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            setError("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    password_confirmation: confirmPassword,
                }),
            });

            const json: RegisterResponse = await res.json();

            if (!res.ok || json.status === "error") {
                throw new Error(json.message || "Registration failed. Please try again.");
            }

            const payload = json.data ?? (json as any);
            const token: string | undefined =
                payload?.token ?? payload?.access_token;
            const user: User | undefined = payload?.user ?? payload;

            if (!token) {
                throw new Error("Registration succeeded but no token was returned.");
            }
            if (!user) {
                throw new Error("Registration succeeded but no user data was returned.");
            }

            localStorage.setItem("auth_token", token);
            onRegisterSuccess?.(token, user);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Something went wrong.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0d] p-6 font-sans">
            <div className="text-center mb-8">
                <div className="text-5xl mb-3">📋</div>
                <h1 className="text-3xl font-extrabold text-[#f5a623] m-0">
                    JobTrack
                </h1>
                <p className="text-sm text-[#888] mt-1">
                    Job Work &amp; Subcontract Tracking
                </p>
            </div>

            <form
                className="w-full max-w-[380px] bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6"
                onSubmit={handleSubmit}
            >
                <h2 className="text-lg font-bold text-white mb-5">Create Account</h2>

                {error && (
                    <div className="bg-red-500/15 border border-red-500/40 text-[#ff8080] rounded-lg px-3 py-2.5 text-sm mb-4">
                        {error}
                    </div>
                )}

                <label className="block text-sm text-[#aaa] mb-1.5 font-semibold">
                    Full Name
                </label>
                <input
                    className="w-full box-border bg-[#111] rounded-xl border border-[#2a2a2a] text-white text-base px-3.5 py-3 mb-4 focus:outline-none focus:border-[#f5a623] transition-colors"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    autoComplete="name"
                />

                <label className="block text-sm text-[#aaa] mb-1.5 font-semibold">
                    Email
                </label>
                <input
                    className="w-full box-border bg-[#111] rounded-xl border border-[#2a2a2a] text-white text-base px-3.5 py-3 mb-4 focus:outline-none focus:border-[#f5a623] transition-colors"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="username"
                />

                <label className="block text-sm text-[#aaa] mb-1.5 font-semibold">
                    Password
                </label>
                <div className="relative mb-4">
                    <input
                        className="w-full box-border bg-[#111] rounded-xl border border-[#2a2a2a] text-white text-base px-3.5 py-3 pr-12 focus:outline-none focus:border-[#f5a623] transition-colors"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 m-0 flex items-center justify-center cursor-pointer"
                        onClick={() => setShowPassword((v) => !v)}
                    >
                        {showPassword ? (
                            <EyeOff size={18} color="#666" />
                        ) : (
                            <Eye size={18} color="#666" />
                        )}
                    </button>
                </div>

                <label className="block text-sm text-[#aaa] mb-1.5 font-semibold">
                    Confirm Password
                </label>
                <div className="relative mb-6">
                    <input
                        className="w-full box-border bg-[#111] rounded-xl border border-[#2a2a2a] text-white text-base px-3.5 py-3 pr-12 focus:outline-none focus:border-[#f5a623] transition-colors"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 m-0 flex items-center justify-center cursor-pointer"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                    >
                        {showConfirmPassword ? (
                            <EyeOff size={18} color="#666" />
                        ) : (
                            <Eye size={18} color="#666" />
                        )}
                    </button>
                </div>

                <button
                    type="submit"
                    className={`w-full bg-[#f5a623] text-black border-none rounded-xl py-3.5 text-base font-bold cursor-pointer transition-opacity ${
                        loading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
                    }`}
                    disabled={loading}
                >
                    {loading ? "Creating account…" : "Create Account"}
                </button>

                <p className="text-center text-sm text-[#aaa] mt-4.5">
                    Already have an account?{" "}
                    <a href="/login" className="text-[#f5a623] font-bold no-underline hover:underline">
                        Sign In
                    </a>
                </p>
            </form>

            <p className="text-center text-xs text-[#666] mt-6">
                Manufacturing MSME Platform · Tamil Nadu
            </p>
        </div>
    );
}
import React, { useState, FormEvent } from "react";
import { Eye, EyeOff, ArrowLeft, KeyRound, Mail, Lock, ShieldCheck } from "lucide-react";

const API_BASE_URL = "https://jobtracker-adjt.onrender.com/api/v1";

interface LoginResponse {
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

interface LoginPageProps {
    onLoginSuccess?: (token: string, user: User) => void;
}

type ForgotStep = "email" | "otp" | "reset" | "done";

function validateEmail(email: string): string {
    if (!email.trim()) return "Email address is required.";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email.trim())) return "Please enter a valid email address.";
    return "";
}

function validatePassword(pw: string): string {
    if (!pw) return "Password is required.";
    if (pw.length < 8) return "Password must be at least 8 characters.";
    return "";
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
    // ── Login state ──
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

    // ── Forgot Password state ──
    const [showForgot, setShowForgot] = useState(false);
    const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
    const [fpEmail, setFpEmail] = useState("");
    const [fpOtp, setFpOtp] = useState("");
    const [fpOtpRevealed, setFpOtpRevealed] = useState(""); // shown from API in dev mode
    const [fpNewPw, setFpNewPw] = useState("");
    const [fpConfirmPw, setFpConfirmPw] = useState("");
    const [showFpNewPw, setShowFpNewPw] = useState(false);
    const [showFpConfirmPw, setShowFpConfirmPw] = useState(false);
    const [fpLoading, setFpLoading] = useState(false);
    const [fpError, setFpError] = useState("");
    const [fpSuccess, setFpSuccess] = useState("");
    const [fpFieldErrors, setFpFieldErrors] = useState<Record<string, string>>({});
    const [otpTimer, setOtpTimer] = useState(0);

    // ── Login handlers ──
    const validateLoginForm = () => {
        const errors: { email?: string; password?: string } = {};
        const emailErr = validateEmail(email);
        if (emailErr) errors.email = emailErr;
        if (!password.trim()) errors.password = "Password is required.";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        if (!validateLoginForm()) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
            });

            const json: LoginResponse = await res.json();
            if (!res.ok || json.status === "error") {
                throw new Error(json.message || "Invalid email or password.");
            }

            const payload = json.data ?? (json as any);
            const token: string | undefined = payload?.token ?? payload?.access_token;
            const user: User | undefined = payload?.user ?? payload;

            if (!token) throw new Error("Login succeeded but no token was returned.");
            if (!user) throw new Error("Login succeeded but no user data was returned.");

            localStorage.setItem("auth_token", token);
            localStorage.setItem("auth_user", JSON.stringify(user));

            if (onLoginSuccess) {
                onLoginSuccess(token, user);
            } else {
                const savedMode = localStorage.getItem("app_mode");
                window.location.href = savedMode ? "/dashboard" : "/select-role";
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    // ── Forgot Password handlers ──
    const openForgot = () => {
        setShowForgot(true);
        setForgotStep("email");
        setFpEmail("");
        setFpOtp("");
        setFpOtpRevealed("");
        setFpNewPw("");
        setFpConfirmPw("");
        setFpError("");
        setFpSuccess("");
        setFpFieldErrors({});
    };

    const closeForgot = () => {
        setShowForgot(false);
    };

    // Step 1: Send OTP
    const handleSendOtp = async (e: FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        const emailErr = validateEmail(fpEmail);
        if (emailErr) errors.email = emailErr;
        setFpFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setFpLoading(true);
        setFpError("");
        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ email: fpEmail.trim().toLowerCase() }),
            });
            const json = await res.json();
            if (!res.ok || json.status === "error") throw new Error(json.message);

            // Dev mode: OTP returned in response
            if (json.data?.otp) setFpOtpRevealed(json.data.otp);

            // Start 15-min countdown
            setOtpTimer(15 * 60);
            const interval = setInterval(() => {
                setOtpTimer((t) => {
                    if (t <= 1) { clearInterval(interval); return 0; }
                    return t - 1;
                });
            }, 1000);

            setForgotStep("otp");
            setFpSuccess("Reset code generated! Enter the 6-digit code below.");
        } catch (err: any) {
            setFpError(err.message || "Failed to send reset code.");
        } finally {
            setFpLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e: FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!fpOtp.trim() || fpOtp.trim().length !== 6) errors.otp = "Enter the 6-digit reset code.";
        if (!/^\d{6}$/.test(fpOtp.trim())) errors.otp = "Reset code must be 6 digits only.";
        setFpFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setFpLoading(true);
        setFpError("");
        try {
            const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ email: fpEmail.trim().toLowerCase(), otp: fpOtp.trim() }),
            });
            const json = await res.json();
            if (!res.ok || json.status === "error") throw new Error(json.message);
            setForgotStep("reset");
            setFpSuccess("");
        } catch (err: any) {
            setFpError(err.message || "Invalid or expired code.");
        } finally {
            setFpLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e: FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        const pwErr = validatePassword(fpNewPw);
        if (pwErr) errors.newPw = pwErr;
        if (!fpConfirmPw) errors.confirmPw = "Please confirm your new password.";
        else if (fpNewPw !== fpConfirmPw) errors.confirmPw = "Passwords do not match.";
        setFpFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setFpLoading(true);
        setFpError("");
        try {
            const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({
                    email: fpEmail.trim().toLowerCase(),
                    otp: fpOtp.trim(),
                    new_password: fpNewPw,
                    confirm_password: fpConfirmPw,
                }),
            });
            const json = await res.json();
            if (!res.ok || json.status === "error") throw new Error(json.message);
            setForgotStep("done");
            setFpSuccess("Password reset successfully! You can now sign in with your new password.");
        } catch (err: any) {
            setFpError(err.message || "Failed to reset password.");
        } finally {
            setFpLoading(false);
        }
    };

    const formatTimer = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    // ── Strength indicator ──
    const getStrength = (pw: string) => {
        if (!pw) return { label: "", color: "", width: "0%" };
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        const map = [
            { label: "Weak", color: "#ef4444", width: "25%" },
            { label: "Fair", color: "#f97316", width: "50%" },
            { label: "Good", color: "#eab308", width: "75%" },
            { label: "Strong", color: "#22c55e", width: "100%" },
        ];
        return map[score - 1] ?? { label: "", color: "", width: "0%" };
    };

    const strength = getStrength(fpNewPw);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0d] p-6 font-sans">
            <div className="text-center mb-8">
                <div className="text-5xl mb-3">📋</div>
                <h1 className="text-3xl font-extrabold text-[#f5a623] m-0">JobTrack</h1>
                <p className="text-sm text-[#888] mt-1">Job Work &amp; Subcontract Tracking</p>
            </div>

            {/* ── Login Form ── */}
            <form
                className="w-full max-w-[380px] bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6"
                onSubmit={handleSubmit}
                noValidate
            >
                <h2 className="text-lg font-bold text-white mb-5">Sign In</h2>

                {error && (
                    <div className="bg-red-500/15 border border-red-500/40 text-[#ff8080] rounded-lg px-3 py-2.5 text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* Email */}
                <div className="mb-4">
                    <label className="block text-sm text-[#aaa] mb-1.5 font-semibold">Email</label>
                    <input
                        className={`w-full box-border bg-[#111] rounded-xl border ${fieldErrors.email ? "border-red-500" : "border-[#2a2a2a]"} text-white text-base px-3.5 py-3 focus:outline-none focus:border-[#f5a623] transition-colors`}
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: "" })); }}
                        placeholder="you@example.com"
                        autoComplete="username"
                    />
                    {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
                </div>

                {/* Password */}
                <div className="mb-2">
                    <label className="block text-sm text-[#aaa] mb-1.5 font-semibold">Password</label>
                    <div className="relative">
                        <input
                            className={`w-full box-border bg-[#111] rounded-xl border ${fieldErrors.password ? "border-red-500" : "border-[#2a2a2a]"} text-white text-base px-3.5 py-3 pr-12 focus:outline-none focus:border-[#f5a623] transition-colors`}
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: "" })); }}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 m-0 flex items-center cursor-pointer"
                            onClick={() => setShowPassword((v) => !v)}
                        >
                            {showPassword ? <EyeOff size={18} color="#666" /> : <Eye size={18} color="#666" />}
                        </button>
                    </div>
                    {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
                </div>

                {/* Forgot Password link */}
                <div className="flex justify-end mb-5">
                    <button
                        type="button"
                        onClick={openForgot}
                        className="text-xs text-[#f5a623] bg-transparent border-none cursor-pointer hover:underline p-0"
                    >
                        Forgot password?
                    </button>
                </div>

                <button
                    type="submit"
                    className={`w-full bg-[#f5a623] text-black border-none rounded-xl py-3.5 text-base font-bold cursor-pointer transition-opacity ${loading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}
                    disabled={loading}
                >
                    {loading ? "Signing in…" : "Sign In"}
                </button>

                <p className="text-center text-sm text-[#aaa] mt-4">
                    Don&apos;t have an account?{" "}
                    <a href="/register" className="text-[#f5a623] font-bold no-underline hover:underline">Register</a>
                </p>
            </form>

            <p className="text-center text-xs text-[#666] mt-6">Manufacturing MSME Platform · Tamil Nadu</p>

            {/* ── Forgot Password Modal ── */}
            {showForgot && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) closeForgot(); }}
                >
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6">
                            {forgotStep !== "email" && forgotStep !== "done" && (
                                <button
                                    type="button"
                                    onClick={() => setForgotStep(forgotStep === "otp" ? "email" : "otp")}
                                    className="bg-[#222] hover:bg-[#2a2a2a] border border-[#333] rounded-xl p-2 cursor-pointer text-[#aaa] transition-colors"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                            )}
                            <div>
                                <h2 className="text-white font-black text-base m-0 flex items-center gap-2">
                                    <KeyRound size={18} className="text-amber-400" />
                                    {forgotStep === "email" && "Reset Password"}
                                    {forgotStep === "otp" && "Enter Reset Code"}
                                    {forgotStep === "reset" && "Set New Password"}
                                    {forgotStep === "done" && "Password Reset!"}
                                </h2>
                                <p className="text-[#666] text-xs mt-0.5">
                                    {forgotStep === "email" && "Enter your registered email address"}
                                    {forgotStep === "otp" && `Code sent to ${fpEmail}`}
                                    {forgotStep === "reset" && "Create a strong new password"}
                                    {forgotStep === "done" && "Your account is secured"}
                                </p>
                            </div>
                        </div>

                        {/* Step indicator */}
                        {forgotStep !== "done" && (
                            <div className="flex gap-1.5 mb-5">
                                {["email", "otp", "reset"].map((s, i) => (
                                    <div
                                        key={s}
                                        className={`h-1 flex-1 rounded-full transition-all ${
                                            ["email", "otp", "reset"].indexOf(forgotStep) >= i
                                                ? "bg-amber-400"
                                                : "bg-[#2a2a2a]"
                                        }`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Errors / Success */}
                        {fpError && (
                            <div className="bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl px-3 py-2.5 text-xs mb-4">
                                {fpError}
                            </div>
                        )}
                        {fpSuccess && forgotStep !== "done" && (
                            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl px-3 py-2.5 text-xs mb-4">
                                {fpSuccess}
                            </div>
                        )}

                        {/* ─── Step: Email ─── */}
                        {forgotStep === "email" && (
                            <form onSubmit={handleSendOtp} noValidate>
                                <div className="mb-4">
                                    <label className="block text-xs text-[#aaa] font-semibold mb-1.5 flex items-center gap-1.5">
                                        <Mail size={13} /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={fpEmail}
                                        onChange={(e) => { setFpEmail(e.target.value); setFpFieldErrors((f) => ({ ...f, email: "" })); }}
                                        placeholder="your@email.com"
                                        className={`w-full bg-[#111] rounded-xl border ${fpFieldErrors.email ? "border-red-500" : "border-[#2a2a2a]"} text-white text-sm px-3.5 py-3 focus:outline-none focus:border-[#f5a623] transition-colors`}
                                    />
                                    {fpFieldErrors.email && <p className="text-red-400 text-xs mt-1">{fpFieldErrors.email}</p>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={fpLoading}
                                    className={`w-full bg-[#f5a623] text-black rounded-xl py-3 text-sm font-bold border-none cursor-pointer transition-opacity ${fpLoading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}
                                >
                                    {fpLoading ? "Sending…" : "Send Reset Code"}
                                </button>
                            </form>
                        )}

                        {/* ─── Step: OTP ─── */}
                        {forgotStep === "otp" && (
                            <form onSubmit={handleVerifyOtp} noValidate>
                                {/* Dev hint — remove in production */}
                                {fpOtpRevealed && (
                                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-300 mb-4 flex items-center gap-2">
                                        <ShieldCheck size={14} />
                                        <span>Dev mode — your code: <strong className="font-mono text-amber-400">{fpOtpRevealed}</strong></span>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="block text-xs text-[#aaa] font-semibold mb-1.5">
                                        6-Digit Reset Code
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={fpOtp}
                                        onChange={(e) => { setFpOtp(e.target.value.replace(/\D/g, "")); setFpFieldErrors((f) => ({ ...f, otp: "" })); }}
                                        placeholder="000000"
                                        className={`w-full bg-[#111] rounded-xl border ${fpFieldErrors.otp ? "border-red-500" : "border-[#2a2a2a]"} text-white text-xl font-mono tracking-widest text-center px-3.5 py-3 focus:outline-none focus:border-[#f5a623] transition-colors`}
                                    />
                                    {fpFieldErrors.otp && <p className="text-red-400 text-xs mt-1">{fpFieldErrors.otp}</p>}
                                    {otpTimer > 0 && (
                                        <p className="text-[#666] text-xs mt-1 text-right">
                                            Expires in <span className="text-amber-400 font-mono">{formatTimer(otpTimer)}</span>
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={fpLoading || fpOtp.length !== 6}
                                    className={`w-full bg-[#f5a623] text-black rounded-xl py-3 text-sm font-bold border-none cursor-pointer transition-opacity ${(fpLoading || fpOtp.length !== 6) ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}
                                >
                                    {fpLoading ? "Verifying…" : "Verify Code"}
                                </button>
                                <button
                                    type="button"
                                    disabled={fpLoading || otpTimer > 0}
                                    onClick={handleSendOtp as any}
                                    className={`w-full mt-2.5 bg-transparent text-[#888] text-xs border border-[#2a2a2a] rounded-xl py-2.5 cursor-pointer transition-colors ${otpTimer > 0 ? "opacity-40 cursor-not-allowed" : "hover:text-white hover:border-[#444]"}`}
                                >
                                    Resend Code
                                </button>
                            </form>
                        )}

                        {/* ─── Step: New Password ─── */}
                        {forgotStep === "reset" && (
                            <form onSubmit={handleResetPassword} noValidate>
                                <div className="mb-4">
                                    <label className="block text-xs text-[#aaa] font-semibold mb-1.5 flex items-center gap-1.5">
                                        <Lock size={13} /> New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showFpNewPw ? "text" : "password"}
                                            value={fpNewPw}
                                            onChange={(e) => { setFpNewPw(e.target.value); setFpFieldErrors((f) => ({ ...f, newPw: "" })); }}
                                            placeholder="Min. 8 characters"
                                            className={`w-full bg-[#111] rounded-xl border ${fpFieldErrors.newPw ? "border-red-500" : "border-[#2a2a2a]"} text-white text-sm px-3.5 py-3 pr-11 focus:outline-none focus:border-[#f5a623] transition-colors`}
                                        />
                                        <button type="button" onClick={() => setShowFpNewPw((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0">
                                            {showFpNewPw ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}
                                        </button>
                                    </div>
                                    {fpFieldErrors.newPw && <p className="text-red-400 text-xs mt-1">{fpFieldErrors.newPw}</p>}
                                    {/* Strength bar */}
                                    {fpNewPw && (
                                        <div className="mt-2">
                                            <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{ width: strength.width, backgroundColor: strength.color }}
                                                />
                                            </div>
                                            <p className="text-xs mt-1" style={{ color: strength.color }}>{strength.label}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-5">
                                    <label className="block text-xs text-[#aaa] font-semibold mb-1.5">Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showFpConfirmPw ? "text" : "password"}
                                            value={fpConfirmPw}
                                            onChange={(e) => { setFpConfirmPw(e.target.value); setFpFieldErrors((f) => ({ ...f, confirmPw: "" })); }}
                                            placeholder="Repeat new password"
                                            className={`w-full bg-[#111] rounded-xl border ${fpFieldErrors.confirmPw ? "border-red-500" : fpConfirmPw && fpConfirmPw === fpNewPw ? "border-emerald-500" : "border-[#2a2a2a]"} text-white text-sm px-3.5 py-3 pr-11 focus:outline-none focus:border-[#f5a623] transition-colors`}
                                        />
                                        <button type="button" onClick={() => setShowFpConfirmPw((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0">
                                            {showFpConfirmPw ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}
                                        </button>
                                    </div>
                                    {fpFieldErrors.confirmPw && <p className="text-red-400 text-xs mt-1">{fpFieldErrors.confirmPw}</p>}
                                    {fpConfirmPw && fpConfirmPw === fpNewPw && !fpFieldErrors.confirmPw && (
                                        <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1"><ShieldCheck size={11} /> Passwords match</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={fpLoading}
                                    className={`w-full bg-[#f5a623] text-black rounded-xl py-3 text-sm font-bold border-none cursor-pointer transition-opacity ${fpLoading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}
                                >
                                    {fpLoading ? "Resetting…" : "Reset Password"}
                                </button>
                            </form>
                        )}

                        {/* ─── Step: Done ─── */}
                        {forgotStep === "done" && (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                    <ShieldCheck size={32} className="text-emerald-400" />
                                </div>
                                <p className="text-white font-bold mb-1">Password Reset Successfully!</p>
                                <p className="text-[#888] text-xs mb-6">You can now sign in with your new password.</p>
                                <button
                                    type="button"
                                    onClick={closeForgot}
                                    className="w-full bg-[#f5a623] text-black rounded-xl py-3 text-sm font-bold border-none cursor-pointer hover:opacity-90"
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        )}

                        {/* Cancel */}
                        {forgotStep !== "done" && (
                            <button
                                type="button"
                                onClick={closeForgot}
                                className="w-full mt-3 bg-transparent text-[#666] text-xs border-none cursor-pointer hover:text-[#888] py-1"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
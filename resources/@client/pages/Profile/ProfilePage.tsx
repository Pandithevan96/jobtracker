import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Phone, Shield, Key, LogOut, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '@/services/apiClient';

// Password strength calculator
const getStrength = (pw: string) => {
    if (!pw) return { label: '', color: '', width: '0%', score: 0 };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const map = [
        { label: 'Weak',   color: '#ef4444', width: '25%', score: 1 },
        { label: 'Fair',   color: '#f97316', width: '50%', score: 2 },
        { label: 'Good',   color: '#eab308', width: '75%', score: 3 },
        { label: 'Strong', color: '#22c55e', width: '100%', score: 4 },
    ];
    return map[score - 1] ?? { label: '', color: '', width: '0%', score: 0 };
};

export const ProfilePage: React.FC = () => {
    const { user, logout } = useAuth();

    // ── Change Password form state ──
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>({});

    const strength = getStrength(newPassword);

    const validateForm = () => {
        const errors: typeof fieldErrors = {};

        if (!currentPassword) {
            errors.currentPassword = 'Current password is required.';
        }

        if (!newPassword) {
            errors.newPassword = 'New password is required.';
        } else if (newPassword.length < 8) {
            errors.newPassword = 'New password must be at least 8 characters.';
        } else if (newPassword === currentPassword) {
            errors.newPassword = 'New password must be different from your current password.';
        }

        if (!confirmPassword) {
            errors.confirmPassword = 'Please confirm your new password.';
        } else if (confirmPassword !== newPassword) {
            errors.confirmPassword = 'Passwords do not match.';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);

        if (!validateForm()) return;

        setLoading(true);
        try {
            await apiClient.post('/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            setMsg({ type: 'success', text: '✓ Password updated successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setFieldErrors({});
        } catch (err: any) {
            const message =
                err?.response?.data?.message ??
                err?.message ??
                'Failed to update password. Please try again.';
            setMsg({ type: 'error', text: message });
        } finally {
            setLoading(false);
        }
    };

    const getRoleLabel = () => {
        const roleId = user?.role_id;
        if (roleId === 1) return 'Admin';
        if (roleId === 2) return 'Principal';
        if (roleId === 3) return 'Vendor';
        return user?.role || 'User';
    };

    const inputClass = (hasError: boolean, hasSuccess?: boolean) =>
        `w-full bg-[#111] rounded-xl border ${
            hasError ? 'border-red-500' : hasSuccess ? 'border-emerald-500' : 'border-[#2a2a2a]'
        } text-white text-sm px-3.5 py-2.5 pr-11 focus:outline-none focus:border-[#f5a623] transition-colors`;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    My Profile <User className="text-[#f5a623]" size={24} />
                </h1>
                <p className="text-xs text-[#888] mt-1">Manage your account information &amp; credentials</p>
            </div>

            {/* ── User Info Card ── */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#f5a623] text-black font-black text-2xl flex items-center justify-center uppercase flex-shrink-0">
                    {user?.name ? user.name.charAt(0) : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">{user?.name || 'User'}</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail size={12} className="text-[#666]" />
                        <p className="text-xs text-[#888] truncate">{user?.email || '—'}</p>
                    </div>
                    {user?.phone && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone size={12} className="text-[#666]" />
                            <p className="text-xs text-[#888]">{user.phone}</p>
                        </div>
                    )}
                    <span className="inline-block mt-2 text-[10px] font-bold uppercase bg-[#f5a623]/20 text-[#f5a623] px-2.5 py-0.5 rounded border border-[#f5a623]/30">
                        {getRoleLabel()}
                    </span>
                </div>
            </div>

            {/* ── Change Password Card ── */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-5">
                    <Key size={18} className="text-amber-400" />
                    Change Account Password
                </h3>

                {msg && (
                    <div
                        className={`flex items-start gap-2 p-3 rounded-xl text-xs font-semibold mb-5 ${
                            msg.type === 'success'
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                        }`}
                    >
                        {msg.type === 'success' ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                        {msg.text}
                    </div>
                )}

                <form onSubmit={handlePasswordChange} noValidate className="space-y-4">

                    {/* Current Password */}
                    <div>
                        <label className="block text-xs text-[#aaa] font-semibold mb-1.5 flex items-center gap-1.5">
                            <Shield size={12} className="text-[#666]" /> Current Password
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => { setCurrentPassword(e.target.value); setFieldErrors((f) => ({ ...f, currentPassword: '' })); setMsg(null); }}
                                placeholder="Enter your current password"
                                className={inputClass(!!fieldErrors.currentPassword)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent((v) => !v)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 flex items-center"
                            >
                                {showCurrent ? <EyeOff size={15} color="#666" /> : <Eye size={15} color="#666" />}
                            </button>
                        </div>
                        {fieldErrors.currentPassword && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle size={11} /> {fieldErrors.currentPassword}
                            </p>
                        )}
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-xs text-[#aaa] font-semibold mb-1.5 flex items-center gap-1.5">
                            <Key size={12} className="text-[#666]" /> New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => { setNewPassword(e.target.value); setFieldErrors((f) => ({ ...f, newPassword: '' })); setMsg(null); }}
                                placeholder="Min. 8 characters"
                                className={inputClass(!!fieldErrors.newPassword)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew((v) => !v)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 flex items-center"
                            >
                                {showNew ? <EyeOff size={15} color="#666" /> : <Eye size={15} color="#666" />}
                            </button>
                        </div>
                        {fieldErrors.newPassword && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle size={11} /> {fieldErrors.newPassword}
                            </p>
                        )}

                        {/* Strength bar */}
                        {newPassword && (
                            <div className="mt-2">
                                <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{ width: strength.width, backgroundColor: strength.color }}
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-xs font-semibold" style={{ color: strength.color }}>{strength.label}</p>
                                    <p className="text-[#555] text-[10px]">
                                        {strength.score < 4 && 'Add uppercase, numbers & symbols for a stronger password'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Requirements checklist */}
                        {newPassword && (
                            <div className="mt-2 grid grid-cols-2 gap-1">
                                {[
                                    { label: '8+ characters', ok: newPassword.length >= 8 },
                                    { label: 'Uppercase letter', ok: /[A-Z]/.test(newPassword) },
                                    { label: 'Number', ok: /[0-9]/.test(newPassword) },
                                    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(newPassword) },
                                ].map((req) => (
                                    <div key={req.label} className={`flex items-center gap-1 text-[10px] ${req.ok ? 'text-emerald-400' : 'text-[#555]'}`}>
                                        <ShieldCheck size={10} />
                                        {req.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-xs text-[#aaa] font-semibold mb-1.5">Confirm New Password</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((f) => ({ ...f, confirmPassword: '' })); setMsg(null); }}
                                placeholder="Repeat new password"
                                className={inputClass(
                                    !!fieldErrors.confirmPassword,
                                    !!(confirmPassword && confirmPassword === newPassword && !fieldErrors.confirmPassword)
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((v) => !v)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 flex items-center"
                            >
                                {showConfirm ? <EyeOff size={15} color="#666" /> : <Eye size={15} color="#666" />}
                            </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle size={11} /> {fieldErrors.confirmPassword}
                            </p>
                        )}
                        {confirmPassword && confirmPassword === newPassword && !fieldErrors.confirmPassword && (
                            <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                                <CheckCircle2 size={11} /> Passwords match
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
                        <button
                            type="button"
                            onClick={logout}
                            className="w-full sm:w-auto bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <LogOut size={14} /> Sign Out
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full sm:w-auto bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-6 py-2.5 rounded-xl border-none cursor-pointer transition-all ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Updating…' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;

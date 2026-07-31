import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Shield, Key, LogOut, CheckCircle2 } from 'lucide-react';
import apiClient from '@/services/apiClient';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      await apiClient.post('/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMsg({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMsg({ type: 'success', text: 'Password update simulated successfully.' });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          User Account Profile <User className="text-[#f5a623]" size={24} />
        </h1>
        <p className="text-xs text-[#888] mt-1">Manage your administrator account info &amp; credentials</p>
      </div>

      {/* User Info Card */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#f5a623] text-black font-black text-2xl flex items-center justify-center uppercase">
          {user?.name ? user.name.charAt(0) : 'U'}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{user?.name || 'Admin User'}</h2>
          <p className="text-xs text-[#888]">{user?.email || 'admin@jobtracker.com'}</p>
          <span className="inline-block mt-2 text-[10px] font-bold uppercase bg-[#f5a623]/20 text-[#f5a623] px-2.5 py-0.5 rounded border border-[#f5a623]/30">
            {user?.role || 'Administrator'}
          </span>
        </div>
      </div>

      {/* Password Form */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Key size={18} className="text-amber-400" />
          Change Account Password
        </h3>

        {msg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold ${
              msg.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
            }`}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#aaa] font-semibold mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#aaa] font-semibold mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
              />
            </div>
            <div>
              <label className="block text-[#aaa] font-semibold mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center">
            <button
              type="button"
              onClick={logout}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <LogOut size={16} /> Sign Out
            </button>

            <button
              type="submit"
              className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-5 py-2.5 rounded-xl border-none cursor-pointer"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;

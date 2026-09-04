import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, PackageCheck, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/services/apiClient';

interface Workspace {
  id: number;
  name: string;
  owner_id: number;
  slug?: string;
}

export default function RoleSelectPage() {
  const { user, setAppMode } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Workspaces the user OWNS (principal)
  const [principalWorkspaces, setPrincipalWorkspaces] = useState<Workspace[]>([]);
  // Workspaces the user is a VENDOR MEMBER of
  const [vendorWorkspaces, setVendorWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/workspaces/list');
      const list: Workspace[] = res.data?.data ?? [];

      if (!Array.isArray(list) || list.length === 0) {
        // No workspaces at all — go straight as principal so they can create one
        selectMode('principal', null);
        return;
      }

      const owned   = list.filter((w) => w.owner_id === user?.id);
      const member  = list.filter((w) => w.owner_id !== user?.id);

      setPrincipalWorkspaces(owned);
      setVendorWorkspaces(member);

      // Auto-skip if only one role is available
      if (owned.length > 0 && member.length === 0) {
        selectMode('principal', owned[0]);
        return;
      }
      if (member.length > 0 && owned.length === 0) {
        selectMode('vendor', member[0]);
        return;
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load workspaces.');
    } finally {
      setLoading(false);
    }
  };

  const selectMode = (mode: 'principal' | 'vendor', ws: Workspace | null) => {
    setAppMode(mode);

    if (mode === 'principal' && ws) {
      localStorage.setItem('workspace_id',   String(ws.id));
      localStorage.setItem('workspace_name', ws.name);
    }
    if (mode === 'vendor' && ws) {
      localStorage.setItem('vendor_workspace_id',   String(ws.id));
      localStorage.setItem('vendor_workspace_name', ws.name);
      // Vendor mode uses vendor workspace as active workspace too
      localStorage.setItem('workspace_id',   String(ws.id));
      localStorage.setItem('workspace_name', ws.name);
    }

    navigate('/dashboard', { replace: true });
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#f5a623] mx-auto mb-4" size={36} />
          <p className="text-sm text-[#888]">Loading your workspaces…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-rose-400 text-sm">{error}</p>
          <button
            onClick={loadWorkspaces}
            className="flex items-center gap-2 mx-auto bg-[#1a1a1a] border border-[#2a2a2a] text-[#aaa] text-xs px-4 py-2 rounded-xl hover:border-[#f5a623] hover:text-white transition-colors"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const hasPrincipal = principalWorkspaces.length > 0;
  const hasVendor    = vendorWorkspaces.length > 0;

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-[#f5a623] mb-2">JobTrack</h1>
        <p className="text-sm text-[#888]">
          Welcome back, <span className="text-white font-semibold">{user?.name}</span>!
        </p>
        <p className="text-xs text-[#666] mt-1">How would you like to continue?</p>
      </div>

      {/* Role Cards */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* ── Principal Card ─────────────────────────────────── */}
        <button
          onClick={() => selectMode('principal', principalWorkspaces[0] ?? null)}
          disabled={!hasPrincipal}
          className={`group relative text-left p-7 rounded-2xl border transition-all duration-300 cursor-pointer
            ${hasPrincipal
              ? 'bg-[#141414] border-[#2a2a2a] hover:border-[#f5a623] hover:bg-[#181818] hover:shadow-2xl hover:shadow-[#f5a623]/10'
              : 'bg-[#111] border-[#1a1a1a] opacity-40 cursor-not-allowed'
            }`}
        >
          {/* Glow accent */}
          {hasPrincipal && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#f5a623]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          )}

          <div className="flex items-start justify-between mb-5">
            <div className={`p-3.5 rounded-2xl ${hasPrincipal ? 'bg-[#f5a623]/15 text-[#f5a623]' : 'bg-[#222] text-[#555]'}`}>
              <Building2 size={28} />
            </div>
            {hasPrincipal && (
              <ArrowRight
                size={20}
                className="text-[#444] group-hover:text-[#f5a623] group-hover:translate-x-1 transition-all"
              />
            )}
          </div>

          <h2 className={`text-xl font-black mb-2 ${hasPrincipal ? 'text-white' : 'text-[#555]'}`}>
            Principal
          </h2>
          <p className="text-xs text-[#888] leading-relaxed mb-4">
            I <strong className="text-[#aaa]">send</strong> job orders to vendors and manage subcontract work dispatched from my company.
          </p>

          {hasPrincipal ? (
            <div className="space-y-1.5">
              {principalWorkspaces.slice(0, 3).map((ws) => (
                <div key={ws.id} className="flex items-center gap-2 text-[11px] text-[#888]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="truncate font-medium text-gray-300">{ws.name}</span>
                </div>
              ))}
              {principalWorkspaces.length > 3 && (
                <p className="text-[11px] text-[#666]">+{principalWorkspaces.length - 3} more</p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-[#555] italic">No workspace owned yet</p>
          )}

          {hasPrincipal && (
            <div className="mt-5 pt-4 border-t border-[#222]">
              <span className="text-[11px] font-bold text-[#f5a623] uppercase tracking-wider">
                Continue as Principal →
              </span>
            </div>
          )}
        </button>

        {/* ── Vendor Card ────────────────────────────────────── */}
        <button
          onClick={() => selectMode('vendor', vendorWorkspaces[0] ?? null)}
          disabled={!hasVendor}
          className={`group relative text-left p-7 rounded-2xl border transition-all duration-300 cursor-pointer
            ${hasVendor
              ? 'bg-[#141414] border-[#2a2a2a] hover:border-emerald-500 hover:bg-[#181818] hover:shadow-2xl hover:shadow-emerald-500/10'
              : 'bg-[#111] border-[#1a1a1a] opacity-40 cursor-not-allowed'
            }`}
        >
          {hasVendor && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          )}

          <div className="flex items-start justify-between mb-5">
            <div className={`p-3.5 rounded-2xl ${hasVendor ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#222] text-[#555]'}`}>
              <PackageCheck size={28} />
            </div>
            {hasVendor && (
              <ArrowRight
                size={20}
                className="text-[#444] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all"
              />
            )}
          </div>

          <h2 className={`text-xl font-black mb-2 ${hasVendor ? 'text-white' : 'text-[#555]'}`}>
            Vendor
          </h2>
          <p className="text-xs text-[#888] leading-relaxed mb-4">
            I <strong className="text-[#aaa]">receive</strong> job orders from principal companies and track production progress.
          </p>

          {hasVendor ? (
            <div className="space-y-1.5">
              {vendorWorkspaces.slice(0, 3).map((ws) => (
                <div key={ws.id} className="flex items-center gap-2 text-[11px] text-[#888]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="truncate font-medium text-gray-300">{ws.name}</span>
                </div>
              ))}
              {vendorWorkspaces.length > 3 && (
                <p className="text-[11px] text-[#666]">+{vendorWorkspaces.length - 3} more</p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-[#555] italic">Not linked as vendor yet</p>
          )}

          {hasVendor && (
            <div className="mt-5 pt-4 border-t border-[#222]">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Continue as Vendor →
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Note: same user can be both */}
      {hasPrincipal && hasVendor && (
        <p className="text-[11px] text-[#555] mt-8 text-center max-w-sm">
          You can switch roles anytime from the header. Your data is filtered based on the selected mode.
        </p>
      )}

      <p className="text-xs text-[#444] mt-10">Manufacturing MSME Platform · Tamil Nadu</p>
    </div>
  );
}

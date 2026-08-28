import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Building2,
  FileText,
  User,
} from 'lucide-react';

interface RejectionData {
  id: number;
  rejection_number?: string;
  status: number;
  rejected_qty: number;
  accepted_qty?: number;
  rejection_type?: number;
  rejection_reason?: string;
  created_at: string;
  job_order?: {
    id: number;
    order_number?: string;
    job_order_number?: string;
    part_name?: string;
    quantity_sent?: number;
    vendor?: { id: number; shop_name: string; contact_person?: string };
    workspace?: { id: number; name: string };
  };
  reporter?: { id: number; name: string };
}

const STATUS_LABELS: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'Open',         color: 'text-rose-400',    bg: 'bg-rose-500/20',    border: 'border-rose-500/30' },
  2: { label: 'Acknowledged', color: 'text-blue-400',    bg: 'bg-blue-500/20',    border: 'border-blue-500/30' },
  3: { label: 'Rework',       color: 'text-amber-400',   bg: 'bg-amber-500/20',   border: 'border-amber-500/30' },
  4: { label: 'Closed',       color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
};

const TYPE_LABELS: Record<number, string> = {
  1: 'Scrap (Irreparable)',
  2: 'Rework Required',
  3: 'Short Supply',
};

export const RejectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { appMode } = useAuth();
  const [rejection, setRejection] = useState<RejectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/rejections/details', { id: Number(id) });
      const data = res.data?.data;
      if (!data) throw new Error('Rejection not found.');
      setRejection(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load rejection details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'acknowledge' | 'close') => {
    if (!rejection) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      await apiClient.post(`/rejections/${action}`, { id: rejection.id });
      await fetchDetails();
      setActionMsg(action === 'acknowledge' ? 'Rejection acknowledged.' : 'Rejection closed successfully.');
    } catch (e: any) {
      setActionMsg(e?.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-[#888] text-xs py-24">
        <Loader2 size={16} className="animate-spin" /> Loading rejection details...
      </div>
    );
  }

  if (error || !rejection) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-3">
        <AlertCircle size={40} className="text-rose-400 mx-auto" />
        <p className="text-white font-bold">{error || 'Rejection not found.'}</p>
        <Link to="/rejections" className="text-[#f5a623] text-sm hover:underline no-underline">← Back to Quality Rejections</Link>
      </div>
    );
  }

  const st = STATUS_LABELS[rejection.status] ?? STATUS_LABELS[1];
  const totalQty = rejection.job_order?.quantity_sent ?? 0;
  const rejRate = totalQty > 0 ? ((rejection.rejected_qty / totalQty) * 100).toFixed(1) : '—';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        to="/rejections"
        className="inline-flex items-center gap-2 text-xs font-bold text-[#888] hover:text-white no-underline transition-colors"
      >
        <ArrowLeft size={16} /> Back to Quality Rejections
      </Link>

      {/* Header */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-rose-400 font-mono">
              {rejection.rejection_number || `QR-${rejection.id}`}
            </h1>
            <span className={`${st.bg} ${st.color} border ${st.border} text-xs px-3 py-1 rounded-full font-bold uppercase`}>
              {st.label}
            </span>
          </div>
          <p className="text-xs text-[#888]">Vendor Quality Rejection Report</p>
          {actionMsg && (
            <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> {actionMsg}
            </p>
          )}
        </div>

        {appMode === 'principal' && (
          <div className="flex items-center gap-2 flex-wrap">
            {rejection.status === 1 && (
              <button
                onClick={() => handleAction('acknowledge')}
                disabled={actionLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                <CheckCircle2 size={15} />
                {actionLoading ? 'Processing...' : 'Acknowledge Defect'}
              </button>
            )}
            {rejection.status !== 4 && (
              <button
                onClick={() => handleAction('close')}
                disabled={actionLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                <CheckCircle2 size={15} />
                {actionLoading ? 'Processing...' : 'Resolve & Close'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Defect Report */}
        <div className="md:col-span-2 bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-rose-400" /> Defect Report
          </h2>

          {rejection.rejection_reason && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl space-y-1.5 text-xs">
              <span className="font-bold text-rose-400 uppercase tracking-wider text-[10px]">
                {TYPE_LABELS[rejection.rejection_type ?? 0] ?? 'Defect'}
              </span>
              <p className="text-rose-200 leading-relaxed">{rejection.rejection_reason}</p>
            </div>
          )}

          <div className="divide-y divide-[#222] text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888] flex items-center gap-1.5"><FileText size={12} /> Job Order</span>
              <span className="font-mono font-bold text-amber-400">
                {rejection.job_order?.job_order_number || rejection.job_order?.order_number || `#${rejection.job_order?.id}`}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888] flex items-center gap-1.5"><Building2 size={12} /> Vendor</span>
              <span className="font-semibold text-white">{rejection.job_order?.vendor?.shop_name || '—'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888]">Part / Component</span>
              <span className="font-semibold text-white">{rejection.job_order?.part_name || '—'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888] flex items-center gap-1.5"><User size={12} /> Reported By</span>
              <span className="text-gray-300">{rejection.reporter?.name || 'System'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888]">Date Filed</span>
              <span className="font-mono text-[#aaa]">{String(rejection.created_at).split('T')[0]}</span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Rejection Metrics</h3>
          <div className="space-y-3 text-xs">
            <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a]">
              <span className="text-[#888]">Rejected Quantity</span>
              <p className="text-2xl font-mono font-extrabold text-rose-400 mt-1">{rejection.rejected_qty} Pcs</p>
            </div>
            {rejection.accepted_qty !== undefined && (
              <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a]">
                <span className="text-[#888]">Accepted Quantity</span>
                <p className="text-xl font-mono font-bold text-emerald-400 mt-1">{rejection.accepted_qty} Pcs</p>
              </div>
            )}
            {totalQty > 0 && (
              <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a]">
                <span className="text-[#888]">Total Batch Size</span>
                <p className="text-xl font-mono font-bold text-white mt-1">{totalQty} Pcs</p>
              </div>
            )}
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <span className="text-[#888]">Rejection Rate</span>
              <p className="text-lg font-mono font-bold text-amber-400 mt-1">{rejRate}{totalQty > 0 ? '%' : ''}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionDetail;

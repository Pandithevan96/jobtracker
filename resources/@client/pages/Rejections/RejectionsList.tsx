import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import {
  AlertTriangle,
  Search,
  Plus,
  X,
  ChevronRight,
  Loader2,
  AlertCircle,
  ShieldAlert,
  InboxIcon,
} from 'lucide-react';

interface QualityRejection {
  id: number;
  rejection_number?: string;
  status: number | string;
  rejected_qty: number;
  accepted_qty?: number;
  rejection_type?: number;
  rejection_reason?: string;
  photo_path?: string;
  created_at: string;
  job_order?: {
    id: number;
    order_number?: string;
    job_order_number?: string;
    part_name?: string;
    vendor?: { id: number; shop_name: string };
    workspace?: { id: number; name: string };
  };
  reporter?: { id: number; name: string };
}

interface JobOrder {
  id: number;
  order_number?: string;
  job_order_number?: string;
  part_name?: string;
  vendor?: { shop_name: string };
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  '1': { label: 'Open',         cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  '2': { label: 'Acknowledged', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  '3': { label: 'Rework',       cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  '4': { label: 'Closed',       cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

const TYPE_MAP: Record<number, string> = {
  1: 'Scrap',
  2: 'Rework',
  3: 'Short Supply',
};

const getStatusBadge = (status: number | string) => {
  const key = String(status);
  const s = STATUS_MAP[key] ?? { label: 'Unknown', cls: 'bg-[#222] text-[#888] border-[#333]' };
  return (
    <span className={`border text-xs px-2.5 py-1 rounded-full font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
};

export const RejectionsList: React.FC = () => {
  const { appMode } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejections, setRejections] = useState<QualityRejection[]>([]);
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [form, setForm] = useState({
    job_order_id: '',
    rejected_qty: 1,
    accepted_qty: 0,
    rejection_type: 1,
    rejection_reason: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRejections();
    if (appMode === 'principal') fetchJobOrders();
  }, []);

  const getWorkspaceId = () => {
    const raw = localStorage.getItem('workspace_id');
    const n = Number(raw);
    return raw && !isNaN(n) ? n : null;
  };

  const fetchRejections = async () => {
    setLoading(true);
    try {
      const wsId = getWorkspaceId();
      const mode = localStorage.getItem('app_mode') || 'principal';
      const payload: Record<string, any> = { mode };
      if (wsId) payload.workspace_id = wsId;

      const res = await apiClient.post('/rejections/list', payload);
      const list = res.data?.data;
      setRejections(Array.isArray(list) ? list : []);
    } catch (e) {
      setRejections([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobOrders = async () => {
    try {
      const wsId = getWorkspaceId();
      const payload: Record<string, any> = {};
      if (wsId) payload.workspace_id = wsId;

      const res = await apiClient.post('/job-orders/list', payload);
      const list = res.data?.data;
      setJobOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      setJobOrders([]);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.job_order_id) errors.job_order_id = 'Select a Job Order.';
    if (!form.rejected_qty || form.rejected_qty < 1) errors.rejected_qty = 'Rejected quantity must be at least 1.';
    if (form.accepted_qty < 0) errors.accepted_qty = 'Accepted quantity cannot be negative.';
    if (!form.rejection_reason.trim()) errors.rejection_reason = 'Defect description is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await apiClient.post('/rejections/create', {
        job_order_id: Number(form.job_order_id),
        rejected_qty: Number(form.rejected_qty),
        accepted_qty: Number(form.accepted_qty),
        rejection_type: Number(form.rejection_type),
        rejection_reason: form.rejection_reason.trim(),
      });
      setShowCreateModal(false);
      setForm({ job_order_id: '', rejected_qty: 1, accepted_qty: 0, rejection_type: 1, rejection_reason: '' });
      setFieldErrors({});
      await fetchRejections();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || err?.message || 'Failed to report rejection.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = rejections.filter((r) => {
    const joNo = String(r.job_order?.job_order_number || r.job_order?.order_number || '');
    const vendorName = String(r.job_order?.vendor?.shop_name || '');
    const partName = String(r.job_order?.part_name || '');
    const rejNo = String(r.rejection_number || r.id || '');
    const q = searchQuery.toLowerCase();
    const matchSearch =
      joNo.toLowerCase().includes(q) ||
      vendorName.toLowerCase().includes(q) ||
      partName.toLowerCase().includes(q) ||
      rejNo.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || String(r.status) === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Quality Rejections <AlertTriangle className="text-rose-400" size={24} />
          </h1>
          <p className="text-xs text-[#888] mt-1">Log defective incoming parts and manage vendor quality claims</p>
        </div>

        {appMode === 'principal' && (
          <button
            onClick={() => { setShowCreateModal(true); setCreateError(null); setFieldErrors({}); }}
            className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} /> Report Rejection
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#141414] border border-[#262626] p-4 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder="Search rejection #, vendor, or item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-xs pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#f5a623]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: '1',   label: 'Open' },
            { value: '2',   label: 'Acknowledged' },
            { value: '3',   label: 'Rework' },
            { value: '4',   label: 'Closed' },
          ].map((st) => (
            <button
              key={st.value}
              onClick={() => setStatusFilter(st.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border cursor-pointer ${
                statusFilter === st.value
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-[#888] text-xs py-16 bg-[#141414] border border-[#262626] rounded-2xl">
          <Loader2 size={16} className="animate-spin" /> Loading quality rejections...
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] text-[11px] uppercase tracking-wider text-[#777] bg-[#111]">
                  <th className="py-3 px-4">Rejection #</th>
                  <th className="py-3 px-4">Job Order</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Part / Defect</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Rejected Qty</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222] text-xs">
                {filtered.length > 0 ? (
                  filtered.map((rej) => (
                    <tr key={rej.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                        <Link to={`/rejections/${rej.id}`} className="no-underline text-rose-400 hover:underline">
                          {rej.rejection_number || `QR-${rej.id}`}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-400">
                        {rej.job_order?.job_order_number || rej.job_order?.order_number || `#${rej.job_order?.id || '—'}`}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {rej.job_order?.vendor?.shop_name || '—'}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-gray-200">{rej.job_order?.part_name || '—'}</div>
                        {rej.rejection_reason && (
                          <div className="text-[11px] text-rose-300 truncate max-w-[200px]">{rej.rejection_reason}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#aaa]">
                        {TYPE_MAP[rej.rejection_type ?? 0] || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-400">
                        {rej.rejected_qty}
                      </td>
                      <td className="py-3.5 px-4 text-[#888] font-mono">
                        {rej.created_at ? String(rej.created_at).split('T')[0] : '—'}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(rej.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/rejections/${rej.id}`}
                          className="inline-flex items-center gap-1 bg-[#222] hover:bg-[#2e2e2e] text-white px-3 py-1.5 rounded-lg text-xs font-semibold no-underline border border-[#333]"
                        >
                          Details <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-14 text-center">
                      <InboxIcon size={32} className="text-[#333] mx-auto mb-3" />
                      <p className="text-[#666] text-sm font-semibold">No quality rejections found</p>
                      <p className="text-[#444] text-xs mt-1">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Try adjusting your search or filter.'
                          : 'No rejections have been logged yet.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2a2a2a] w-full max-w-lg rounded-2xl p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-[#888] hover:text-white bg-transparent border-none cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <ShieldAlert size={20} className="text-rose-400" /> Report Quality Rejection
            </h2>
            <p className="text-xs text-[#888] mb-5">Log defective components returned from vendor inspection</p>

            {createError && (
              <div className="mb-4 flex items-start gap-2 text-xs text-red-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} noValidate className="space-y-4 text-xs">
              {/* Job Order */}
              <div>
                <label className="block text-[#aaa] font-semibold mb-1">
                  Job Order <span className="text-red-400">*</span>
                </label>
                {jobOrders.length > 0 ? (
                  <select
                    value={form.job_order_id}
                    onChange={(e) => { setForm({ ...form, job_order_id: e.target.value }); setFieldErrors((f) => ({ ...f, job_order_id: '' })); }}
                    className={`w-full bg-[#1a1a1a] border ${fieldErrors.job_order_id ? 'border-red-500' : 'border-[#2a2a2a]'} rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]`}
                  >
                    <option value="">Select a Job Order...</option>
                    {jobOrders.map((jo) => (
                      <option key={jo.id} value={jo.id}>
                        {jo.job_order_number || jo.order_number || `#${jo.id}`}
                        {jo.part_name ? ` — ${jo.part_name}` : ''}
                        {jo.vendor?.shop_name ? ` (${jo.vendor.shop_name})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-amber-300 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
                    No job orders found.{' '}
                    <Link to="/job-orders" className="underline font-bold text-white">Create one first →</Link>
                  </div>
                )}
                {fieldErrors.job_order_id && <p className="text-red-400 mt-1">{fieldErrors.job_order_id}</p>}
              </div>

              {/* Type */}
              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Rejection Type <span className="text-red-400">*</span></label>
                <select
                  value={form.rejection_type}
                  onChange={(e) => setForm({ ...form, rejection_type: Number(e.target.value) })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                >
                  <option value={1}>Scrap (Irreparable)</option>
                  <option value={2}>Rework Required</option>
                  <option value={3}>Short Supply</option>
                </select>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Rejected Qty <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min={1}
                    value={form.rejected_qty}
                    onChange={(e) => { setForm({ ...form, rejected_qty: Number(e.target.value) }); setFieldErrors((f) => ({ ...f, rejected_qty: '' })); }}
                    className={`w-full bg-[#1a1a1a] border ${fieldErrors.rejected_qty ? 'border-red-500' : 'border-[#2a2a2a]'} rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]`}
                  />
                  {fieldErrors.rejected_qty && <p className="text-red-400 mt-1">{fieldErrors.rejected_qty}</p>}
                </div>
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Accepted Qty</label>
                  <input
                    type="number"
                    min={0}
                    value={form.accepted_qty}
                    onChange={(e) => setForm({ ...form, accepted_qty: Number(e.target.value) })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  />
                </div>
              </div>

              {/* Defect Reason */}
              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Defect Description <span className="text-red-400">*</span></label>
                <textarea
                  rows={3}
                  placeholder="Detailed defect description (e.g., surface cracks, dimensional deviation, thread pitch mismatch...)"
                  value={form.rejection_reason}
                  onChange={(e) => { setForm({ ...form, rejection_reason: e.target.value }); setFieldErrors((f) => ({ ...f, rejection_reason: '' })); }}
                  className={`w-full bg-[#1a1a1a] border ${fieldErrors.rejection_reason ? 'border-red-500' : 'border-[#2a2a2a]'} rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]`}
                />
                {fieldErrors.rejection_reason && <p className="text-red-400 mt-1">{fieldErrors.rejection_reason}</p>}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-[#222] hover:bg-[#2a2a2a] text-[#aaa] font-bold py-3 rounded-xl border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || jobOrders.length === 0}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl border-none cursor-pointer disabled:opacity-60"
                >
                  {creating ? 'Submitting...' : 'File Rejection Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RejectionsList;

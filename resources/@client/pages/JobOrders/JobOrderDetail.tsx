import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Building2,
  CheckCircle2,
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Vendor {
  id: number;
  shop_name: string;
  contact_person: string;
  phone: string;
  email: string | null;
}

interface NoteUser {
  id: number;
  name: string;
}

interface OrderNote {
  id: number;
  note: string;
  created_at: string;
  user: NoteUser | null;
}

interface Workspace {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
}

interface Creator {
  id: number;
  name: string;
  email: string;
}

interface JobOrder {
  id: number;
  order_number: string;
  part_name: string;
  part_number: string | null;
  process_type: string | null;
  description: string | null;
  quantity_sent: number;
  uom: string;
  due_date: string | null;
  status: number;
  priority: number;
  notes: string | null;
  vendor: Vendor | null;
  workspace?: Workspace | null;
  creator?: Creator | null;
  orderNotes: OrderNote[];
}

// ─── Status helpers (matching backend JobOrder constants) ───────────────────
// 1 = Draft, 2 = Material Out (In Progress), 3 = WIP (In Progress),
// 4 = Ready, 5 = Dispatched Back, 6 = Completed, 7 = Cancelled

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Draft',             color: 'bg-[#333]/40 text-[#aaa] border-[#444]' },
  2: { label: 'In Progress',       color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  3: { label: 'In Progress (WIP)', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  4: { label: 'Ready for Pickup',   color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  5: { label: 'Dispatched Back',   color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  6: { label: 'Completed',         color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  7: { label: 'Cancelled',         color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
};

function statusInfo(s: number) {
  return STATUS_MAP[s] ?? { label: `Status ${s}`, color: 'bg-[#333]/40 text-[#aaa] border-[#444]' };
}

// ─── Component ───────────────────────────────────────────────────────────────

export const JobOrderDetail: React.FC = () => {
  const { appMode } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder]       = useState<JobOrder | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [newNote, setNewNote]   = useState('');
  const [sending, setSending]   = useState(false);
  const [updating, setUpdating] = useState(false);

  // ── Fetch order details ──────────────────────────────────────────────────
  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/job-orders/details', { id: Number(id) });
      const data = res.data?.data ?? res.data;
      setOrder(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load job order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // ── Update status ────────────────────────────────────────────────────────
  const handleUpdateStatus = async (newStatus: number) => {
    if (!order) return;
    setUpdating(true);
    try {
      await apiClient.post('/job-orders/update-status', { id: order.id, status: newStatus });
      setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  // ── Add note ─────────────────────────────────────────────────────────────
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !order) return;
    setSending(true);
    try {
      await apiClient.post('/job-orders/add-note', { id: order.id, note: newNote.trim() });
      setNewNote('');
      await fetchOrder(); // refresh to get the new note from server
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to add note.');
    } finally {
      setSending(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#888]">
        <Loader2 className="animate-spin mr-3" size={22} />
        <span className="text-sm">Loading job order…</span>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-rose-400">
        <AlertCircle size={32} />
        <p className="text-sm">{error ?? 'Job order not found.'}</p>
        <button
          onClick={fetchOrder}
          className="flex items-center gap-2 text-xs bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-2 rounded-xl hover:border-[#f5a623] transition-colors text-[#aaa]"
        >
          <RefreshCw size={14} /> Retry
        </button>
        <Link to="/job-orders" className="text-xs text-[#666] hover:text-white transition-colors">
          ← Back to Job Orders
        </Link>
      </div>
    );
  }

  const { label: statusLabel, color: statusColor } = statusInfo(order.status);
  const isCompleted  = order.status === 6;
  const isCancelled  = order.status === 7;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        to="/job-orders"
        className="inline-flex items-center gap-2 text-xs font-bold text-[#888] hover:text-white no-underline transition-colors"
      >
        <ArrowLeft size={16} /> Back to Job Orders
      </Link>

      {/* Header */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-black text-white font-mono">{order.order_number}</h1>
            <span className={`border text-xs px-3 py-1 rounded-full font-bold uppercase ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          {appMode === 'vendor' ? (
            <p className="text-xs text-[#888] flex items-center gap-2 flex-wrap">
              <Building2 size={14} className="text-emerald-400 flex-shrink-0" />
              <span className="text-[#aaa]">Principal:</span>
              <span className="font-semibold text-gray-200">{order.workspace?.name || order.creator?.name || '—'}</span>
              {(order.workspace?.phone || order.creator?.email) && (
                <>
                  <span className="text-[#555]">|</span>
                  <span>{order.workspace?.phone || order.creator?.email}</span>
                </>
              )}
            </p>
          ) : order.vendor ? (
            <p className="text-xs text-[#888] flex items-center gap-2 flex-wrap">
              <Building2 size={14} className="text-amber-400 flex-shrink-0" />
              <span className="font-semibold text-gray-200">{order.vendor.shop_name}</span>
              {(order.vendor.phone || order.vendor.email) && (
                <>
                  <span className="text-[#555]">|</span>
                  <span>{order.vendor.phone}{order.vendor.email ? ` | ${order.vendor.email}` : ''}</span>
                </>
              )}
            </p>
          ) : (
            <p className="text-xs text-[#555]">No vendor assigned</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Vendor status actions */}
          {appMode === 'vendor' && !isCompleted && !isCancelled && (
            <>
              {order.status === 2 && (
                <button
                  onClick={() => handleUpdateStatus(3)}
                  disabled={updating}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  {updating ? <Loader2 size={14} className="animate-spin" /> : null}
                  Start Production (WIP)
                </button>
              )}
              {order.status === 3 && (
                <button
                  onClick={() => handleUpdateStatus(4)}
                  disabled={updating}
                  className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  {updating ? <Loader2 size={14} className="animate-spin" /> : null}
                  Mark Ready for Pickup
                </button>
              )}
              {order.status === 4 && (
                <button
                  onClick={() => handleUpdateStatus(5)}
                  disabled={updating}
                  className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  {updating ? <Loader2 size={14} className="animate-spin" /> : null}
                  Dispatch Back to Principal
                </button>
              )}
            </>
          )}

          {/* Principal status actions */}
          {appMode === 'principal' && !isCompleted && !isCancelled && (
            <>
              <button
                onClick={() => handleUpdateStatus(6)}
                disabled={updating}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                {updating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Mark Completed
              </button>
              <button
                onClick={() => handleUpdateStatus(7)}
                disabled={updating}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                Cancel Order
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress stats */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#888] mb-4">Order Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl text-center">
            <span className="text-[11px] text-[#888] font-medium block">Total Ordered</span>
            <span className="text-xl font-extrabold text-white font-mono mt-1 block">
              {order.quantity_sent} <span className="text-sm font-normal text-[#666]">{order.uom}</span>
            </span>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl text-center">
            <span className="text-[11px] text-[#888] font-medium block">Part / Item</span>
            <span className="text-sm font-bold text-white mt-1 block truncate" title={order.part_name}>
              {order.part_name}
            </span>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl text-center">
            <span className="text-[11px] text-[#888] font-medium block">Due Date</span>
            <span className={`text-sm font-bold font-mono mt-1 block ${order.due_date ? 'text-amber-400' : 'text-[#555]'}`}>
              {order.due_date ? String(order.due_date).split('T')[0] : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Specs & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Specifications */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText size={18} className="text-amber-400" />
            Job Order Specifications
          </h3>
          <div className="divide-y divide-[#222] text-xs">
            <div className="py-2.5 flex justify-between gap-4">
              <span className="text-[#888] flex-shrink-0">Item Name</span>
              <span className="font-semibold text-white text-right">{order.part_name}</span>
            </div>
            {order.part_number && (
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-[#888] flex-shrink-0">Part Number</span>
                <span className="font-semibold text-white font-mono text-right">{order.part_number}</span>
              </div>
            )}
            {order.process_type && (
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-[#888] flex-shrink-0">Process Type</span>
                <span className="font-semibold text-white text-right">{order.process_type}</span>
              </div>
            )}
            {order.description && (
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-[#888] flex-shrink-0">Description</span>
                <span className="font-semibold text-white text-right">{order.description}</span>
              </div>
            )}
            <div className="py-2.5 flex justify-between gap-4">
              <span className="text-[#888] flex-shrink-0">Quantity</span>
              <span className="font-mono text-gray-300">{order.quantity_sent} {order.uom}</span>
            </div>
            {order.due_date && (
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-[#888] flex-shrink-0">Due Date</span>
                <span className="font-mono text-amber-400 font-bold">{String(order.due_date).split('T')[0]}</span>
              </div>
            )}
            {order.notes && (
              <div className="py-2.5 flex flex-col gap-1">
                <span className="text-[#888]">Notes</span>
                <span className="text-gray-300 leading-relaxed">{order.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes feed */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-blue-400" />
              Audit Notes &amp; Log
            </h3>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {order.orderNotes && order.orderNotes.length > 0 ? (
                order.orderNotes.map((n) => (
                  <div key={n.id} className="bg-[#1a1a1a] border border-[#2a2a2a] p-3 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-[#777]">
                      <span className="font-bold text-amber-400">{n.user?.name ?? 'System'}</span>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-200">{n.note}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#555] text-center py-4">No notes yet. Add the first update below.</p>
              )}
            </div>
          </div>

          <form onSubmit={handleAddNote} className="flex gap-2 pt-2 border-t border-[#222]">
            <input
              type="text"
              placeholder="Add progress note or update..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={sending}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs px-3.5 py-2 text-white focus:outline-none focus:border-[#f5a623] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !newNote.trim()}
              className="bg-[#f5a623] hover:bg-[#e0951c] disabled:opacity-50 text-black font-bold p-2.5 rounded-xl border-none cursor-pointer flex items-center justify-center transition-colors"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JobOrderDetail;

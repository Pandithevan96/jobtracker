import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Paperclip,
  Image as ImageIcon,
  ExternalLink,
  X,
  Eye,
  Download,
  Maximize2,
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

interface StatusLog {
  id: number;
  from_status: number | null;
  to_status: number;
  notes: string | null;
  created_at: string;
  changed_by?: NoteUser | null;
  changedBy?: NoteUser | null;
}

interface OrderNote {
  id: number;
  note: string;
  created_at: string;
  user_id?: number;
  author_role?: number;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
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
  created_at?: string;
  vendor: Vendor | null;
  workspace?: Workspace | null;
  creator?: Creator | null;
  orderNotes?: OrderNote[];
  order_notes?: OrderNote[];
  statusLogs?: StatusLog[];
  status_logs?: StatusLog[];
}

interface AuditFeedItem {
  id: string;
  type: 'initial_note' | 'status_log' | 'order_note';
  text: string;
  authorName: string;
  authorRole?: number;
  userId?: number;
  createdAt: string;
  statusLabel?: string;
  statusColor?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
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
  7: { label: 'Cancelled',         color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
};

function statusInfo(s: number) {
  return STATUS_MAP[s] ?? { label: `Status ${s}`, color: 'bg-[#333]/40 text-[#aaa] border-[#444]' };
}

function parseTimestamp(ts?: string | null): number {
  if (!ts) return 0;
  const t = new Date(ts).getTime();
  return isNaN(t) ? 0 : t;
}

function getFullFileUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) {
    return rawUrl;
  }
  const base = 'https://jobtracker-adjt.onrender.com';
  return `${base}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

function getAuditFeed(order: JobOrder): AuditFeedItem[] {
  const items: AuditFeedItem[] = [];

  // 1. Initial Job Order Notes (typed when order was created)
  if (order.notes && order.notes.trim()) {
    items.push({
      id: `initial-note-${order.id}`,
      type: 'initial_note',
      text: order.notes.trim(),
      authorName: order.creator?.name ?? 'Principal',
      authorRole: 1, // Principal
      userId: order.creator?.id,
      createdAt: order.created_at || new Date().toISOString(),
    });
  }

  // 2. Status Log Updates & Notes
  const logs: StatusLog[] = order.statusLogs || order.status_logs || [];
  logs.forEach((log) => {
    const sInfo = statusInfo(log.to_status);
    const userObj = log.changedBy || log.changed_by;
    items.push({
      id: `status-log-${log.id}`,
      type: 'status_log',
      text: log.notes ? log.notes : `Status changed to ${sInfo.label}`,
      authorName: userObj?.name ?? 'System',
      userId: userObj?.id,
      createdAt: log.created_at || new Date().toISOString(),
      statusLabel: sInfo.label,
      statusColor: sInfo.color,
    });
  });

  // 3. User Chat Notes / Messages
  const notes: OrderNote[] = order.orderNotes || order.order_notes || [];
  const seenIds = new Set<number>();
  notes.forEach((n) => {
    if (n && (!n.id || !seenIds.has(n.id))) {
      if (n.id) seenIds.add(n.id);
      items.push({
        id: `order-note-${n.id || Math.random()}`,
        type: 'order_note',
        text: n.note,
        authorName: n.user?.name ?? 'User',
        authorRole: n.author_role,
        userId: n.user_id || n.user?.id,
        createdAt: n.created_at || new Date().toISOString(),
        attachmentUrl: n.attachment_url,
        attachmentName: n.attachment_name,
        attachmentType: n.attachment_type,
      });
    }
  });

  // Sort chronologically (oldest first, so newest appears at bottom)
  return items.sort((a, b) => parseTimestamp(a.createdAt) - parseTimestamp(b.createdAt));
}

// ─── Component ───────────────────────────────────────────────────────────────

export const JobOrderDetail: React.FC = () => {
  const { user, appMode } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder]         = useState<JobOrder | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [newNote, setNewNote]     = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sending, setSending]     = useState(false);
  const [updating, setUpdating]   = useState(false);
  
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: 'image' | 'pdf' | 'file' } | null>(null);

  const notesEndRef               = useRef<HTMLDivElement>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const filePreviewUrl = React.useMemo(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      return URL.createObjectURL(selectedFile);
    }
    return null;
  }, [selectedFile]);

  // ── Fetch order details ──────────────────────────────────────────────────
  const fetchOrder = useCallback(async (showSpinner = true) => {
    if (!id) return;
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/job-orders/details', { id: Number(id) });
      const data = res.data?.data ?? res.data;
      setOrder(data);
    } catch (e: any) {
      if (showSpinner) setError(e?.response?.data?.message ?? 'Failed to load job order.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(true); }, [fetchOrder]);

  const auditFeed = order ? getAuditFeed(order) : [];

  useEffect(() => {
    if (auditFeed.length > 0) {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [auditFeed.length]);

  // ── Update status ────────────────────────────────────────────────────────
  const handleUpdateStatus = async (newStatus: number) => {
    if (!order) return;
    setUpdating(true);
    try {
      await apiClient.post('/job-orders/update-status', { id: order.id, status: newStatus });
      await fetchOrder(false);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  // ── Add note ─────────────────────────────────────────────────────────────
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const noteText = newNote.trim();
    if ((!noteText && !selectedFile) || !order) return;
    setSending(true);

    try {
      const formData = new FormData();
      formData.append('id', String(order.id));
      if (noteText) formData.append('note', noteText);
      if (selectedFile) formData.append('attachment', selectedFile);

      const fileObj = selectedFile;
      const fileUrl = selectedFile ? URL.createObjectURL(selectedFile) : null;
      const fileType = selectedFile ? (selectedFile.type.startsWith('image/') ? 'image' : selectedFile.type.includes('pdf') ? 'pdf' : 'file') : null;

      setNewNote('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      const res = await apiClient.post('/job-orders/add-note', formData);
      const createdNote = res.data?.data ?? res.data;

      const noteObj: OrderNote = (createdNote && createdNote.id) ? createdNote : {
        id: Date.now(),
        note: noteText,
        created_at: new Date().toISOString(),
        user_id: user?.id,
        author_role: appMode === 'vendor' ? 2 : 1,
        attachment_url: createdNote?.attachment_url || fileUrl,
        attachment_name: createdNote?.attachment_name || fileObj?.name,
        attachment_type: createdNote?.attachment_type || fileType,
        user: user ? { id: user.id, name: user.name } : null,
      };

      setOrder((prev) => {
        if (!prev) return prev;
        const existing = prev.order_notes || prev.orderNotes || [];
        return {
          ...prev,
          orderNotes: [...existing, noteObj],
          order_notes: [...existing, noteObj],
        };
      });

      fetchOrder(false);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to add note.');
    } finally {
      setSending(false);
    }
  };

  const renderRoleBadge = (role?: number) => {
    if (role === 1) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Principal
        </span>
      );
    }
    if (role === 2) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Vendor
        </span>
      );
    }
    return null;
  };

  const renderAttachment = (item: AuditFeedItem) => {
    if (!item.attachmentUrl) return null;

    const fullUrl = getFullFileUrl(item.attachmentUrl);
    const isImage = item.attachmentType === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(item.attachmentUrl);
    const isPdf = item.attachmentType === 'pdf' || /\.pdf$/i.test(item.attachmentUrl);

    if (isImage) {
      return (
        <div className="mt-2 space-y-1">
          <div
            onClick={() => setPreviewFile({ url: fullUrl, name: item.attachmentName ?? 'Photo', type: 'image' })}
            className="block max-w-xs overflow-hidden rounded-xl border border-[#333] hover:border-[#f5a623] cursor-pointer transition-colors group relative"
          >
            <img
              src={fullUrl}
              alt={item.attachmentName ?? 'Attached Photo'}
              className="max-h-52 w-full object-cover rounded-xl bg-[#111]"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
              <Eye size={16} /> Click to Preview
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#888]">
            <span className="truncate max-w-[180px]">{item.attachmentName ?? 'Photo'}</span>
            <button
              type="button"
              onClick={() => setPreviewFile({ url: fullUrl, name: item.attachmentName ?? 'Photo', type: 'image' })}
              className="text-amber-400 hover:underline flex items-center gap-1 font-semibold bg-transparent border-none p-0 cursor-pointer text-[10px]"
            >
              <Eye size={10} /> Preview
            </button>
          </div>
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="mt-2 space-y-1.5">
          <button
            type="button"
            onClick={() => setPreviewFile({ url: fullUrl, name: item.attachmentName ?? 'Document.pdf', type: 'pdf' })}
            className="inline-flex items-center gap-2.5 px-3 py-2 bg-[#181818] border border-rose-500/30 hover:border-rose-400 text-gray-200 text-xs rounded-xl transition-colors text-left cursor-pointer w-full max-w-xs"
          >
            <FileText size={20} className="text-rose-400 flex-shrink-0" />
            <div className="flex flex-col text-left truncate flex-1">
              <span className="truncate max-w-[180px] font-semibold text-white">{item.attachmentName ?? 'Document.pdf'}</span>
              <span className="text-[9px] text-amber-400 font-bold">PDF Document · Tap to Preview 👁</span>
            </div>
          </button>
        </div>
      );
    }

    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setPreviewFile({ url: fullUrl, name: item.attachmentName ?? 'Attachment', type: 'file' })}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#181818] border border-[#333] hover:border-[#f5a623] text-gray-200 text-xs rounded-xl transition-colors text-left cursor-pointer"
        >
          <Paperclip size={16} className="text-amber-400" />
          <span className="truncate max-w-[180px] font-semibold">{item.attachmentName ?? 'Attachment'}</span>
          <Eye size={12} className="text-[#888]" />
        </button>
      </div>
    );
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
          onClick={() => fetchOrder(true)}
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
                <span className="text-[#888]">Initial Order Notes</span>
                <span className="text-gray-300 leading-relaxed">{order.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes feed / Chat & Audit Log */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-blue-400" />
                Audit Notes &amp; Activity Log
              </h3>
              <span className="text-[10px] text-[#777] font-semibold">Principal ↔ Vendor</span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 flex flex-col">
              {auditFeed.length > 0 ? (
                auditFeed.map((item) => {
                  const isMe = Boolean(user && item.userId && item.userId === user.id);

                  if (item.type === 'initial_note') {
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl text-xs space-y-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-200"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#aaa]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-400">{item.authorName}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Order Creation Note
                            </span>
                          </div>
                          <span className="text-[9px] text-[#777]">
                            {new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-gray-200">{item.text}</p>
                      </div>
                    );
                  }

                  if (item.type === 'status_log') {
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl text-xs space-y-1.5 bg-[#181818] border border-[#2a2a2a] text-gray-300"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#888]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white">{item.authorName}</span>
                            {item.statusLabel && (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${item.statusColor}`}>
                                {item.statusLabel}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-[#666]">
                            {new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        {item.text && <p className="whitespace-pre-wrap leading-relaxed text-gray-300">{item.text}</p>}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-1.5 ${
                        isMe
                          ? 'ml-auto bg-amber-500/15 border border-amber-500/30 text-gray-100 rounded-br-xs'
                          : 'mr-auto bg-[#1a1a1a] border border-[#2a2a2a] text-gray-200 rounded-bl-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] text-[#888]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold ${isMe ? 'text-amber-400' : 'text-blue-400'}`}>
                            {isMe ? 'You' : item.authorName}
                          </span>
                          {renderRoleBadge(item.authorRole)}
                        </div>
                        <span className="text-[9px] text-[#666]">
                          {new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      {item.text && <p className="whitespace-pre-wrap leading-relaxed">{item.text}</p>}
                      {renderAttachment(item)}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 space-y-1.5">
                  <MessageSquare size={24} className="mx-auto text-[#444]" />
                  <p className="text-xs text-[#888]">No notes yet. Add the first update below.</p>
                  <p className="text-[10px] text-[#555]">Messages and photos/PDFs are shared between Principal and Vendor.</p>
                </div>
              )}
              <div ref={notesEndRef} />
            </div>
          </div>

          <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-[#222]">
            {selectedFile && (
              <div className="flex flex-col gap-1.5 bg-[#1a1a1a] border border-amber-500/30 p-2.5 rounded-xl text-xs text-amber-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    {selectedFile.type.startsWith('image/') ? (
                      <ImageIcon size={14} className="text-amber-400 flex-shrink-0" />
                    ) : (
                      <FileText size={14} className="text-rose-400 flex-shrink-0" />
                    )}
                    <span className="truncate font-semibold">{selectedFile.name}</span>
                    <span className="text-[10px] text-[#888]">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-[#888] hover:text-white bg-transparent border-none cursor-pointer p-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
                {filePreviewUrl && (
                  <div className="max-h-32 max-w-xs overflow-hidden rounded-lg border border-[#333]">
                    <img src={filePreviewUrl} alt="Selected Preview" className="h-28 w-auto object-cover rounded-lg" />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                title="Attach Photo or PDF"
                className="bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-[#aaa] hover:text-white p-2.5 rounded-xl cursor-pointer flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <Paperclip size={16} />
              </button>
              <input
                type="text"
                placeholder="Add progress note or message..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                disabled={sending}
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs px-3.5 py-2 text-white focus:outline-none focus:border-[#f5a623] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={sending || (!newNote.trim() && !selectedFile)}
                className="bg-[#f5a623] hover:bg-[#e0951c] disabled:opacity-50 text-black font-bold p-2.5 rounded-xl border-none cursor-pointer flex items-center justify-center transition-colors"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* ── File Preview Modal Lightbox ── */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl max-w-4xl w-full flex flex-col overflow-hidden shadow-2xl max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222] bg-[#181818]">
              <div className="flex items-center gap-2.5 truncate">
                {previewFile.type === 'image' ? (
                  <ImageIcon size={18} className="text-amber-400 flex-shrink-0" />
                ) : (
                  <FileText size={18} className="text-rose-400 flex-shrink-0" />
                )}
                <span className="font-bold text-white text-sm truncate">{previewFile.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={previewFile.name}
                  className="px-3 py-1.5 bg-[#222] hover:bg-[#333] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors no-underline"
                >
                  <Download size={14} /> Download
                </a>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#222] hover:bg-[#333] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors no-underline"
                >
                  <ExternalLink size={14} /> Open Direct
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-[#888] hover:text-white bg-[#222] hover:bg-rose-500/20 hover:text-rose-400 rounded-lg border-none cursor-pointer transition-colors ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-[#0a0a0a] min-h-[300px]">
              {previewFile.type === 'image' ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : previewFile.type === 'pdf' ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[75vh] rounded-lg border-none bg-white"
                />
              ) : (
                <div className="text-center py-12 space-y-3 text-gray-300">
                  <Paperclip size={36} className="mx-auto text-amber-400" />
                  <p className="text-sm font-semibold">{previewFile.name}</p>
                  <a
                    href={previewFile.url}
                    download={previewFile.name}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl no-underline"
                  >
                    <Download size={16} /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOrderDetail;




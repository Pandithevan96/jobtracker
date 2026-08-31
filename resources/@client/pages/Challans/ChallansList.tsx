import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { DatePicker } from '@/components/DatePicker/DatePicker';
import {
  Truck,
  Search,
  Plus,
  X,
  Building2,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  InboxIcon,
  AlertTriangle,
} from 'lucide-react';

interface Challan {
  id: number;
  challan_number?: string;
  dc_number?: string;
  type: number | string;
  status: number | string;
  vehicle_number?: string;
  dispatch_date?: string;
  created_at?: string;
  job_order?: {
    id: number;
    job_order_number?: string;
    order_number?: string;
    part_name?: string;
    vendor?: { id: number; shop_name: string };
    workspace?: { id: number; name: string };
  };
  vendor?: { id: number; shop_name: string };
  items?: any[];
  items_count?: number;
}

interface JobOrder {
  id: number;
  job_order_number?: string;
  order_number?: string;
  part_name?: string;
  vendor?: { id: number; shop_name: string };
}

interface ChallanFormItem {
  part_name: string;
  part_number: string;
  hsn_code?: string;
  quantity: number;
  unit_value?: number;
  uom: string;
}

const emptyItem = (): ChallanFormItem => ({
  part_name: '',
  part_number: '',
  hsn_code: '',
  quantity: 1,
  unit_value: 0,
  uom: 'Nos',
});

const getStatusBadge = (status: number | string) => {
  const s = String(status ?? '').toLowerCase();
  switch (s) {
    case '3':
    case 'acknowledged':
      return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Acknowledged</span>;
    case '2':
    case 'in_transit':
    case 'dispatched':
      return <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">In Transit</span>;
    case '4':
    case 'cancelled':
      return <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Cancelled</span>;
    default:
      return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Issued</span>;
  }
};

const getTypeLabel = (type: number | string) => {
  const t = Number(type);
  if (t === 1) return <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-500/20 text-amber-400">Outward</span>;
  if (t === 2) return <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/20 text-emerald-400">Inward</span>;
  // string fallback
  const s = String(type).toLowerCase();
  if (s === 'outward') return <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-500/20 text-amber-400">Outward</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/20 text-emerald-400">Inward</span>;
};

export const ChallansList: React.FC = () => {
  const { appMode } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | '1' | '2'>('all');
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Job orders for dropdown
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [joLoading, setJoLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    job_order_id: '',
    type: '1',
    vehicle_number: '',
    driver_name: '',
    notes: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    estimated_delivery: '',
  });
  const [items, setItems] = useState<ChallanFormItem[]>([emptyItem()]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auto-derived from selected job order
  const selectedJobOrder = jobOrders.find((jo) => String(jo.id) === form.job_order_id);

  useEffect(() => {
    fetchChallans();
  }, []);

  const getWorkspaceId = async (): Promise<number | null> => {
    const mode = localStorage.getItem('app_mode') ?? 'principal';
    const key = mode === 'vendor' ? 'vendor_workspace_id' : 'workspace_id';
    let raw = localStorage.getItem(key) ?? localStorage.getItem('workspace_id');
    let id = raw && raw !== 'undefined' && raw !== 'null' ? Number(raw) : null;
    if (id !== null && isNaN(id)) id = null;

    if (!id) {
      try {
        const res = await apiClient.post('/workspaces/list');
        const list = res.data?.data;
        if (Array.isArray(list) && list.length > 0) {
          id = Number(list[0].id);
          localStorage.setItem('workspace_id', String(id));
        }
      } catch { /* silent */ }
    }
    return id;
  };

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const wsId = await getWorkspaceId();
      const mode = localStorage.getItem('app_mode') || 'principal';
      const payload: Record<string, any> = { mode };
      if (wsId) payload.workspace_id = wsId;

      const res = await apiClient.post('/challans/list', payload);
      const list = res.data?.data;
      setChallans(Array.isArray(list) ? list : []);
    } catch {
      setChallans([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobOrders = async () => {
    setJoLoading(true);
    try {
      const wsId = await getWorkspaceId();
      const payload: Record<string, any> = {};
      if (wsId) payload.workspace_id = wsId;

      const res = await apiClient.post('/job-orders/list', payload);
      const list = res.data?.data;
      setJobOrders(Array.isArray(list) ? list : []);
    } catch {
      setJobOrders([]);
    } finally {
      setJoLoading(false);
    }
  };

  const openModal = async () => {
    setCreateError(null);
    setFieldErrors({});
    setForm({
      job_order_id: '',
      type: '1',
      vehicle_number: '',
      driver_name: '',
      notes: '',
      dispatch_date: new Date().toISOString().split('T')[0],
      estimated_delivery: '',
    });
    setItems([emptyItem()]);
    setShowCreateModal(true);
    await fetchJobOrders();
  };

  // ── Items helpers ─────────────────────────────────────────────────────────
  const updateItem = (idx: number, field: keyof ChallanFormItem, val: string | number) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.job_order_id) errors.job_order_id = 'Select a Job Order.';
    if (items.some((it) => !it.part_name.trim())) errors.items = 'All line items need a part name.';
    if (items.some((it) => Number(it.quantity) < 1)) errors.items_qty = 'All quantities must be ≥ 1.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setCreating(true);
    setCreateError(null);
    try {
      const wsId = await getWorkspaceId();
      const jo = selectedJobOrder;
      if (!jo) throw new Error('Job Order not found.');

      const payload = {
        workspace_id: wsId,
        job_order_id: Number(form.job_order_id),
        vendor_id: jo.vendor?.id,
        type: Number(form.type),
        dispatch_date: form.dispatch_date || undefined,
        estimated_delivery: form.estimated_delivery || undefined,
        vehicle_number: form.vehicle_number.trim() || undefined,
        driver_name: form.driver_name.trim() || undefined,
        notes: form.notes.trim() || undefined,
        items: items.map((it) => ({
          part_name: it.part_name.trim(),
          part_number: it.part_number.trim() || undefined,
          hsn_code: it.hsn_code?.trim() || undefined,
          quantity: Number(it.quantity),
          unit_value: Number(it.unit_value || 0),
          uom: it.uom,
        })),
      };

      await apiClient.post('/challans/create', payload);
      setShowCreateModal(false);
      await fetchChallans();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || err?.message || 'Failed to create challan.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = challans.filter((c: any) => {
    const dcNo = String(c.challan_number || c.dc_number || '');
    const vendorName = String(c.vendor?.shop_name || c.vendor_name || c.job_order?.vendor?.shop_name || '');
    const joNo = String(c.job_order?.job_order_number || c.job_order?.order_number || c.job_order_number || '');
    const q = searchQuery.toLowerCase();
    const matchSearch = dcNo.toLowerCase().includes(q) || vendorName.toLowerCase().includes(q) || joNo.toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || String(c.type) === typeFilter;
    return matchSearch && matchType;
  });

  const inputCls = (hasErr?: boolean) =>
    `w-full bg-[#1a1a1a] border ${hasErr ? 'border-red-500' : 'border-[#2a2a2a]'} rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623] text-xs`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Delivery Challans <Truck className="text-blue-400" size={24} />
          </h1>
          <p className="text-xs text-[#888] mt-1">Issue and track dispatch/receipt delivery notes</p>
        </div>

        {appMode === 'principal' && (
          <button
            onClick={openModal}
            className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} /> New Delivery Challan
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#141414] border border-[#262626] p-4 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder="Search by DC #, order #, vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-xs pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#f5a623]"
          />
        </div>
        <div className="flex items-center gap-2">
          {[{ v: 'all', l: 'All' }, { v: '1', l: 'Outward' }, { v: '2', l: 'Inward' }].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setTypeFilter(v as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase border cursor-pointer ${
                typeFilter === v
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-[#888] text-xs py-16 bg-[#141414] border border-[#262626] rounded-2xl">
          <Loader2 size={16} className="animate-spin" /> Loading challans...
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] text-[11px] uppercase tracking-wider text-[#777] bg-[#111]">
                  <th className="py-3 px-4">Challan #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Job Order</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Vehicle #</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222] text-xs">
                {filtered.length > 0 ? (
                  filtered.map((dc: any) => (
                    <tr key={dc.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                        <Link to={`/challans/${dc.id}`} className="no-underline text-blue-400 hover:underline">
                          {dc.challan_number || dc.dc_number || `DC-${dc.id}`}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">{getTypeLabel(dc.type)}</td>
                      <td className="py-3.5 px-4 font-mono text-amber-400">
                        {dc.job_order?.job_order_number || dc.job_order?.order_number || dc.job_order_number || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-[#555]" />
                          {dc.vendor?.shop_name || dc.job_order?.vendor?.shop_name || dc.vendor_name || '—'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#aaa]">{dc.vehicle_number || '—'}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        {dc.items_count ?? dc.items?.length ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#888] font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-[#555]" />
                          {dc.dispatch_date ? String(dc.dispatch_date).split('T')[0] : (dc.created_at ? String(dc.created_at).split('T')[0] : '—')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(dc.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/challans/${dc.id}`}
                          className="inline-flex items-center gap-1 bg-[#222] hover:bg-[#2e2e2e] text-white px-3 py-1.5 rounded-lg text-xs font-semibold no-underline border border-[#333]"
                        >
                          View DC <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-14 text-center">
                      <InboxIcon size={32} className="text-[#333] mx-auto mb-3" />
                      <p className="text-[#666] text-sm font-semibold">No delivery challans found</p>
                      <p className="text-[#444] text-xs mt-1">
                        {searchQuery || typeFilter !== 'all'
                          ? 'Try adjusting your search or filter.'
                          : 'No challans have been issued yet.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Challan Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2a2a2a] w-full max-w-xl rounded-2xl relative flex flex-col max-h-[92vh]">
            {/* Modal header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-[#222]">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Truck size={18} className="text-blue-400" /> Issue Delivery Challan
                </h2>
                <p className="text-xs text-[#888] mt-0.5">Create material movement document for vendor dispatch/receipt</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-[#888] hover:text-white bg-transparent border-none cursor-pointer ml-4 shrink-0">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4 text-xs">

              {createError && (
                <div className="flex items-start gap-2 text-red-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Type + Job Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Challan Type <span className="text-red-400">*</span></label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className={inputCls()}
                  >
                    <option value="1">Outward (Sending Material)</option>
                    <option value="2">Inward (Receiving Finished)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Job Order <span className="text-red-400">*</span></label>
                  {joLoading ? (
                    <div className="flex items-center gap-2 py-2.5 text-[#666]">
                      <Loader2 size={13} className="animate-spin" /> Loading...
                    </div>
                  ) : jobOrders.length > 0 ? (
                    <select
                      value={form.job_order_id}
                      onChange={(e) => { setForm({ ...form, job_order_id: e.target.value }); setFieldErrors((f) => ({ ...f, job_order_id: '' })); }}
                      className={inputCls(!!fieldErrors.job_order_id)}
                    >
                      <option value="">Select Job Order...</option>
                      {jobOrders.map((jo) => (
                        <option key={jo.id} value={jo.id}>
                          {jo.job_order_number || jo.order_number || `#${jo.id}`}
                          {jo.part_name ? ` — ${jo.part_name}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-300 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
                      <AlertTriangle size={13} className="shrink-0" />
                      <span>No job orders. <Link to="/job-orders" className="underline text-white font-bold">Create one →</Link></span>
                    </div>
                  )}
                  {fieldErrors.job_order_id && <p className="text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />{fieldErrors.job_order_id}</p>}
                </div>
              </div>

              {/* Auto-filled Vendor preview */}
              {selectedJobOrder?.vendor && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                  <Building2 size={14} className="text-blue-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Vendor (from Job Order)</span>
                    <p className="text-white font-semibold text-xs mt-0.5">{selectedJobOrder.vendor.shop_name}</p>
                  </div>
                </div>
              )}

              {/* Vehicle + Driver */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Vehicle / Transport #</label>
                  <input type="text" placeholder="TN 37 B 9876" value={form.vehicle_number}
                    onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                    className={inputCls()} />
                </div>
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Driver Name</label>
                  <input type="text" placeholder="Driver name" value={form.driver_name}
                    onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                    className={inputCls()} />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Dispatch Date</label>
                  <DatePicker
                    value={form.dispatch_date}
                    placeholder="Select dispatch date"
                    onChange={(d) => setForm({ ...form, dispatch_date: d })}
                  />
                </div>
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Est. Delivery Date</label>
                  <DatePicker
                    value={form.estimated_delivery}
                    min={form.dispatch_date}
                    placeholder="Select delivery date"
                    onChange={(d) => setForm({ ...form, estimated_delivery: d })}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#aaa] font-semibold">
                    Line Items <span className="text-red-400">*</span>
                    <span className="text-[#555] ml-1 font-normal">({items.length})</span>
                  </label>
                  <button type="button" onClick={addItem}
                    className="text-[10px] text-[#f5a623] hover:text-amber-300 bg-transparent border-none cursor-pointer font-bold">
                    + Add Item
                  </button>
                </div>

                {(fieldErrors.items || fieldErrors.items_qty) && (
                  <p className="text-red-400 mb-2 flex items-center gap-1 text-[11px]">
                    <AlertCircle size={11} /> {fieldErrors.items || fieldErrors.items_qty}
                  </p>
                )}

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#666] font-bold uppercase">Item {idx + 1}</span>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)}
                            className="text-rose-400 hover:text-rose-300 bg-transparent border-none cursor-pointer text-[10px]">
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[#888] mb-0.5">Part Name *</label>
                          <input type="text" placeholder="e.g. Camshaft Housing"
                            value={item.part_name}
                            onChange={(e) => updateItem(idx, 'part_name', e.target.value)}
                            className={`w-full bg-[#1a1a1a] border ${!item.part_name.trim() && fieldErrors.items ? 'border-red-500' : 'border-[#333]'} rounded-lg text-white px-3 py-2 text-[11px] focus:outline-none focus:border-[#f5a623]`}
                          />
                        </div>
                        <div>
                          <label className="block text-[#888] mb-0.5">Part No.</label>
                          <input type="text" placeholder="CSH-001"
                            value={item.part_number}
                            onChange={(e) => updateItem(idx, 'part_number', e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg text-white px-3 py-2 text-[11px] focus:outline-none focus:border-[#f5a623]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[#888] mb-0.5">Quantity *</label>
                          <input type="number" min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg text-white px-3 py-2 text-[11px] focus:outline-none focus:border-[#f5a623]"
                          />
                        </div>
                        <div>
                          <label className="block text-[#888] mb-0.5">Unit Rate (₹)</label>
                          <input type="number" min={0} step="0.01" placeholder="0.00"
                            value={item.unit_value || ''}
                            onChange={(e) => updateItem(idx, 'unit_value', Number(e.target.value))}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg text-white px-3 py-2 text-[11px] focus:outline-none focus:border-[#f5a623]"
                          />
                        </div>
                        <div>
                          <label className="block text-[#888] mb-0.5">UOM</label>
                          <select value={item.uom} onChange={(e) => updateItem(idx, 'uom', e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg text-white px-3 py-2 text-[11px] focus:outline-none focus:border-[#f5a623]">
                            {['Nos', 'Kgs', 'Pcs', 'Sets', 'Mtr', 'Ltrs'].map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[#888] mb-0.5">HSN / SAC Code</label>
                        <input type="text" placeholder="e.g. 8483"
                          value={item.hsn_code || ''}
                          onChange={(e) => updateItem(idx, 'hsn_code', e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg text-white px-3 py-2 text-[11px] focus:outline-none focus:border-[#f5a623]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Handling / Transport Notes</label>
                <textarea rows={2} placeholder="e.g. Handle with care, anti-rust wrap required..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputCls()}
                />
              </div>
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-[#222] flex gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-[#222] hover:bg-[#2a2a2a] text-[#aaa] font-bold py-3 rounded-xl border-none cursor-pointer text-xs">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || jobOrders.length === 0}
                className="flex-1 bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold py-3 rounded-xl border-none cursor-pointer text-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? 'Generating...' : 'Generate Challan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallansList;

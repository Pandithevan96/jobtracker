import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { DatePicker } from '@/components/DatePicker/DatePicker';
import {
  FileText,
  Search,
  Plus,
  X,
  Building2,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  AlertTriangle,
  UserPlus,
  LayoutGrid,
} from 'lucide-react';

export interface JobOrder {
  id: number;
  order_number?: string;
  job_order_number?: string;
  vendor?: { id: number; shop_name: string };
  vendor_name?: string;
  vendor_id?: number;
  part_name?: string;
  item_name?: string;
  process_type?: string;
  quantity_sent?: number;
  quantity?: number;
  completed_quantity?: number;
  status: any;
  due_date?: string;
  expected_delivery_date?: string;
  created_at?: string;
  notes?: string;
}

// ─── Pre-flight check state ───────────────────────────────────────────────────
type PreflightStatus = 'loading' | 'no_workspace' | 'no_vendors' | 'ready';

export const JobOrdersList: React.FC = () => {
  const { appMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Pre-flight state
  const [preflightStatus, setPreflightStatus] = useState<PreflightStatus>('loading');

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Form State
  const [newOrder, setNewOrder] = useState({
    vendor_id: '',
    part_name: '',
    part_number: '',
    process_type: 'Machining',
    quantity_sent: 100,
    due_date: getTodayDate(),
    notes: '',
  });

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState<{
    vendor_id?: string;
    part_name?: string;
    quantity_sent?: string;
    due_date?: string;
  }>({});

  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    runPreflight();
  }, []);

  const getCurrentWorkspaceId = async (): Promise<number | null> => {
    const mode = localStorage.getItem('app_mode') ?? 'principal';
    let workspaceIdRaw =
      mode === 'vendor'
        ? (localStorage.getItem('vendor_workspace_id') ?? localStorage.getItem('workspace_id'))
        : localStorage.getItem('workspace_id');

    let workspaceId: number | null =
      workspaceIdRaw && workspaceIdRaw !== 'undefined' && workspaceIdRaw !== 'null'
        ? Number(workspaceIdRaw)
        : null;
    if (workspaceId !== null && isNaN(workspaceId)) workspaceId = null;

    if (!workspaceId) {
      try {
        const res = await apiClient.post('/workspaces/list');
        const list = res.data?.data;
        if (Array.isArray(list) && list.length > 0) {
          workspaceId = Number(list[0].id);
          localStorage.setItem('workspace_id', String(workspaceId));
        }
      } catch (e) {
        console.error('Failed to list workspaces', e);
      }
    }
    return workspaceId;
  };

  // ── Pre-flight: check workspace + vendor existence ────────────────────────
  const runPreflight = async () => {
    setPreflightStatus('loading');

    // Only principal mode needs workspace/vendor checks
    if (appMode !== 'principal') {
      await fetchJobOrders();
      setPreflightStatus('ready');
      return;
    }

    try {
      const wsRes = await apiClient.post('/workspaces/list');
      const wsList = wsRes.data?.data;
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      // Check if user has at least one OWNED workspace
      const ownedWs = Array.isArray(wsList) ? wsList.filter((w: any) => w.owner_id === authUser?.id) : [];

      if (ownedWs.length === 0) {
        setPreflightStatus('no_workspace');
        setLoading(false);
        return;
      }

      // Check if at least one vendor exists in the workspace
      const workspaceId = ownedWs[0].id;
      localStorage.setItem('workspace_id', String(workspaceId));

      const vendorRes = await apiClient.post('/vendors/list', { workspace_id: workspaceId });
      const vendorList = vendorRes.data?.data;
      const vendorsArr = Array.isArray(vendorList) ? vendorList : [];
      setVendors(vendorsArr);

      if (vendorsArr.length === 0) {
        setPreflightStatus('no_vendors');
        setLoading(false);
        return;
      }

      // Pre-select first vendor
      if (!newOrder.vendor_id) {
        setNewOrder((prev) => ({ ...prev, vendor_id: String(vendorsArr[0].id) }));
      }

      setPreflightStatus('ready');
      await fetchJobOrders();

      // If ?action=new is in URL, open modal only when ready
      if (searchParams.get('action') === 'new') {
        setShowCreateModal(true);
      }
    } catch (e) {
      console.error('Preflight failed', e);
      setPreflightStatus('ready');
      await fetchJobOrders();
    }
  };

  const fetchVendors = async () => {
    try {
      const workspaceId = await getCurrentWorkspaceId();
      const payload: Record<string, any> = {};
      if (workspaceId) payload.workspace_id = workspaceId;
      const res = await apiClient.post('/vendors/list', payload);
      const list = res.data?.data;
      if (Array.isArray(list)) {
        setVendors(list);
        if (list.length > 0 && !newOrder.vendor_id) {
          setNewOrder((prev) => ({ ...prev, vendor_id: String(list[0].id) }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch vendors', e);
    }
  };

  const fetchJobOrders = async () => {
    setLoading(true);
    try {
      const workspaceId = await getCurrentWorkspaceId();
      const payload: Record<string, any> = {};
      if (workspaceId) payload.workspace_id = workspaceId;

      const res = await apiClient.post('/job-orders/list', payload);
      const list = res.data?.data;
      setJobOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      console.log('Failed to fetch job orders', e);
      setJobOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Open create modal with pre-flight re-check ────────────────────────────
  const openCreateModal = async () => {
    if (appMode !== 'principal') return;

    if (preflightStatus === 'no_workspace') {
      // Direct to workspace creation
      navigate('/workspace');
      return;
    }

    if (preflightStatus === 'no_vendors') {
      navigate('/vendors');
      return;
    }

    // Re-fetch vendors in case some were added since page load
    await fetchVendors();
    setCreateError(null);
    setFieldErrors({});
    setShowCreateModal(true);
  };

  // ── Form validation ────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!newOrder.vendor_id) {
      errors.vendor_id = 'Please select a vendor to assign this job order to.';
    }
    if (!newOrder.part_name.trim()) {
      errors.part_name = 'Part Name / Item Description is required.';
    }
    if (!newOrder.quantity_sent || Number(newOrder.quantity_sent) < 1) {
      errors.quantity_sent = 'Quantity must be at least 1.';
    }
    if (!newOrder.due_date) {
      errors.due_date = 'Due date is required.';
    } else {
      const due = new Date(newOrder.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today) {
        errors.due_date = 'Due date cannot be in the past.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Frontend validation
    if (!validateForm()) return;

    // Double-check vendors not empty (defensive)
    if (vendors.length === 0) {
      setCreateError('No vendors found. Please add a vendor to your workspace before creating a job order.');
      return;
    }

    setCreating(true);
    try {
      const workspaceId = await getCurrentWorkspaceId();
      const payload: Record<string, any> = {
        vendor_id: Number(newOrder.vendor_id),
        part_name: newOrder.part_name.trim(),
        part_number: newOrder.part_number.trim(),
        process_type: newOrder.process_type,
        quantity_sent: Number(newOrder.quantity_sent),
        due_date: newOrder.due_date,
        notes: newOrder.notes.trim(),
      };
      if (workspaceId) payload.workspace_id = workspaceId;

      const res = await apiClient.post('/job-orders/create', payload);

      if (res.data?.status === 'error') {
        setCreateError(res.data.message || 'Failed to create job order');
        return;
      }

      setShowCreateModal(false);
      setNewOrder({
        vendor_id: vendors.length > 0 ? String(vendors[0].id) : '',
        part_name: '',
        part_number: '',
        process_type: 'Machining',
        quantity_sent: 100,
        due_date: getTodayDate(),
        notes: '',
      });
      setFieldErrors({});
      await fetchJobOrders();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to create job order';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const filteredOrders = jobOrders.filter((order: any) => {
    const orderNo = String(order.job_order_number || order.order_number || '');
    const vendorName = String(order.vendor_name || order.vendor?.shop_name || '');
    const itemName = String(order.item_name || order.part_name || '');
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      orderNo.toLowerCase().includes(query) ||
      vendorName.toLowerCase().includes(query) ||
      itemName.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || String(order.status) === String(statusFilter);
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: any) => {
    const s = String(status ?? '').toLowerCase();
    switch (s) {
      case '6':
      case 'completed':
        return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Completed</span>;
      case '2':
      case '3':
      case '4':
      case 'in_progress':
      case 'wip':
        return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">In Progress</span>;
      case '7':
      case 'cancelled':
        return <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Cancelled</span>;
      default:
        return <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Pending</span>;
    }
  };

  // ── Pre-flight blocker UIs ────────────────────────────────────────────────
  if (preflightStatus === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 text-[#888] text-xs py-24">
        <Loader2 size={16} className="animate-spin" /> Checking your workspace setup…
      </div>
    );
  }

  if (preflightStatus === 'no_workspace') {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
          <LayoutGrid size={36} className="text-amber-400" />
        </div>
        <h2 className="text-xl font-black text-white">No Workspace Found</h2>
        <p className="text-sm text-[#888] leading-relaxed">
          You need to <strong className="text-white">create your company workspace</strong> before you can issue job orders.
          A workspace represents your company in the system.
        </p>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-300 text-left space-y-1">
          <p className="font-bold">What to do:</p>
          <p>1. Go to <strong>Workspace Settings</strong> and create your company profile.</p>
          <p>2. Then add vendors (sub-contractors) to your workspace.</p>
          <p>3. After that, you can issue Job Orders to your vendors.</p>
        </div>
        <button
          onClick={() => navigate('/workspace')}
          className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-sm px-6 py-3 rounded-xl border-none cursor-pointer flex items-center gap-2 mx-auto"
        >
          <LayoutGrid size={16} /> Create Workspace Now
        </button>
      </div>
    );
  }

  if (preflightStatus === 'no_vendors') {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto">
          <UserPlus size={36} className="text-rose-400" />
        </div>
        <h2 className="text-xl font-black text-white">No Vendors Added Yet</h2>
        <p className="text-sm text-[#888] leading-relaxed">
          You need to <strong className="text-white">add at least one vendor</strong> (sub-contractor) to your workspace
          before you can create a job order.
        </p>
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-xs text-rose-300 text-left space-y-1">
          <p className="font-bold">What to do:</p>
          <p>1. Go to the <strong>Vendors</strong> section and add your sub-contractor company.</p>
          <p>2. You can search for existing registered companies or add a new one manually.</p>
          <p>3. Once a vendor is added, come back here to create a Job Order.</p>
        </div>
        <button
          onClick={() => navigate('/vendors')}
          className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-sm px-6 py-3 rounded-xl border-none cursor-pointer flex items-center gap-2 mx-auto"
        >
          <UserPlus size={16} /> Add a Vendor Now
        </button>
      </div>
    );
  }

  // ── Main Page ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Job Orders Directory <FileText className="text-[#f5a623]" size={22} />
            </h1>
            <p className="text-xs text-[#888] mt-1">Track subcontract work orders dispatched to vendors</p>
          </div>

          {appMode === 'principal' && (
            <button
              onClick={openCreateModal}
              className="sm:hidden bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 border-none cursor-pointer shrink-0 ml-2"
            >
              <Plus size={16} />
              <span>New</span>
            </button>
          )}
        </div>

        {appMode === 'principal' && (
          <button
            onClick={openCreateModal}
            className="hidden sm:flex bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all items-center gap-2 border-none cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>New Job Order</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#141414] border border-[#262626] p-4 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder="Search by order #, vendor, or item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-xs pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#f5a623]"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
          {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#f5a623] text-black border-[#f5a623]'
                  : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-[#888] text-xs py-16 bg-[#141414] border border-[#262626] rounded-2xl">
          <Loader2 size={16} className="animate-spin" />
          Loading job orders...
        </div>
      )}

      {/* Job Orders List Table */}
      {!loading && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] text-[11px] uppercase tracking-wider text-[#777] bg-[#111]">
                  <th className="py-3 px-4">Job Order #</th>
                  <th className="py-3 px-4">{appMode === 'vendor' ? 'Principal / Sender' : 'Vendor'}</th>
                  <th className="py-3 px-4">Process / Item</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222] text-xs">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        <Link to={`/job-orders/${order.id}`} className="no-underline text-amber-400 hover:underline">
                          {order.job_order_number || order.order_number || `#${order.id}`}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-200">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={14} className="text-[#666]" />
                          <span>
                            {appMode === 'vendor'
                              ? (order.workspace?.name || order.creator?.name || '—')
                              : (order.vendor?.shop_name || order.vendor_name || '—')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{order.part_name || order.item_name || '—'}</div>
                        <div className="text-[11px] text-[#888]">{order.process_type || '—'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        <span className="text-white">{order.completed_quantity || 0}</span>
                        <span className="text-[#666]"> / {order.quantity_sent || order.quantity || 0}</span>
                      </td>
                      <td className="py-3.5 px-4 text-[#aaa] font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar size={13} className="text-[#666]" />
                          <span>{order.due_date ? String(order.due_date).split('T')[0] : (order.expected_delivery_date || '—')}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/job-orders/${order.id}`}
                          className="inline-flex items-center gap-1 bg-[#222] hover:bg-[#2e2e2e] text-white px-3 py-1.5 rounded-lg text-xs font-semibold no-underline border border-[#333] transition-colors"
                        >
                          Details <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#777]">
                      No job orders found.
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
          <div className="bg-[#141414] border border-[#2a2a2a] w-full max-w-lg rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-[#888] hover:text-white bg-transparent border-none cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">Create Job Order</h2>
            <p className="text-xs text-[#888] mb-4">Issue a new subcontract job order to a vendor</p>

            {createError && (
              <div className="mb-4 flex items-start gap-2 text-xs text-red-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} noValidate className="space-y-4 text-xs">

              {/* Vendor */}
              <div>
                <label className="block text-[#aaa] font-semibold mb-1">
                  Target Vendor <span className="text-red-400">*</span>
                </label>
                {vendors.length > 0 ? (
                  <select
                    value={newOrder.vendor_id}
                    onChange={(e) => { setNewOrder({ ...newOrder, vendor_id: e.target.value }); setFieldErrors((f) => ({ ...f, vendor_id: '' })); }}
                    className={`w-full bg-[#1a1a1a] border ${fieldErrors.vendor_id ? 'border-red-500' : 'border-[#2a2a2a]'} rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]`}
                  >
                    <option value="">Select a vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.shop_name}{v.city ? ` — ${v.city}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-start gap-2 text-amber-300 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>
                      No vendors in workspace.{' '}
                      <Link to="/vendors" className="underline font-bold text-white">
                        Add a vendor first →
                      </Link>
                    </span>
                  </div>
                )}
                {fieldErrors.vendor_id && <p className="text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />{fieldErrors.vendor_id}</p>}
              </div>

              {/* Part Name */}
              <div>
                <label className="block text-[#aaa] font-semibold mb-1">
                  Part Name / Item Description <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Camshaft Housing M12"
                  value={newOrder.part_name}
                  onChange={(e) => { setNewOrder({ ...newOrder, part_name: e.target.value }); setFieldErrors((f) => ({ ...f, part_name: '' })); }}
                  className={`w-full bg-[#1a1a1a] border ${fieldErrors.part_name ? 'border-red-500' : 'border-[#2a2a2a]'} rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]`}
                />
                {fieldErrors.part_name && <p className="text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />{fieldErrors.part_name}</p>}
              </div>

              {/* Part Number */}
              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Part Number</label>
                <input
                  type="text"
                  placeholder="e.g. CSH-2026-001"
                  value={newOrder.part_number}
                  onChange={(e) => setNewOrder({ ...newOrder, part_number: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Process Type */}
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Process Type</label>
                  <select
                    value={newOrder.process_type}
                    onChange={(e) => setNewOrder({ ...newOrder, process_type: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  >
                    <option value="Machining">CNC Machining</option>
                    <option value="Heat Treatment">Heat Treatment</option>
                    <option value="Anodizing">Anodizing / Coating</option>
                    <option value="Grinding">Precision Grinding</option>
                    <option value="Turning">Turning</option>
                    <option value="Assembly">Assembly</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">
                    Quantity Sent <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newOrder.quantity_sent}
                    onChange={(e) => { setNewOrder({ ...newOrder, quantity_sent: Number(e.target.value) }); setFieldErrors((f) => ({ ...f, quantity_sent: '' })); }}
                    className={`w-full bg-[#1a1a1a] border ${fieldErrors.quantity_sent ? 'border-red-500' : 'border-[#2a2a2a]'} rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]`}
                  />
                  {fieldErrors.quantity_sent && <p className="text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />{fieldErrors.quantity_sent}</p>}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-[#aaa] font-semibold mb-1">
                  Due Date <span className="text-red-400">*</span>
                </label>
                <DatePicker
                  value={newOrder.due_date}
                  min={getTodayDate()}
                  placeholder="Select due date"
                  hasError={!!fieldErrors.due_date}
                  onChange={(d) => { setNewOrder({ ...newOrder, due_date: d }); setFieldErrors((f) => ({ ...f, due_date: '' })); }}
                />
                {fieldErrors.due_date && <p className="text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />{fieldErrors.due_date}</p>}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Special Notes / Requirements</label>
                <textarea
                  rows={3}
                  placeholder="Material specs, hardness specs, tolerance limits..."
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-[#222] hover:bg-[#2a2a2a] text-[#aaa] font-bold py-3 rounded-xl border-none cursor-pointer"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || vendors.length === 0}
                  className="flex-1 bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold py-3 rounded-xl border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creating ? 'Saving...' : 'Issue Job Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      {appMode === 'principal' && (
        <button
          onClick={openCreateModal}
          className="sm:hidden fixed bottom-6 right-6 z-40 bg-[#f5a623] active:bg-[#e0951c] text-black font-extrabold text-xs px-4 py-3.5 rounded-full shadow-2xl flex items-center gap-2 border-2 border-black active:scale-95 transition-transform"
        >
          <Plus size={18} />
          <span>New Job Order</span>
        </button>
      )}
    </div>
  );
};

export default JobOrdersList;

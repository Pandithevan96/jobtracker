import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  Search,
  Plus,
  X,
  Building2,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle
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

export const JobOrdersList: React.FC = () => {
  const { appMode } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'new');

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

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

  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobOrders();
    fetchVendors();
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

  const fetchVendors = async () => {
    try {
      const workspaceId = await getCurrentWorkspaceId();
      const payload: Record<string, any> = {};
      if (workspaceId) payload.workspace_id = workspaceId;
      const res = await apiClient.post('/vendors/list', payload);
      const list = res.data?.data;
      if (Array.isArray(list)) {
        setVendors(list);
        if (list.length > 0) {
          setNewOrder((prev) => ({ ...prev, vendor_id: prev.vendor_id || String(list[0].id) }));
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
      const payload: Record<string, any> = { mode: appMode };
      if (workspaceId) payload.workspace_id = workspaceId;

      const res = await apiClient.post('/job-orders/list', payload);
      const list = res.data?.data;
      if (Array.isArray(list)) {
        setJobOrders(list);
      } else {
        setJobOrders([]);
      }
    } catch (e) {
      console.log('Failed to fetch job orders', e);
      setJobOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newOrder.vendor_id) {
      setCreateError('Please select a vendor.');
      return;
    }
    if (!newOrder.part_name.trim()) {
      setCreateError('Part Name / Description is required.');
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
      await fetchJobOrders();
    } catch (e: any) {
      setCreateError(e?.response?.data?.message || e?.message || 'Failed to create job order');
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
      case 'material out':
        return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">In Progress</span>;
      case '7':
      case 'cancelled':
        return <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Cancelled</span>;
      default:
        return <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Pending</span>;
    }
  };

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
              onClick={() => setShowCreateModal(true)}
              className="sm:hidden bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 border-none cursor-pointer shrink-0 ml-2"
            >
              <Plus size={16} />
              <span>New</span>
            </button>
          )}
        </div>

        {appMode === 'principal' && (
          <button
            onClick={() => setShowCreateModal(true)}
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
          <div className="bg-[#141414] border border-[#2a2a2a] w-full max-w-lg rounded-2xl p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-[#888] hover:text-white bg-transparent border-none cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">Create Job Order</h2>
            <p className="text-xs text-[#888] mb-4">Issue a new subcontract job order to a vendor</p>

            {createError && (
              <div className="mb-4 flex items-center gap-2 text-xs text-red-300 bg-[#2a1414] border border-[#3a1f1f] rounded-xl px-3 py-2">
                <AlertCircle size={14} />
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Target Vendor *</label>
                {vendors.length > 0 ? (
                  <select
                    value={newOrder.vendor_id}
                    onChange={(e) => setNewOrder({ ...newOrder, vendor_id: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                    required
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.shop_name} {v.city ? `(${v.city})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-amber-400 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
                    No vendors registered in workspace.{' '}
                    <Link to="/vendors" className="underline font-bold text-white">
                      Add a vendor first
                    </Link>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Part Name / Item Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Camshaft Housing M12"
                  value={newOrder.part_name}
                  onChange={(e) => setNewOrder({ ...newOrder, part_name: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                />
              </div>

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
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Quantity Sent *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newOrder.quantity_sent}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity_sent: Number(e.target.value) })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Due Date *</label>
                <input
                  type="date"
                  required
                  value={newOrder.due_date}
                  onChange={(e) => setNewOrder({ ...newOrder, due_date: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                />
              </div>

              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Special Notes / Requirements</label>
                <textarea
                  rows={3}
                  placeholder="Material specs, hardness specs, tolerance limits..."
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                ></textarea>
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
                  className="flex-1 bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold py-3 rounded-xl border-none cursor-pointer disabled:opacity-60"
                >
                  {creating ? 'Saving...' : 'Issue Job Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button */}
      {appMode === 'principal' && (
        <button
          onClick={() => setShowCreateModal(true)}
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

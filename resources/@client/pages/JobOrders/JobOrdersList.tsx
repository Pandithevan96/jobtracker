import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  Search,
  Filter,
  Plus,
  X,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface JobOrder {
  id: number;
  job_order_number: string;
  vendor_name: string;
  vendor_id?: number;
  item_name: string;
  process_type: string;
  quantity: number;
  completed_quantity?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  expected_delivery_date: string;
  created_at: string;
  notes?: string;
}

export const JobOrdersList: React.FC = () => {
  const { appMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'new');

  // Form State
  const [newOrder, setNewOrder] = useState({
    vendor_name: '',
    item_name: '',
    process_type: 'Machining',
    quantity: 100,
    expected_delivery_date: '2026-08-10',
    notes: '',
  });

  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);

  useEffect(() => {
    fetchJobOrders();
  }, []);

  const fetchJobOrders = async () => {
    setLoading(true);
    try {
      const mode = localStorage.getItem('app_mode') ?? 'principal';

      // In vendor mode prefer the vendor workspace
      let workspaceId: string | null =
        mode === 'vendor'
          ? (localStorage.getItem('vendor_workspace_id') ?? localStorage.getItem('workspace_id'))
          : localStorage.getItem('workspace_id');

      if (!workspaceId) {
        const res = await apiClient.post('/workspaces/list');
        const list = res.data?.data;
        if (Array.isArray(list) && list.length > 0) {
          workspaceId = list[0].id;
          localStorage.setItem('workspace_id', String(workspaceId));
        }
      }

      if (!workspaceId) {
        setJobOrders([]);
        return;
      }

      const res = await apiClient.post('/job-orders/list', { workspace_id: Number(workspaceId) });
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
    if (!newOrder.vendor_name || !newOrder.item_name) return;

    try {
      await apiClient.post('/job-orders/create', newOrder);
    } catch (e) {
      console.log('Created job order locally');
    }

    const createdItem: JobOrder = {
      id: Date.now(),
      job_order_number: `JO-2026-0${jobOrders.length + 1}`,
      vendor_name: newOrder.vendor_name,
      item_name: newOrder.item_name,
      process_type: newOrder.process_type,
      quantity: Number(newOrder.quantity),
      completed_quantity: 0,
      status: 'pending',
      expected_delivery_date: newOrder.expected_delivery_date,
      created_at: new Date().toISOString().split('T')[0],
      notes: newOrder.notes,
    };

    setJobOrders([createdItem, ...jobOrders]);
    setShowCreateModal(false);
    setNewOrder({
      vendor_name: '',
      item_name: '',
      process_type: 'Machining',
      quantity: 100,
      expected_delivery_date: '2026-08-10',
      notes: '',
    });
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
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Job Orders Directory <FileText className="text-[#f5a623]" size={22} />
          </h1>
          <p className="text-xs text-[#888] mt-1">Track subcontract work orders dispatched to vendors</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Job Order</span>
        </button>
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

      {/* Job Orders List Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] text-[11px] uppercase tracking-wider text-[#777] bg-[#111]">
                <th className="py-3 px-4">Job Order #</th>
                <th className="py-3 px-4">{appMode === 'vendor' ? 'Principal / Sender' : 'Vendor'}</th>
                <th className="py-3 px-4">Process / Item</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4">Expected Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222] text-xs">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      <Link to={`/job-orders`} className="no-underline text-amber-400 hover:underline">
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
                    No job orders found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Vendor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Precision Engineering"
                  value={newOrder.vendor_name}
                  onChange={(e) => setNewOrder({ ...newOrder, vendor_name: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                />
              </div>

              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Item Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CNC Turned Pins M12"
                  value={newOrder.item_name}
                  onChange={(e) => setNewOrder({ ...newOrder, item_name: e.target.value })}
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
                  </select>
                </div>
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  required
                  value={newOrder.expected_delivery_date}
                  onChange={(e) => setNewOrder({ ...newOrder, expected_delivery_date: e.target.value })}
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
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold py-3 rounded-xl border-none cursor-pointer"
                >
                  Issue Job Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOrdersList;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import {
  Truck,
  Search,
  Plus,
  X,
  FileText,
  Building2,
  Calendar,
  ChevronRight,
  Download,
  CheckCircle2,
  Clock
} from 'lucide-react';

export interface Challan {
  id: number;
  challan_number: string;
  job_order_number: string;
  vendor_name: string;
  type: 'outward' | 'inward';
  items_count: number;
  vehicle_number?: string;
  status: 'issued' | 'in_transit' | 'acknowledged' | 'cancelled';
  date: string;
}

export const ChallansList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'outward' | 'inward'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newChallan, setNewChallan] = useState({
    job_order_number: 'JO-2026-001',
    vendor_name: 'Apex Precision Engineering',
    type: 'outward',
    vehicle_number: 'TN 37 B 9876',
    items_count: 3,
    notes: 'Handle precision ground parts with anti-rust oil wrap',
  });

  const [challans, setChallans] = useState<Challan[]>([]);

  useEffect(() => {
    fetchChallans();
  }, []);

  const fetchChallans = async () => {
    try {
      let workspaceIdRaw = localStorage.getItem('workspace_id');
      let workspaceId: number | null =
        workspaceIdRaw && workspaceIdRaw !== 'undefined' && workspaceIdRaw !== 'null'
          ? Number(workspaceIdRaw)
          : null;
      if (workspaceId !== null && isNaN(workspaceId)) workspaceId = null;

      if (!workspaceId) {
        const wsRes = await apiClient.post('/workspaces/list');
        const list = wsRes.data?.data;
        if (Array.isArray(list) && list.length > 0) {
          workspaceId = Number(list[0].id);
          localStorage.setItem('workspace_id', String(workspaceId));
        }
      }

      const payload: Record<string, any> = {};
      if (workspaceId) payload.workspace_id = workspaceId;

      const res = await apiClient.post('/challans/list', payload);
      const list = res.data?.data;
      if (Array.isArray(list)) {
        setChallans(list);
      } else {
        setChallans([]);
      }
    } catch (e) {
      console.log('Failed to fetch challans', e);
      setChallans([]);
    }
  };

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/challans/create', newChallan);
    } catch (e) {
      console.log('Created DC locally');
    }

    const created: Challan = {
      id: Date.now(),
      challan_number: `DC-2026-0${challans.length + 43}`,
      job_order_number: newChallan.job_order_number,
      vendor_name: newChallan.vendor_name,
      type: newChallan.type as 'outward' | 'inward',
      items_count: Number(newChallan.items_count),
      vehicle_number: newChallan.vehicle_number,
      status: 'issued',
      date: new Date().toISOString().split('T')[0],
    };

    setChallans([created, ...challans]);
    setShowCreateModal(false);
  };

  const filteredChallans = challans.filter((c: any) => {
    const dcNo = String(c.challan_number || c.dc_number || '');
    const vendorName = String(c.vendor_name || c.vendor?.shop_name || '');
    const joNo = String(c.job_order_number || c.job_order?.order_number || '');
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      dcNo.toLowerCase().includes(query) ||
      vendorName.toLowerCase().includes(query) ||
      joNo.toLowerCase().includes(query);

    const matchesType = typeFilter === 'all' || String(c.type) === typeFilter;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: any) => {
    const s = String(status ?? '').toLowerCase();
    switch (s) {
      case '3':
      case 'acknowledged':
        return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Acknowledged</span>;
      case '2':
      case 'in_transit':
      case 'dispatched':
        return <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">In Transit</span>;
      default:
        return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Issued</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Delivery Challans <Truck className="text-blue-400" size={24} />
          </h1>
          <p className="text-xs text-[#888] mt-1">Issue and track dispatch/receipt delivery notes</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Delivery Challan</span>
        </button>
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          {(['all', 'outward', 'inward'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTypeFilter(tf)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border cursor-pointer ${
                typeFilter === tf
                  ? 'bg-blue-500 text-black border-blue-500 font-bold'
                  : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Challans Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] text-[11px] uppercase tracking-wider text-[#777] bg-[#111]">
                <th className="py-3 px-4">Challan #</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Job Order #</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Vehicle #</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222] text-xs">
              {filteredChallans.map((dc) => (
                <tr key={dc.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                    <Link to={`/challans/${dc.id}`} className="no-underline text-blue-400 hover:underline">
                      {dc.challan_number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        dc.type === 'outward' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {dc.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-300">{dc.job_order_number}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">{dc.vendor_name}</td>
                  <td className="py-3.5 px-4 font-mono text-[#aaa]">{dc.vehicle_number || 'N/A'}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-white">{dc.items_count}</td>
                  <td className="py-3.5 px-4 text-[#888] font-mono">{dc.date}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Challan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2a2a2a] w-full max-w-lg rounded-2xl p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-[#888] hover:text-white bg-transparent border-none cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">Issue Delivery Challan</h2>
            <p className="text-xs text-[#888] mb-4">Create material movement document for vendor dispatch/receipt</p>

            <form onSubmit={handleCreateChallan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Challan Type</label>
                  <select
                    value={newChallan.type}
                    onChange={(e) => setNewChallan({ ...newChallan, type: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  >
                    <option value="outward">Outward (Sending Material)</option>
                    <option value="inward">Inward (Receiving Finished)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Job Order Ref</label>
                  <input
                    type="text"
                    required
                    value={newChallan.job_order_number}
                    onChange={(e) => setNewChallan({ ...newChallan, job_order_number: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Vendor Name</label>
                <input
                  type="text"
                  required
                  value={newChallan.vendor_name}
                  onChange={(e) => setNewChallan({ ...newChallan, vendor_name: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Vehicle / Transport #</label>
                  <input
                    type="text"
                    value={newChallan.vehicle_number}
                    onChange={(e) => setNewChallan({ ...newChallan, vehicle_number: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  />
                </div>
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Line Items Count</label>
                  <input
                    type="number"
                    min={1}
                    value={newChallan.items_count}
                    onChange={(e) => setNewChallan({ ...newChallan, items_count: Number(e.target.value) })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Handling / Transport Notes</label>
                <textarea
                  rows={2}
                  value={newChallan.notes}
                  onChange={(e) => setNewChallan({ ...newChallan, notes: e.target.value })}
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
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-black font-bold py-3 rounded-xl border-none cursor-pointer"
                >
                  Generate Challan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallansList;

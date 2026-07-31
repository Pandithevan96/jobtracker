import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import {
  AlertTriangle,
  Search,
  Plus,
  X,
  FileText,
  Building2,
  ChevronRight,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

export interface QualityRejection {
  id: number;
  rejection_number: string;
  job_order_number: string;
  vendor_name: string;
  item_name: string;
  rejected_qty: number;
  defect_reason: string;
  status: 'pending' | 'acknowledged' | 'closed';
  created_at: string;
}

export const RejectionsList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newRejection, setNewRejection] = useState({
    job_order_number: 'JO-2026-001',
    vendor_name: 'Apex Precision Engineering',
    item_name: 'CNC Turned Shaft Pins',
    rejected_qty: 12,
    defect_reason: 'Outer diameter undersized by 0.05mm beyond tolerance limit.',
  });

  const [rejections, setRejections] = useState<QualityRejection[]>([
    {
      id: 1,
      rejection_number: 'QR-2026-014',
      job_order_number: 'JO-2026-001',
      vendor_name: 'Apex Precision Engineering',
      item_name: 'CNC Turned Shaft Pins',
      rejected_qty: 12,
      defect_reason: 'Outer diameter undersized by 0.05mm beyond tolerance',
      status: 'pending',
      created_at: '2026-07-28',
    },
    {
      id: 2,
      rejection_number: 'QR-2026-013',
      job_order_number: 'JO-2026-005',
      vendor_name: 'Lakshmi Tooling Solutions',
      item_name: 'Carbide Insert Dies',
      rejected_qty: 4,
      defect_reason: 'Crack detected on die face after wire EDM spark',
      status: 'acknowledged',
      created_at: '2026-07-24',
    },
    {
      id: 3,
      rejection_number: 'QR-2026-012',
      job_order_number: 'JO-2026-002',
      vendor_name: 'Sri Krishna Heat Treatments',
      item_name: 'Helical Gears 42CrMo4',
      rejected_qty: 8,
      defect_reason: 'Non-uniform surface hardness below 38 HRC specification',
      status: 'closed',
      created_at: '2026-07-21',
    },
  ]);

  useEffect(() => {
    fetchRejections();
  }, []);

  const fetchRejections = async () => {
    try {
      const res = await apiClient.post('/rejections/list');
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setRejections(res.data.data);
      }
    } catch (e) {
      console.log('Using local fallback rejections');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/rejections/create', newRejection);
    } catch (e) {
      console.log('Created rejection locally');
    }

    const created: QualityRejection = {
      id: Date.now(),
      rejection_number: `QR-2026-0${rejections.length + 15}`,
      job_order_number: newRejection.job_order_number,
      vendor_name: newRejection.vendor_name,
      item_name: newRejection.item_name,
      rejected_qty: Number(newRejection.rejected_qty),
      defect_reason: newRejection.defect_reason,
      status: 'pending',
      created_at: new Date().toISOString().split('T')[0],
    };

    setRejections([created, ...rejections]);
    setShowCreateModal(false);
  };

  const filteredRejections = rejections.filter((r) => {
    const matchesSearch =
      r.rejection_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'closed':
        return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Closed</span>;
      case 'acknowledged':
        return <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Acknowledged</span>;
      default:
        return <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Pending</span>;
    }
  };

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

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-rose-500 hover:bg-rose-600 text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Report Rejection</span>
        </button>
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          {['all', 'pending', 'acknowledged', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border cursor-pointer ${
                statusFilter === st
                  ? 'bg-rose-500 text-black border-rose-500 font-bold'
                  : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Rejections Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] text-[11px] uppercase tracking-wider text-[#777] bg-[#111]">
                <th className="py-3 px-4">Rejection #</th>
                <th className="py-3 px-4">Job Order #</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Item & Defect Note</th>
                <th className="py-3 px-4 text-center">Rejected Qty</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222] text-xs">
              {filteredRejections.map((rej) => (
                <tr key={rej.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                    <Link to={`/rejections/${rej.id}`} className="no-underline text-rose-400 hover:underline">
                      {rej.rejection_number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-amber-400">{rej.job_order_number}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">{rej.vendor_name}</td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-semibold text-gray-200">{rej.item_name}</div>
                    <div className="text-[11px] text-rose-300 truncate">{rej.defect_reason}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-400">{rej.rejected_qty} Pcs</td>
                  <td className="py-3.5 px-4 text-[#888] font-mono">{rej.created_at}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2a2a2a] w-full max-w-lg rounded-2xl p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-[#888] hover:text-white bg-transparent border-none cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">Report Quality Rejection</h2>
            <p className="text-xs text-[#888] mb-4">Log defective components returned from vendor inspection</p>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Job Order Ref</label>
                  <input
                    type="text"
                    required
                    value={newRejection.job_order_number}
                    onChange={(e) => setNewRejection({ ...newRejection, job_order_number: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  />
                </div>
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Vendor Name</label>
                  <input
                    type="text"
                    required
                    value={newRejection.vendor_name}
                    onChange={(e) => setNewRejection({ ...newRejection, vendor_name: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[#aaa] font-semibold mb-1">Item Description</label>
                  <input
                    type="text"
                    required
                    value={newRejection.item_name}
                    onChange={(e) => setNewRejection({ ...newRejection, item_name: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  />
                </div>
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Rejected Qty</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newRejection.rejected_qty}
                    onChange={(e) => setNewRejection({ ...newRejection, rejected_qty: Number(e.target.value) })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#aaa] font-semibold mb-1">Defect Description / Quality Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed defect analysis (e.g., surface cracks, thread pitch mismatch...)"
                  value={newRejection.defect_reason}
                  onChange={(e) => setNewRejection({ ...newRejection, defect_reason: e.target.value })}
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
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-black font-bold py-3 rounded-xl border-none cursor-pointer"
                >
                  File Rejection Report
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

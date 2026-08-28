import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import {
  Scale,
  Search,
  Building2,
  ChevronRight,
  Loader2,
  AlertCircle,
  InboxIcon,
} from 'lucide-react';

interface Reconciliation {
  id: number;
  reconciliation_code?: string;
  qty_sent?: number;
  qty_finished_received?: number;
  qty_scrap?: number;
  qty_rejected?: number;
  status: number | string;
  created_at: string;
  remarks?: string;
  job_order?: {
    id: number;
    order_number?: string;
    job_order_number?: string;
    part_name?: string;
    quantity_sent?: number;
    vendor?: { shop_name: string };
    workspace?: { name: string };
  };
  performed_by?: { id: number; name: string };
}

const getStatusBadge = (status: number | string) => {
  const s = Number(status);
  if (s === 2)
    return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Settled</span>;
  return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">Variance Check</span>;
};

export const ReconciliationsList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReconciliations();
  }, []);

  const fetchReconciliations = async () => {
    setLoading(true);
    try {
      const wsRaw = localStorage.getItem('workspace_id');
      const wsId = wsRaw && !isNaN(Number(wsRaw)) ? Number(wsRaw) : null;
      const payload: Record<string, any> = {};
      if (wsId) payload.workspace_id = wsId;

      const res = await apiClient.post('/reconciliations/list', payload);
      const list = res.data?.data;
      setReconciliations(Array.isArray(list) ? list : []);
    } catch (e) {
      setReconciliations([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = reconciliations.filter((r) => {
    const code = String(r.reconciliation_code || r.id || '');
    const vendor = String(r.job_order?.vendor?.shop_name || '');
    const joNo = String(r.job_order?.job_order_number || r.job_order?.order_number || '');
    const q = searchQuery.toLowerCase();
    return code.toLowerCase().includes(q) || vendor.toLowerCase().includes(q) || joNo.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Material Reconciliations <Scale className="text-emerald-400" size={24} />
          </h1>
          <p className="text-xs text-[#888] mt-1">Audit dispatched raw stock versus returned finished goods</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-4 bg-[#141414] border border-[#262626] p-4 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder="Search code, vendor, or order..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-xs pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#f5a623]"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-[#888] text-xs py-16 bg-[#141414] border border-[#262626] rounded-2xl">
          <Loader2 size={16} className="animate-spin" /> Loading reconciliations...
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] text-[11px] uppercase tracking-wider text-[#777] bg-[#111]">
                  <th className="py-3 px-4">Rec #</th>
                  <th className="py-3 px-4">Job Order</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Part</th>
                  <th className="py-3 px-4 text-center">Issued</th>
                  <th className="py-3 px-4 text-center">Received</th>
                  <th className="py-3 px-4 text-center">Scrap</th>
                  <th className="py-3 px-4 text-center">Rejected</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222] text-xs">
                {filtered.length > 0 ? (
                  filtered.map((rec) => (
                    <tr key={rec.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        <Link to={`/reconciliations/${rec.id}`} className="no-underline text-emerald-400 hover:underline">
                          {rec.reconciliation_code || `REC-${rec.id}`}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-400">
                        {rec.job_order?.job_order_number || rec.job_order?.order_number || `#${rec.job_order?.id || '—'}`}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-1.5">
                        <Building2 size={13} className="text-[#555]" />
                        {rec.job_order?.vendor?.shop_name || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#aaa]">{rec.job_order?.part_name || '—'}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        {rec.qty_sent ?? rec.job_order?.quantity_sent ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                        {rec.qty_finished_received ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-[#888]">
                        {rec.qty_scrap ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-400">
                        {rec.qty_rejected ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#888] font-mono">
                        {rec.created_at ? String(rec.created_at).split('T')[0] : '—'}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(rec.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/reconciliations/${rec.id}`}
                          className="inline-flex items-center gap-1 bg-[#222] hover:bg-[#2e2e2e] text-white px-3 py-1.5 rounded-lg text-xs font-semibold no-underline border border-[#333]"
                        >
                          Audit Ledger <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="py-14 text-center">
                      <InboxIcon size={32} className="text-[#333] mx-auto mb-3" />
                      <p className="text-[#666] text-sm font-semibold">No reconciliations found</p>
                      <p className="text-[#444] text-xs mt-1">
                        {searchQuery ? 'Try adjusting your search.' : 'Material reconciliations will appear here once job orders are completed.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationsList;

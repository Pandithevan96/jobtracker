import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import {
  Scale,
  Search,
  Plus,
  Building2,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface Reconciliation {
  id: number;
  reconciliation_code: string;
  job_order_number: string;
  vendor_name: string;
  issued_qty: number;
  received_qty: number;
  rejected_qty: number;
  scrap_loss_qty: number;
  status: 'settled' | 'variance_pending';
  date: string;
}

export const ReconciliationsList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([
    {
      id: 1,
      reconciliation_code: 'REC-2026-008',
      job_order_number: 'JO-2026-002',
      vendor_name: 'Sri Krishna Heat Treatments',
      issued_qty: 250,
      received_qty: 242,
      rejected_qty: 8,
      scrap_loss_qty: 0,
      status: 'settled',
      date: '2026-07-27',
    },
    {
      id: 2,
      reconciliation_code: 'REC-2026-007',
      job_order_number: 'JO-2026-001',
      vendor_name: 'Apex Precision Engineering',
      issued_qty: 500,
      received_qty: 350,
      rejected_qty: 12,
      scrap_loss_qty: 5,
      status: 'variance_pending',
      date: '2026-07-28',
    },
    {
      id: 3,
      reconciliation_code: 'REC-2026-006',
      job_order_number: 'JO-2026-004',
      vendor_name: 'Lakshmi Tooling Solutions',
      issued_qty: 40,
      received_qty: 20,
      rejected_qty: 0,
      scrap_loss_qty: 0,
      status: 'settled',
      date: '2026-07-22',
    },
  ]);

  useEffect(() => {
    fetchReconciliations();
  }, []);

  const fetchReconciliations = async () => {
    try {
      let workspaceIdRaw = localStorage.getItem('workspace_id');
      let workspaceId: number | null =
        workspaceIdRaw && workspaceIdRaw !== 'undefined' && workspaceIdRaw !== 'null'
          ? Number(workspaceIdRaw)
          : null;
      if (workspaceId !== null && isNaN(workspaceId)) workspaceId = null;

      const payload: Record<string, any> = {};
      if (workspaceId) payload.workspace_id = workspaceId;

      const res = await apiClient.post('/reconciliations/list', payload);
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setReconciliations(res.data.data);
      }
    } catch (e) {
      console.log('Using local fallback reconciliations');
    }
  };

  const filtered = reconciliations.filter(
    (r) =>
      r.reconciliation_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.job_order_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] text-[11px] uppercase tracking-wider text-[#777] bg-[#111]">
                <th className="py-3 px-4">Rec #</th>
                <th className="py-3 px-4">Job Order #</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4 text-center">Issued</th>
                <th className="py-3 px-4 text-center">Received Good</th>
                <th className="py-3 px-4 text-center">Rejected</th>
                <th className="py-3 px-4 text-center">Scrap / Loss</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222] text-xs">
              {filtered.map((rec) => (
                <tr key={rec.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                    <Link to={`/reconciliations/${rec.id}`} className="no-underline text-emerald-400 hover:underline">
                      {rec.reconciliation_code}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-amber-400">{rec.job_order_number}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">{rec.vendor_name}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-white">{rec.issued_qty}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">{rec.received_qty}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-400">{rec.rejected_qty}</td>
                  <td className="py-3.5 px-4 text-center font-mono text-[#888]">{rec.scrap_loss_qty}</td>
                  <td className="py-3.5 px-4">
                    {rec.status === 'settled' ? (
                      <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">
                        Settled
                      </span>
                    ) : (
                      <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">
                        Variance Check
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/reconciliations/${rec.id}`}
                      className="inline-flex items-center gap-1 bg-[#222] hover:bg-[#2e2e2e] text-white px-3 py-1.5 rounded-lg text-xs font-semibold no-underline border border-[#333]"
                    >
                      Audit Ledger <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationsList;

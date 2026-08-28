import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { Scale, ArrowLeft, Building2, Loader2, AlertCircle, Printer, FileText } from 'lucide-react';

interface RecData {
  id: number;
  reconciliation_code?: string;
  qty_sent?: number;
  qty_finished_received?: number;
  qty_scrap?: number;
  qty_rejected?: number;
  status: number;
  remarks?: string;
  created_at: string;
  job_order?: {
    id: number;
    order_number?: string;
    job_order_number?: string;
    part_name?: string;
    quantity_sent?: number;
    vendor?: { shop_name: string; contact_person?: string };
    workspace?: { name: string };
  };
  performed_by?: { id: number; name: string };
}

const STATUS_LABEL: Record<number, string> = {
  1: 'Variance Pending',
  2: 'Settled',
};

export const ReconciliationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RecData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/reconciliations/details', { id: Number(id) });
      const d = res.data?.data;
      if (!d) throw new Error('Reconciliation not found.');
      setData(d);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load reconciliation details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-[#888] text-xs py-24">
        <Loader2 size={16} className="animate-spin" /> Loading reconciliation details...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-3">
        <AlertCircle size={40} className="text-rose-400 mx-auto" />
        <p className="text-white font-bold">{error || 'Reconciliation not found.'}</p>
        <Link to="/reconciliations" className="text-[#f5a623] text-sm hover:underline no-underline">
          ← Back to Reconciliations
        </Link>
      </div>
    );
  }

  const issued    = data.qty_sent ?? data.job_order?.quantity_sent ?? 0;
  const received  = data.qty_finished_received ?? 0;
  const scrap     = data.qty_scrap ?? 0;
  const rejected  = data.qty_rejected ?? 0;
  const inProcess = Math.max(0, issued - received - scrap - rejected);
  const statusLabel = STATUS_LABEL[data.status] ?? 'Unknown';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        to="/reconciliations"
        className="inline-flex items-center gap-2 text-xs font-bold text-[#888] hover:text-white no-underline transition-colors"
      >
        <ArrowLeft size={16} /> Back to Reconciliations
      </Link>

      {/* Header */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-emerald-400 font-mono">
              {data.reconciliation_code || `REC-${data.id}`}
            </h1>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold border ${
                data.status === 2
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              {statusLabel.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-[#888]">Material Reconciliation Audit Ledger</p>
        </div>

        <button
          onClick={() => window.print()}
          className="bg-[#222] hover:bg-[#2e2e2e] text-white font-bold text-xs px-4 py-2 rounded-xl border border-[#333] cursor-pointer flex items-center gap-1.5"
        >
          <Printer size={16} /> Print Audit Summary
        </button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-1 text-xs">
          <span className="text-[#666] flex items-center gap-1.5"><FileText size={12} /> Job Order</span>
          <p className="font-mono font-bold text-amber-400">
            {data.job_order?.job_order_number || data.job_order?.order_number || `#${data.job_order?.id || '—'}`}
          </p>
          {data.job_order?.part_name && <p className="text-[#aaa]">{data.job_order.part_name}</p>}
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-1 text-xs">
          <span className="text-[#666] flex items-center gap-1.5"><Building2 size={12} /> Vendor</span>
          <p className="font-semibold text-white">{data.job_order?.vendor?.shop_name || '—'}</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-1 text-xs">
          <span className="text-[#666]">Date Reconciled</span>
          <p className="font-mono text-[#aaa]">{String(data.created_at).split('T')[0]}</p>
          {data.performed_by?.name && <p className="text-[#666]">By: {data.performed_by.name}</p>}
        </div>
      </div>

      {/* Quantity metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-[#262626] p-4 rounded-xl text-center">
          <span className="text-[11px] text-[#888] font-medium block">Total Issued</span>
          <span className="text-xl font-extrabold text-white font-mono mt-1 block">{issued} Pcs</span>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
          <span className="text-[11px] text-emerald-400 font-medium block">Received Good</span>
          <span className="text-xl font-extrabold text-emerald-300 font-mono mt-1 block">{received} Pcs</span>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center">
          <span className="text-[11px] text-rose-400 font-medium block">Rejected</span>
          <span className="text-xl font-extrabold text-rose-300 font-mono mt-1 block">{rejected} Pcs</span>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center">
          <span className="text-[11px] text-amber-400 font-medium block">Scrap / Loss</span>
          <span className="text-xl font-extrabold text-amber-300 font-mono mt-1 block">{scrap} Pcs</span>
        </div>
      </div>

      {/* Material Balance */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Scale size={18} className="text-emerald-400" /> Material Balance Equation
        </h3>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl space-y-3 text-xs font-mono">
          <div className="flex justify-between border-b border-[#262626] pb-2">
            <span className="text-[#888]">(+) Total Material Outward Dispatched:</span>
            <span className="text-white font-bold">{issued} Pcs</span>
          </div>
          <div className="flex justify-between text-emerald-400">
            <span>(−) Finished Inward Received:</span>
            <span>− {received} Pcs</span>
          </div>
          <div className="flex justify-between text-rose-400">
            <span>(−) Quality Rejections:</span>
            <span>− {rejected} Pcs</span>
          </div>
          <div className="flex justify-between text-[#aaa]">
            <span>(−) Approved Scrap / Turning Loss:</span>
            <span>− {scrap} Pcs</span>
          </div>
          <div className="flex justify-between border-t border-[#333] pt-2 font-bold text-amber-400 text-sm">
            <span>(=) Remaining In-Process Balance:</span>
            <span>{inProcess} Pcs</span>
          </div>
        </div>
        {data.remarks && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-3 rounded-xl text-xs">
            <span className="text-[#666] block mb-1">Remarks</span>
            <p className="text-[#aaa]">{data.remarks}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReconciliationDetail;

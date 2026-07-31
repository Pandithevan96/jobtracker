import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Scale, ArrowLeft, Building2, CheckCircle2, FileText, Printer } from 'lucide-react';

export const ReconciliationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const data = {
    code: `REC-2026-0${id || '07'}`,
    job_order: 'JO-2026-001',
    vendor: 'Apex Precision Engineering',
    date: '2026-07-28',
    issued: 500,
    received_good: 350,
    rejected: 12,
    scrap: 5,
    in_process: 133,
    variance: 0,
    status: 'AUDIT IN PROGRESS',
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        to="/reconciliations"
        className="inline-flex items-center gap-2 text-xs font-bold text-[#888] hover:text-white no-underline transition-colors"
      >
        <ArrowLeft size={16} /> Back to Reconciliations
      </Link>

      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-emerald-400 font-mono">{data.code}</h1>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full font-bold">
              {data.status}
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-[#262626] p-4 rounded-xl text-center">
          <span className="text-[11px] text-[#888] font-medium block">Total Raw Material Issued</span>
          <span className="text-xl font-extrabold text-white font-mono mt-1 block">{data.issued} Pcs</span>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
          <span className="text-[11px] text-emerald-400 font-medium block">Received Good Goods</span>
          <span className="text-xl font-extrabold text-emerald-300 font-mono mt-1 block">{data.received_good} Pcs</span>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center">
          <span className="text-[11px] text-rose-400 font-medium block">Rejections Logged</span>
          <span className="text-xl font-extrabold text-rose-300 font-mono mt-1 block">{data.rejected} Pcs</span>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center">
          <span className="text-[11px] text-amber-400 font-medium block">Currently In Process</span>
          <span className="text-xl font-extrabold text-amber-300 font-mono mt-1 block">{data.in_process} Pcs</span>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Scale size={18} className="text-emerald-400" />
          Material Balance Equation
        </h3>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl space-y-3 text-xs font-mono">
          <div className="flex justify-between border-b border-[#262626] pb-2">
            <span className="text-[#888]">(+) Total Material Outward Dispatched:</span>
            <span className="text-white font-bold">{data.issued} Pcs</span>
          </div>
          <div className="flex justify-between text-emerald-400">
            <span>(-) Total Finished Inward Received:</span>
            <span>- {data.received_good} Pcs</span>
          </div>
          <div className="flex justify-between text-rose-400">
            <span>(-) Quality Defect Rejections:</span>
            <span>- {data.rejected} Pcs</span>
          </div>
          <div className="flex justify-between text-[#aaa]">
            <span>(-) Approved Scrap / Turning Loss:</span>
            <span>- {data.scrap} Pcs</span>
          </div>
          <div className="flex justify-between border-t border-[#333] pt-2 font-bold text-amber-400 text-sm">
            <span>(=) Remaining In-Process Balance:</span>
            <span>{data.in_process} Pcs</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationDetail;

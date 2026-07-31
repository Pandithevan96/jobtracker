import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Building2,
  FileText,
  ShieldAlert,
  Download
} from 'lucide-react';

export const RejectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<'pending' | 'acknowledged' | 'closed'>('pending');

  const rejectionData = {
    rejection_number: `QR-2026-0${id || '14'}`,
    job_order_number: 'JO-2026-001',
    vendor_name: 'Apex Precision Engineering',
    item_name: 'CNC Turned Shaft Pins Ø25 x 150mm',
    rejected_qty: 12,
    total_qty: 500,
    defect_category: 'Dimensional Deviation (Tolerance Out)',
    defect_reason: 'Outer diameter measured at Ø24.93mm against required Ø25.00 ± 0.02mm limit. 12 units sampled failed CMM inspection.',
    inspector: 'K. Rajan (QC Inspector)',
    date: '2026-07-28',
    status: status,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        to="/rejections"
        className="inline-flex items-center gap-2 text-xs font-bold text-[#888] hover:text-white no-underline transition-colors"
      >
        <ArrowLeft size={16} /> Back to Quality Rejections
      </Link>

      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-rose-400 font-mono">{rejectionData.rejection_number}</h1>
            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-3 py-1 rounded-full font-bold uppercase">
              {rejectionData.status}
            </span>
          </div>
          <p className="text-xs text-[#888]">Vendor Claim &amp; Defect Audit Note</p>
        </div>

        <div className="flex items-center gap-2">
          {status === 'pending' && (
            <button
              onClick={() => setStatus('acknowledged')}
              className="bg-blue-500 hover:bg-blue-600 text-black font-bold text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={16} /> Acknowledge Defect
            </button>
          )}
          {status !== 'closed' && (
            <button
              onClick={() => setStatus('closed')}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={16} /> Resolve &amp; Close Rejection
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-rose-400" />
            Defect Specification Report
          </h2>

          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl space-y-2 text-xs">
            <span className="font-bold text-rose-400 uppercase tracking-wider text-[10px]">Defect Classification:</span>
            <p className="font-bold text-white text-sm">{rejectionData.defect_category}</p>
            <p className="text-rose-200 leading-relaxed">{rejectionData.defect_reason}</p>
          </div>

          <div className="divide-y divide-[#222] text-xs pt-2">
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888]">Job Order Reference</span>
              <span className="font-mono font-bold text-amber-400">{rejectionData.job_order_number}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888]">Vendor Name</span>
              <span className="font-semibold text-white">{rejectionData.vendor_name}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888]">Affected Component</span>
              <span className="font-semibold text-white">{rejectionData.item_name}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888]">Inspector / Quality Lead</span>
              <span className="text-gray-300">{rejectionData.inspector}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Rejection Metrics</h3>
          <div className="space-y-3 text-xs">
            <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a]">
              <span className="text-[#888]">Rejected Quantity:</span>
              <p className="text-2xl font-mono font-extrabold text-rose-400 mt-1">{rejectionData.rejected_qty} Pcs</p>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a]">
              <span className="text-[#888]">Total Batch Size:</span>
              <p className="text-xl font-mono font-bold text-white mt-1">{rejectionData.total_qty} Pcs</p>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a]">
              <span className="text-[#888]">Rejection Rate:</span>
              <p className="text-lg font-mono font-bold text-amber-400 mt-1">
                {((rejectionData.rejected_qty / rejectionData.total_qty) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionDetail;

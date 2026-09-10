import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, Clock, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import apiClient from '@/services/apiClient';

interface ReconciliationData {
  job_order_id: number;
  workspace_id: number;
  dispatched_qty: number;
  returned_qty: number;
  scrap_qty: number;
  rework_qty: number;
  implied_wip_qty: number;
  variance_qty: number;
  variance_pct: number;
  tolerance_pct: number;
  status: 'balanced' | 'pending' | 'anomaly';
  active_anomaly?: {
    id: number;
    resolved: boolean;
    status: string;
    detected_at: string;
  } | null;
}

interface MaterialReconciliationCardProps {
  jobOrderId: number;
}

export const MaterialReconciliationCard: React.FC<MaterialReconciliationCardProps> = ({ jobOrderId }) => {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);

  const fetchReconciliation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/job-orders/${jobOrderId}/reconciliation`);
      if (res.data && res.data.data) {
        setData(res.data.data);
      } else {
        setData(res.data);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobOrderId) {
      fetchReconciliation();
    }
  }, [jobOrderId]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.active_anomaly?.id || !resolutionNotes.trim()) return;

    setResolving(true);
    try {
      await apiClient.post('/material-anomalies/resolve', {
        id: data.active_anomaly.id,
        resolution_notes: resolutionNotes.trim(),
      });
      setShowResolveModal(false);
      setResolutionNotes('');
      fetchReconciliation();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to resolve anomaly');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 flex items-center justify-center text-[#888]">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Calculating Material Reconciliation...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 text-sm text-red-400">
        {error || 'Unable to fetch reconciliation data'}
      </div>
    );
  }

  const isAnomaly = data.status === 'anomaly';
  const isBalanced = data.status === 'balanced';

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-lg ${isAnomaly ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : isBalanced ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
            {isAnomaly ? <ShieldAlert className="w-5 h-5" /> : isBalanced ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Material Reconciliation & Flow
            </h3>
            <p className="text-xs text-[#888]">
              Automated Dispatched vs. Received & Loss Detection (Tolerance: {data.tolerance_pct}%)
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isAnomaly && (
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              Anomaly Threshold Exceeded
            </span>
          )}
          {isBalanced && (
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Material Balanced
            </span>
          )}
          {!isAnomaly && !isBalanced && (
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              WIP In Progress
            </span>
          )}
        </div>
      </div>

      {/* Grid Metrics Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-[#1c1c1c] p-3 rounded-lg border border-[#2a2a2a]">
          <span className="text-[11px] text-[#888] font-medium block">Dispatched</span>
          <span className="text-lg font-bold text-white mt-1 block">{data.dispatched_qty}</span>
        </div>
        <div className="bg-[#1c1c1c] p-3 rounded-lg border border-[#2a2a2a]">
          <span className="text-[11px] text-[#888] font-medium block">Returned (Inward)</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block">{data.returned_qty}</span>
        </div>
        <div className="bg-[#1c1c1c] p-3 rounded-lg border border-[#2a2a2a]">
          <span className="text-[11px] text-[#888] font-medium block">Scrap Logged</span>
          <span className="text-lg font-bold text-rose-400 mt-1 block">{data.scrap_qty}</span>
        </div>
        <div className="bg-[#1c1c1c] p-3 rounded-lg border border-[#2a2a2a]">
          <span className="text-[11px] text-[#888] font-medium block">Rework Logged</span>
          <span className="text-lg font-bold text-amber-400 mt-1 block">{data.rework_qty}</span>
        </div>
        <div className="bg-[#1c1c1c] p-3 rounded-lg border border-[#2a2a2a]">
          <span className="text-[11px] text-[#888] font-medium block">Implied WIP</span>
          <span className="text-lg font-bold text-blue-400 mt-1 block">{data.implied_wip_qty}</span>
        </div>
        <div className={`p-3 rounded-lg border ${isAnomaly ? 'bg-rose-500/10 border-rose-500/30' : 'bg-[#1c1c1c] border-[#2a2a2a]'}`}>
          <span className="text-[11px] text-[#888] font-medium block">Variance / Loss</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className={`text-lg font-bold ${isAnomaly ? 'text-rose-400' : 'text-white'}`}>
              {data.variance_qty}
            </span>
            <span className="text-xs text-[#888]">({data.variance_pct}%)</span>
          </div>
        </div>
      </div>

      {/* Anomaly Resolution Action Bar */}
      {data.active_anomaly && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm text-rose-300">
            <strong>Open Anomaly Action Required:</strong> Variance of {data.variance_qty} units ({data.variance_pct}%) exceeds target tolerance of {data.tolerance_pct}%.
          </div>
          <button
            onClick={() => setShowResolveModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-lg transition-colors shadow-lg"
          >
            Resolve Anomaly
          </button>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Resolve Material Anomaly</h3>
            <p className="text-xs text-[#a1a1aa]">
              Provide audit justification notes for closing variance of {data.variance_qty} units on Job Order #{jobOrderId}.
            </p>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Approved material tolerance offset / manual machine calibration loss..."
              rows={4}
              className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 bg-[#27272a] text-[#a1a1aa] hover:text-white rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={resolving || !resolutionNotes.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {resolving ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialReconciliationCard;

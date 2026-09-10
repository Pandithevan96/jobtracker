import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, AlertTriangle, Eye, RefreshCw, Filter, FileText } from 'lucide-react';
import apiClient from '@/services/apiClient';

interface Anomaly {
  id: number;
  job_order_id: number;
  dispatched_qty: number;
  returned_qty: number;
  scrap_qty: number;
  rework_qty: number;
  implied_wip_qty: number;
  variance_qty: number;
  variance_pct: number;
  status: string;
  resolved: boolean;
  resolution_notes?: string;
  detected_at: string;
  job_order?: {
    id: number;
    order_number: string;
    part_name: string;
    vendor?: {
      shop_name: string;
    };
  };
  resolver?: {
    name: string;
  };
}

export const MaterialAnomaliesList: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'open' | 'resolved'>('open');
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/material-anomalies?status=${filterStatus}`);
      const list = res.data?.data || res.data || [];
      setAnomalies(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [filterStatus]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingId || !notes.trim()) return;

    setSubmitting(true);
    try {
      await apiClient.post('/material-anomalies/resolve', {
        id: resolvingId,
        resolution_notes: notes.trim(),
      });
      setResolvingId(null);
      setNotes('');
      fetchAnomalies();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to resolve anomaly');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
            Material Leakage & Anomaly Detection
          </h1>
          <p className="text-sm text-[#888] mt-1">
            Automated monitoring of material dispatches vs returns & loss tolerance thresholds
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-[#141414] border border-[#262626] p-1 rounded-xl">
          <button
            onClick={() => setFilterStatus('open')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
              filterStatus === 'open'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-[#888] hover:text-white'
            }`}
          >
            Open Anomalies
          </button>
          <button
            onClick={() => setFilterStatus('resolved')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
              filterStatus === 'resolved'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-[#888] hover:text-white'
            }`}
          >
            Resolved Audit History
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-[#888] space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading anomaly records...</span>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="p-12 text-center text-[#888]">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3 opacity-60" />
            <p className="text-base font-medium text-white">No {filterStatus} material anomalies found</p>
            <p className="text-xs text-[#666] mt-1">All material dispatches and returns are within calibrated tolerance levels.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#ccc]">
              <thead className="bg-[#1a1a1a] text-xs uppercase text-[#888] border-b border-[#262626]">
                <tr>
                  <th className="px-6 py-4">Job Order #</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4 text-right">Dispatched</th>
                  <th className="px-6 py-4 text-right">Returned</th>
                  <th className="px-6 py-4 text-right">Scrap / Rework</th>
                  <th className="px-6 py-4 text-right">Variance Loss</th>
                  <th className="px-6 py-4">Detected At</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {anomalies.map((item) => (
                  <tr key={item.id} className="hover:bg-[#181818] transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`/job-orders/${item.job_order_id}`}
                        className="font-semibold text-white hover:text-amber-400 transition-colors flex items-center gap-1.5"
                      >
                        <FileText className="w-4 h-4 text-amber-500" />
                        {item.job_order?.order_number || `#${item.job_order_id}`}
                      </Link>
                      <span className="text-xs text-[#666] block mt-0.5">{item.job_order?.part_name}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {item.job_order?.vendor?.shop_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold">{item.dispatched_qty}</td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-400 font-semibold">{item.returned_qty}</td>
                    <td className="px-6 py-4 text-right font-mono text-amber-400">
                      {Number(item.scrap_qty) + Number(item.rework_qty)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono font-bold text-rose-400 block">{item.variance_qty}</span>
                      <span className="text-xs text-rose-400/80 font-mono">({item.variance_pct}%)</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#888]">
                      {item.detected_at ? new Date(item.detected_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <Link
                        to={`/job-orders/${item.job_order_id}`}
                        className="p-2 bg-[#222] hover:bg-[#333] text-white rounded-lg inline-flex items-center text-xs font-medium transition-colors"
                        title="View Job Order"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {!item.resolved && (
                        <button
                          onClick={() => {
                            setResolvingId(item.id);
                            setNotes('');
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolvingId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Audit Resolution Note</h3>
            <p className="text-xs text-[#a1a1aa]">
              Record resolution comments for closing anomaly ID #{resolvingId}.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Scrapped parts accounted for in shop audit..."
              rows={4}
              className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setResolvingId(null)}
                className="px-4 py-2 bg-[#27272a] text-[#a1a1aa] hover:text-white rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={submitting || !notes.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {submitting ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialAnomaliesList;

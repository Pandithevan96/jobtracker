import React, { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';
import { DatePicker } from '@/components/DatePicker/DatePicker';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  PackageCheck,
  TrendingUp,
} from 'lucide-react';

export const Itc04ReportPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  useEffect(() => {
    // Default to current financial quarter
    const now = new Date();
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), qStartMonth, 1);
    const end = new Date(now.getFullYear(), qStartMonth + 3, 0);

    setFromDate(start.toISOString().split('T')[0]);
    setToDate(end.toISOString().split('T')[0]);
    fetchReport(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  }, []);

  const getWorkspaceId = async (): Promise<number | null> => {
    let raw = localStorage.getItem('workspace_id');
    let id = raw && raw !== 'undefined' && raw !== 'null' ? Number(raw) : null;
    if (!id) {
      try {
        const res = await apiClient.post('/workspaces/list');
        const list = res.data?.data;
        if (Array.isArray(list) && list.length > 0) {
          id = Number(list[0].id);
          localStorage.setItem('workspace_id', String(id));
        }
      } catch { /* silent */ }
    }
    return id;
  };

  const fetchReport = async (from = fromDate, to = toDate) => {
    setLoading(true);
    setError(null);
    try {
      const wsId = await getWorkspaceId();
      const res = await apiClient.post('/reports/itc04', {
        workspace_id: wsId,
        from_date: from,
        to_date: to,
      });
      setReport(res.data?.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch ITC-04 report.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const wsId = await getWorkspaceId();
      const res = await apiClient.post('/reports/itc04/export-csv', {
        workspace_id: wsId,
        from_date: fromDate,
        to_date: toDate,
      });

      const data = res.data?.data;
      if (data?.base64_csv) {
        const link = document.createElement('a');
        link.href = data.base64_csv;
        link.download = data.file_name || 'Form_GST_ITC04.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Form GST ITC-04 Report <FileSpreadsheet className="text-amber-400" size={24} />
          </h1>
          <p className="text-xs text-[#888] mt-1">
            Quarterly / Half-Yearly GST Return for Inputs/Capital Goods Sent to & Received Back from Job Workers
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting || loading || !report}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Export CSV for GST Portal
        </button>
      </div>

      {/* Date Controls */}
      <div className="bg-[#141414] border border-[#262626] p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#aaa] font-semibold">From:</span>
            <DatePicker value={fromDate} onChange={(d) => setFromDate(d)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#aaa] font-semibold">To:</span>
            <DatePicker value={toDate} min={fromDate} onChange={(d) => setToDate(d)} />
          </div>
          <button
            onClick={() => fetchReport(fromDate, toDate)}
            className="bg-[#222] hover:bg-[#333] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#333] cursor-pointer"
          >
            Filter
          </button>
        </div>

        {report && (
          <div className="flex items-center gap-4 text-xs font-mono text-[#aaa]">
            <div>Workspace GSTIN: <strong className="text-white">{report.workspace_gstin}</strong></div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 text-[#888] text-xs py-16 bg-[#141414] border border-[#262626] rounded-2xl">
          <Loader2 size={16} className="animate-spin" /> Generating ITC-04 dataset...
        </div>
      )}

      {!loading && report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#141414] border border-[#262626] p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-[#777] font-bold uppercase tracking-wider">Outward DCs (Table 4)</span>
              <div className="text-xl font-black text-amber-400 font-mono">{report.summary.total_outward_dcs} line items</div>
            </div>
            <div className="bg-[#141414] border border-[#262626] p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-[#777] font-bold uppercase tracking-wider">Inward Returns (Table 5)</span>
              <div className="text-xl font-black text-emerald-400 font-mono">{report.summary.total_inward_dcs} line items</div>
            </div>
            <div className="bg-[#141414] border border-[#262626] p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-[#777] font-bold uppercase tracking-wider">Total Dispatched Value</span>
              <div className="text-xl font-black text-white font-mono">₹{Number(report.summary.total_outward_val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-[#141414] border border-[#262626] p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-[#777] font-bold uppercase tracking-wider">Total Returned Value</span>
              <div className="text-xl font-black text-white font-mono">₹{Number(report.summary.total_inward_val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          {/* Table 4 Section */}
          <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
            <div className="p-4 bg-[#111] border-b border-[#262626] flex items-center justify-between">
              <h2 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} /> Table 4: Details of Goods Sent to Job Worker
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#262626] text-[10px] uppercase text-[#777] bg-[#0d0d0d]">
                    <th className="py-3 px-4">Worker GSTIN</th>
                    <th className="py-3 px-4">Worker Shop Name</th>
                    <th className="py-3 px-4">Challan #</th>
                    <th className="py-3 px-4">Challan Date</th>
                    <th className="py-3 px-4">Part Name</th>
                    <th className="py-3 px-4">HSN</th>
                    <th className="py-3 px-4 text-right">Qty</th>
                    <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {report.table_4_outward.length > 0 ? (
                    report.table_4_outward.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#1a1a1a]">
                        <td className="py-3 px-4 font-mono font-bold text-white">{row.job_worker_gstin}</td>
                        <td className="py-3 px-4 font-semibold text-white">{row.job_worker_name}</td>
                        <td className="py-3 px-4 font-mono text-amber-400">{row.challan_number}</td>
                        <td className="py-3 px-4 font-mono text-[#888]">{row.challan_date}</td>
                        <td className="py-3 px-4 text-white">{row.part_name}</td>
                        <td className="py-3 px-4 font-mono text-[#aaa]">{row.hsn_code}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">{row.quantity} {row.uom}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">₹{Number(row.taxable_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#666]">No outward challan entries found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 5 Section */}
          <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
            <div className="p-4 bg-[#111] border-b border-[#262626] flex items-center justify-between">
              <h2 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <PackageCheck size={16} /> Table 5: Details of Goods Received Back from Job Worker
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#262626] text-[10px] uppercase text-[#777] bg-[#0d0d0d]">
                    <th className="py-3 px-4">Worker GSTIN</th>
                    <th className="py-3 px-4">Ref Original Outward DC #</th>
                    <th className="py-3 px-4">Inward DC #</th>
                    <th className="py-3 px-4">Return Date</th>
                    <th className="py-3 px-4">Part Name</th>
                    <th className="py-3 px-4 text-right">Qty Received</th>
                    <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {report.table_5_inward.length > 0 ? (
                    report.table_5_inward.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#1a1a1a]">
                        <td className="py-3 px-4 font-mono font-bold text-white">{row.job_worker_gstin}</td>
                        <td className="py-3 px-4 font-mono text-amber-400">{row.original_dc_number}</td>
                        <td className="py-3 px-4 font-mono text-emerald-400">{row.inward_dc_number}</td>
                        <td className="py-3 px-4 font-mono text-[#888]">{row.inward_dc_date}</td>
                        <td className="py-3 px-4 text-white">{row.part_name}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">{row.quantity_received} {row.uom}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">₹{Number(row.taxable_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#666]">No inward return entries found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Itc04ReportPage;

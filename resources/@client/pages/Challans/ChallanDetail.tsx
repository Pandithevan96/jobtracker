import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Printer,
  Loader2,
  AlertCircle,
  RefreshCw,
  Truck,
  Building2,
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';

interface ChallanItem {
  id?: number;
  part_name: string;
  part_number?: string;
  quantity: number;
  uom?: string;
  unit_value?: number;
  total_value?: number;
  description?: string;
}

interface Vendor {
  id: number;
  shop_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
}

interface Workspace {
  id: number;
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
}

interface JobOrder {
  id: number;
  job_order_number?: string;
  order_number?: string;
  part_name?: string;
  workspace?: Workspace;
  vendor?: Vendor;
}

interface Challan {
  id: number;
  challan_number?: string;
  dc_number?: string;
  type: number | string;
  status: number | string;
  dispatch_date?: string;
  estimated_delivery?: string;
  vehicle_number?: string;
  driver_name?: string;
  notes?: string;
  created_at?: string;
  acknowledged_at?: string;
  items?: ChallanItem[];
  vendor?: Vendor;
  job_order?: JobOrder;
  workspace?: Workspace;
}

export const ChallanDetail: React.FC = () => {
  const { appMode } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchChallan = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/challans/details', { id: Number(id) });
      const data = res.data?.data ?? res.data;
      setChallan(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load delivery challan details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChallan();
  }, [fetchChallan]);

  const handleAcknowledge = async () => {
    if (!challan) return;
    setAcknowledging(true);
    try {
      await apiClient.post('/challans/acknowledge', { id: challan.id });
      await fetchChallan();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to acknowledge delivery challan.');
    } finally {
      setAcknowledging(false);
    }
  };

  const handlePrintOrPdf = async () => {
    if (!challan) return;
    setDownloadingPdf(true);
    try {
      const res = await apiClient.post('/challans/download-pdf', { id: challan.id });
      const downloadUrl = res.data?.data?.download_url || res.data?.download_url;
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        window.print();
      }
    } catch {
      // Fallback to browser native print
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#888]">
        <Loader2 className="animate-spin mr-3" size={22} />
        <span className="text-sm">Loading delivery challan details...</span>
      </div>
    );
  }

  if (error || !challan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-rose-400">
        <AlertCircle size={32} />
        <p className="text-sm">{error ?? 'Delivery challan not found.'}</p>
        <button
          onClick={fetchChallan}
          className="flex items-center gap-2 text-xs bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-2 rounded-xl hover:border-[#f5a623] transition-colors text-[#aaa]"
        >
          <RefreshCw size={14} /> Retry
        </button>
        <Link to="/challans" className="text-xs text-[#666] hover:text-white transition-colors">
          ← Back to Delivery Challans
        </Link>
      </div>
    );
  }

  const dcNumber = challan.challan_number || challan.dc_number || `DC-${challan.id}`;
  const isOutward = String(challan.type) === '1' || String(challan.type).toLowerCase() === 'outward';
  const isAcknowledged = String(challan.status) === '3' || String(challan.status).toLowerCase() === 'acknowledged' || !!challan.acknowledged_at;

  const senderName = challan.job_order?.workspace?.name || challan.workspace?.name || 'Company Workspace';
  const senderAddress = challan.job_order?.workspace?.address || challan.workspace?.address || 'Industrial Estate, India';
  const senderGstin = challan.job_order?.workspace?.gstin || challan.workspace?.gstin || '—';
  const senderPhone = challan.job_order?.workspace?.phone || challan.workspace?.phone || '—';

  const consigneeName = challan.vendor?.shop_name || challan.job_order?.vendor?.shop_name || 'Vendor Company';
  const consigneeAddress = challan.vendor?.address || challan.job_order?.vendor?.address || '—';
  const consigneeGstin = challan.vendor?.gst_number || '—';
  const consigneeContact = challan.vendor?.contact_person || challan.vendor?.phone || '—';

  const joNumber = challan.job_order?.job_order_number || challan.job_order?.order_number || (challan.job_order_id ? `#${challan.job_order_id}` : '—');
  const dispatchDateStr = challan.dispatch_date ? String(challan.dispatch_date).split('T')[0] : (challan.created_at ? String(challan.created_at).split('T')[0] : '—');

  const itemsList = challan.items && challan.items.length > 0 ? challan.items : [];
  const totalQty = itemsList.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/challans"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#888] hover:text-white no-underline transition-colors"
        >
          <ArrowLeft size={16} /> Back to Delivery Challans
        </Link>

        <div className="flex items-center gap-2">
          {!isAcknowledged ? (
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold text-xs px-4 py-2 rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              {acknowledging ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Acknowledge Receipt
            </button>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1">
              <CheckCircle2 size={14} /> Receipt Acknowledged
            </span>
          )}

          <button
            onClick={handlePrintOrPdf}
            disabled={downloadingPdf}
            className="bg-[#222] hover:bg-[#2e2e2e] text-white font-bold text-xs px-4 py-2 rounded-xl border border-[#333] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            Print / Download PDF
          </button>
        </div>
      </div>

      {/* Formal Challan Document Paper Card */}
      <div className="bg-white text-black rounded-2xl p-8 shadow-2xl border border-gray-200 font-sans print:p-0 print:border-none">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-300 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Truck className="text-blue-600" size={24} />
              <h2 className="text-xl font-black text-gray-900 tracking-tight">{senderName}</h2>
            </div>
            <p className="text-xs text-gray-600 max-w-sm">{senderAddress}</p>
            <p className="text-xs text-gray-600 mt-1">
              <strong>GSTIN:</strong> {senderGstin} | <strong>Ph:</strong> {senderPhone}
            </p>
          </div>

          <div className="text-right">
            <span className={`inline-block font-black text-xs px-3 py-1 rounded uppercase tracking-wider mb-2 ${isOutward ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'}`}>
              {isOutward ? 'OUTWARD DELIVERY CHALLAN' : 'INWARD DELIVERY CHALLAN'}
            </span>
            <h3 className="text-lg font-mono font-bold text-gray-900">{dcNumber}</h3>
            <p className="text-xs text-gray-600 font-mono">Date: {dispatchDateStr}</p>
            <p className="text-xs text-gray-600 font-mono">JO Ref: {joNumber}</p>
          </div>
        </div>

        {/* Consignee & Transport Meta */}
        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 text-xs">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Consignee / Deliver To:</span>
            <p className="font-bold text-gray-900 text-sm">{consigneeName}</p>
            <p className="text-gray-600">{consigneeAddress}</p>
            <p className="text-gray-600 mt-1">
              <strong>GSTIN:</strong> {consigneeGstin} | <strong>Contact:</strong> {consigneeContact}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Dispatch Meta:</span>
            <p>
              <strong className="text-gray-700">Vehicle Registration #:</strong> {challan.vehicle_number || '—'}
            </p>
            <p>
              <strong className="text-gray-700">Driver Name:</strong> {challan.driver_name || '—'}
            </p>
            <p>
              <strong className="text-gray-700">Notes / Purpose:</strong> {challan.notes || 'Subcontract Job Work / Processing'}
            </p>
          </div>
        </div>

        {/* Item Table */}
        <div className="overflow-hidden border border-gray-300 rounded-xl mb-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3 w-10 text-center">Sl #</th>
                <th className="py-2.5 px-3">Part Code</th>
                <th className="py-2.5 px-3">Material Description & Specification</th>
                <th className="py-2.5 px-3 text-center">HSN/SAC</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-center">Unit</th>
                <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {itemsList.length > 0 ? (
                itemsList.map((item, idx) => {
                  const lineTotal = Number(item.total_value) || (Number(item.quantity || 0) * Number(item.unit_value || 0));
                  return (
                    <tr key={idx} className="text-gray-800">
                      <td className="py-3 px-3 text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono font-bold text-gray-900">{item.part_number || '—'}</td>
                      <td className="py-3 px-3 font-medium">
                        {item.part_name}
                        {item.description ? <span className="block text-[11px] text-gray-500 font-normal">{item.description}</span> : null}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-gray-600">{item.hsn_code || '—'}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">{item.quantity}</td>
                      <td className="py-3 px-3 text-center font-semibold">{item.uom || 'Nos'}</td>
                      <td className="py-3 px-3 text-right font-mono text-gray-700">
                        {item.unit_value ? `₹${Number(item.unit_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                        {lineTotal > 0 ? `₹${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-gray-500">No line items in this challan</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold text-gray-900 border-t border-gray-300">
                <td colSpan={4} className="py-3 px-3 text-right uppercase">
                  Grand Total:
                </td>
                <td className="py-3 px-3 text-right font-mono font-extrabold text-sm">{totalQty}</td>
                <td className="py-3 px-3 text-center">Items</td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3 text-right font-mono font-extrabold text-sm text-emerald-700">
                  {grandTotalValue > 0 ? `₹${grandTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* GST Terms & Declaration Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-6 text-[11px] text-gray-600 leading-relaxed space-y-1">
          <p className="font-bold text-gray-900 uppercase tracking-wider text-[10px]">Terms &amp; GST Rule 55 Declaration:</p>
          <p>1. Issued under <strong>Rule 55 of CGST Rules, 2017</strong> &amp; <strong>Section 143 of CGST Act, 2017</strong> for job work processing.</p>
          <p>2. Values declared are for transit insurance and GST compliance purposes (this is a Delivery Challan for job work movement, not a sales invoice).</p>
          <p>3. Goods must be processed and returned to the Principal workspace within 1 year from dispatch date.</p>
        </div>

        {/* Declarations & Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-300 text-xs">
          <div>
            <p className="font-bold text-gray-800 mb-1">Declaration:</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              We declare that this Delivery Challan shows the actual quantity of goods described and that all particulars are true and correct. Goods sent strictly for Job Work under Rule 55.
            </p>
          </div>

          <div className="flex flex-col justify-between h-28 text-right">
            <div>
              <p className="font-bold text-gray-900">For {senderName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold">(Authorized Signatory / Gate Stamp)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallanDetail;

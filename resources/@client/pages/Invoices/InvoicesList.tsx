import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { DatePicker } from '@/components/DatePicker/DatePicker';
import {
  FileText,
  Plus,
  X,
  Search,
  Building2,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  InboxIcon,
  CheckCircle2,
  Clock,
  IndianRupee,
} from 'lucide-react';

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  sac_code: string;
  taxable_amount: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  total_amount: number;
  payment_status: number;
  amount_paid: number;
  vendor?: { id: number; shop_name: string };
  job_order?: { id: number; order_number: string };
  delivery_challan?: { id: number; challan_number: string };
}

interface InvoiceFormItem {
  service_description: string;
  sac_code: string;
  quantity: number;
  rate: number;
  uom: string;
}

const emptyInvoiceItem = (): InvoiceFormItem => ({
  service_description: '4-Hole Drilling / Machining Job Work Charges',
  sac_code: '9988',
  quantity: 1,
  rate: 0,
  uom: 'Nos',
});

const getPaymentBadge = (status: number) => {
  switch (status) {
    case 3:
      return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> Paid</span>;
    case 2:
      return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><Clock size={12} /> Partial</span>;
    default:
      return <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><AlertCircle size={12} /> Unpaid</span>;
  }
};

export const InvoicesList: React.FC = () => {
  const { appMode } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Dropdown options
  const [vendors, setVendors] = useState<any[]>([]);
  const [challans, setChallans] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    vendor_id: '',
    delivery_challan_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    gst_rate: '12',
    notes: '',
  });
  const [items, setItems] = useState<InvoiceFormItem[]>([emptyInvoiceItem()]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
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

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const wsId = await getWorkspaceId();
      const payload: Record<string, any> = {};
      if (wsId) payload.workspace_id = wsId;

      const res = await apiClient.post('/invoices/list', payload);
      setInvoices(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async () => {
    setCreateError(null);
    setForm({
      vendor_id: '',
      delivery_challan_id: '',
      invoice_number: `INV-${Date.now().toString().slice(-5)}`,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      gst_rate: '12',
      notes: '',
    });
    setItems([emptyInvoiceItem()]);
    setShowCreateModal(true);

    try {
      const wsId = await getWorkspaceId();
      const [vRes, cRes] = await Promise.all([
        apiClient.post('/vendors/list', { workspace_id: wsId }),
        apiClient.post('/challans/list', { workspace_id: wsId }),
      ]);
      setVendors(Array.isArray(vRes.data?.data) ? vRes.data.data : []);
      setChallans(Array.isArray(cRes.data?.data) ? cRes.data.data : []);
    } catch { /* silent */ }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vendor_id) {
      setCreateError('Please select a Vendor.');
      return;
    }
    if (items.some((i) => !i.service_description || Number(i.rate) <= 0)) {
      setCreateError('Please specify valid service descriptions and rates.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const wsId = await getWorkspaceId();
      const selectedChallan = challans.find((c) => String(c.id) === form.delivery_challan_id);

      const payload = {
        workspace_id: wsId,
        vendor_id: Number(form.vendor_id),
        delivery_challan_id: form.delivery_challan_id ? Number(form.delivery_challan_id) : undefined,
        job_order_id: selectedChallan?.job_order_id ? Number(selectedChallan.job_order_id) : undefined,
        invoice_number: form.invoice_number.trim(),
        invoice_date: form.invoice_date,
        due_date: form.due_date || undefined,
        gst_rate: Number(form.gst_rate),
        notes: form.notes.trim() || undefined,
        items: items.map((i) => ({
          service_description: i.service_description.trim(),
          sac_code: i.sac_code.trim() || '9988',
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          uom: i.uom,
        })),
      };

      await apiClient.post('/invoices/create', payload);
      setShowCreateModal(false);
      await fetchInvoices();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || err?.message || 'Failed to record invoice.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = invoices.filter((inv) => {
    const invNo = inv.invoice_number.toLowerCase();
    const vendorName = (inv.vendor?.shop_name || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchSearch = invNo.includes(q) || vendorName.includes(q);
    const matchStatus = statusFilter === 'all' || String(inv.payment_status) === statusFilter;
    return matchSearch && matchStatus;
  });

  const inputCls = () =>
    'w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623] text-xs';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Job Work Invoices <FileText className="text-emerald-400" size={24} />
          </h1>
          <p className="text-xs text-[#888] mt-1">Vendor machining & labor charges billing (SAC 9988 @ 12% GST)</p>
        </div>

        {appMode === 'principal' && (
          <button
            onClick={openModal}
            className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} /> Record Vendor Invoice
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#141414] border border-[#262626] p-4 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder="Search by invoice # or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-xs pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#f5a623]"
          />
        </div>
        <div className="flex items-center gap-2">
          {[{ v: 'all', l: 'All' }, { v: '1', l: 'Unpaid' }, { v: '2', l: 'Partial' }, { v: '3', l: 'Paid' }].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                statusFilter === v
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-[#888] text-xs py-16 bg-[#141414] border border-[#262626] rounded-2xl">
          <Loader2 size={16} className="animate-spin" /> Loading job work invoices...
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] text-[11px] uppercase tracking-wider text-[#777] bg-[#111]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Ref Delivery DC</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Taxable (₹)</th>
                  <th className="py-3 px-4 text-right">GST Rate</th>
                  <th className="py-3 px-4 text-right">Total Payable (₹)</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222] text-xs">
                {filtered.length > 0 ? (
                  filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{inv.invoice_number}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-[#555]" />
                          {inv.vendor?.shop_name || '—'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-blue-400">
                        {inv.delivery_challan?.challan_number || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#888] font-mono">
                        {inv.invoice_date ? String(inv.invoice_date).split('T')[0] : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                        ₹{Number(inv.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-400 font-bold">
                        {inv.gst_rate}% (SAC {inv.sac_code || '9988'})
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-400 text-sm">
                        ₹{Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">{getPaymentBadge(inv.payment_status)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-14 text-center">
                      <InboxIcon size={32} className="text-[#333] mx-auto mb-3" />
                      <p className="text-[#666] text-sm font-semibold">No job work invoices found</p>
                      <p className="text-[#444] text-xs mt-1">Record vendor billing invoices to complete accounting decoupling.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2a2a2a] w-full max-w-lg rounded-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between p-6 pb-4 border-b border-[#222]">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <IndianRupee size={18} className="text-emerald-400" /> Record Job Work Invoice
                </h2>
                <p className="text-xs text-[#888] mt-0.5">Labor / machining charges billed by vendor (SAC 9988 @ 12% GST)</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-[#888] hover:text-white bg-transparent border-none cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4 text-xs">
              {createError && (
                <div className="flex items-center gap-2 text-red-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                  <AlertCircle size={14} className="shrink-0" /> {createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Vendor <span className="text-red-400">*</span></label>
                  <select
                    value={form.vendor_id}
                    onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                    className={inputCls()}
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.shop_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Ref Delivery Challan</label>
                  <select
                    value={form.delivery_challan_id}
                    onChange={(e) => setForm({ ...form, delivery_challan_id: e.target.value })}
                    className={inputCls()}
                  >
                    <option value="">Select Delivery Challan...</option>
                    {challans.map((c) => (
                      <option key={c.id} value={c.id}>{c.challan_number || `DC-${c.id}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Invoice Number <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                    className={inputCls()}
                  />
                </div>
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Invoice Date <span className="text-red-400">*</span></label>
                  <DatePicker
                    value={form.invoice_date}
                    placeholder="Select invoice date"
                    onChange={(d) => setForm({ ...form, invoice_date: d })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">GST Rate %</label>
                  <select
                    value={form.gst_rate}
                    onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}
                    className={inputCls()}
                  >
                    <option value="12">12% (Job Work Standard under SAC 9988)</option>
                    <option value="18">18% (General Manufacturing Services)</option>
                    <option value="5">5% (Special Concessional Rate)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#aaa] font-semibold mb-1">Payment Due Date</label>
                  <DatePicker
                    value={form.due_date}
                    min={form.invoice_date}
                    placeholder="Select due date"
                    onChange={(d) => setForm({ ...form, due_date: d })}
                  />
                </div>
              </div>

              {/* Line items */}
              <div>
                <label className="block text-[#aaa] font-semibold mb-2">Service Line Items</label>
                {items.map((item, idx) => (
                  <div key={idx} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-3 space-y-2">
                    <div>
                      <label className="block text-[#888] mb-0.5">Service Description</label>
                      <input
                        type="text"
                        value={item.service_description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => prev.map((i, iIdx) => iIdx === idx ? { ...i, service_description: val } : i));
                        }}
                        className={inputCls()}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[#888] mb-0.5">SAC Code</label>
                        <input
                          type="text"
                          value={item.sac_code}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) => prev.map((i, iIdx) => iIdx === idx ? { ...i, sac_code: val } : i));
                          }}
                          className={inputCls()}
                        />
                      </div>
                      <div>
                        <label className="block text-[#888] mb-0.5">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setItems((prev) => prev.map((i, iIdx) => iIdx === idx ? { ...i, quantity: val } : i));
                          }}
                          className={inputCls()}
                        />
                      </div>
                      <div>
                        <label className="block text-[#888] mb-0.5">Rate / Unit (₹)</label>
                        <input
                          type="number"
                          placeholder="e.g. 250.00"
                          value={item.rate || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setItems((prev) => prev.map((i, iIdx) => iIdx === idx ? { ...i, rate: val } : i));
                          }}
                          className={inputCls()}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#222] flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-[#222] hover:bg-[#2a2a2a] text-[#aaa] font-bold py-3 rounded-xl border-none cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold py-3 rounded-xl border-none cursor-pointer text-xs disabled:opacity-60"
              >
                {creating ? 'Saving...' : 'Record Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesList;

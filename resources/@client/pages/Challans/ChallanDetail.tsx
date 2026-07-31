import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Truck,
  ArrowLeft,
  Download,
  CheckCircle2,
  Printer,
  Building2,
  Calendar,
  FileText
} from 'lucide-react';

export const ChallanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [acknowledged, setAcknowledged] = useState(false);

  const challanData = {
    challan_number: `DC-2026-042`,
    date: '2026-07-28',
    job_order_number: 'JO-2026-001',
    type: 'OUTWARD DELIVERY CHALLAN',
    transport_mode: 'Tempo Transport',
    vehicle_number: 'TN 37 AB 1234',
    sender: {
      company: 'TechFab Precision Components',
      address: 'Plot 42, SIDCO Industrial Estate, Coimbatore, TN 641021',
      gstin: '33AAAAA0000A1Z5',
      phone: '+91 98765 43210',
    },
    consignee: {
      company: 'Apex Precision Engineering',
      address: '14/B, Cross Cut Road, Peelamedu, Coimbatore, TN 641004',
      gstin: '33BBBBB1111B2Z6',
      contact: 'Mr. Ramesh (Plant Mgr)',
    },
    items: [
      { sl: 1, part_no: 'P-10492', description: 'CNC Turned Shaft Pins Ø25 x 150mm', qty: 500, unit: 'Nos', weight: '125 kg' },
      { sl: 2, part_no: 'P-10493', description: 'Matching Bush Connectors Brass', qty: 500, unit: 'Nos', weight: '45 kg' },
      { sl: 3, part_no: 'T-8812', description: 'Special Fixture Jig Plate (Returnable)', qty: 2, unit: 'Sets', weight: '18 kg' },
    ],
    total_qty: 1002,
    total_weight: '188 kg',
  };

  const handlePrint = () => {
    window.print();
  };

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
          {!acknowledged ? (
            <button
              onClick={() => setAcknowledged(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2 rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 size={16} /> Acknowledge Receipt
            </button>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1">
              <CheckCircle2 size={14} /> Receipt Acknowledged
            </span>
          )}

          <button
            onClick={handlePrint}
            className="bg-[#222] hover:bg-[#2e2e2e] text-white font-bold text-xs px-4 py-2 rounded-xl border border-[#333] cursor-pointer flex items-center gap-1.5"
          >
            <Printer size={16} /> Print / Download PDF
          </button>
        </div>
      </div>

      {/* Formal Challan Document Paper Card */}
      <div className="bg-white text-black rounded-2xl p-8 shadow-2xl border border-gray-200 font-sans print:p-0 print:border-none">
        {/* Header Header */}
        <div className="flex justify-between items-start border-b border-gray-300 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📋</span>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">{challanData.sender.company}</h2>
            </div>
            <p className="text-xs text-gray-600 max-w-sm">{challanData.sender.address}</p>
            <p className="text-xs text-gray-600 mt-1">
              <strong>GSTIN:</strong> {challanData.sender.gstin} | <strong>Ph:</strong> {challanData.sender.phone}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block bg-amber-500 text-black font-black text-xs px-3 py-1 rounded uppercase tracking-wider mb-2">
              {challanData.type}
            </span>
            <h3 className="text-lg font-mono font-bold text-gray-900">{challanData.challan_number}</h3>
            <p className="text-xs text-gray-600 font-mono">Date: {challanData.date}</p>
            <p className="text-xs text-gray-600 font-mono">JO Ref: {challanData.job_order_number}</p>
          </div>
        </div>

        {/* Consignee & Transport Meta */}
        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 text-xs">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Consignee / Deliver To:</span>
            <p className="font-bold text-gray-900 text-sm">{challanData.consignee.company}</p>
            <p className="text-gray-600">{challanData.consignee.address}</p>
            <p className="text-gray-600 mt-1">
              <strong>GSTIN:</strong> {challanData.consignee.gstin}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Dispatch Meta:</span>
            <p>
              <strong className="text-gray-700">Mode of Transport:</strong> {challanData.transport_mode}
            </p>
            <p>
              <strong className="text-gray-700">Vehicle Registration #:</strong> {challanData.vehicle_number}
            </p>
            <p>
              <strong className="text-gray-700">Purpose:</strong> Subcontract Job Work / Processing
            </p>
          </div>
        </div>

        {/* Item Table */}
        <div className="overflow-hidden border border-gray-300 rounded-xl mb-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3 w-12 text-center">Sl #</th>
                <th className="py-2.5 px-3">Part Code</th>
                <th className="py-2.5 px-3">Material Description & Specification</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-center">Unit</th>
                <th className="py-2.5 px-3 text-right">Gross Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {challanData.items.map((item) => (
                <tr key={item.sl} className="text-gray-800">
                  <td className="py-3 px-3 text-center font-mono text-gray-500">{item.sl}</td>
                  <td className="py-3 px-3 font-mono font-bold text-gray-900">{item.part_no}</td>
                  <td className="py-3 px-3 font-medium">{item.description}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">{item.qty}</td>
                  <td className="py-3 px-3 text-center font-semibold">{item.unit}</td>
                  <td className="py-3 px-3 text-right font-mono text-gray-600">{item.weight}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold text-gray-900 border-t border-gray-300">
                <td colSpan={3} className="py-3 px-3 text-right uppercase">
                  Total Dispatched Material:
                </td>
                <td className="py-3 px-3 text-right font-mono font-extrabold text-sm">{challanData.total_qty}</td>
                <td className="py-3 px-3 text-center">Pcs</td>
                <td className="py-3 px-3 text-right font-mono">{challanData.total_weight}</td>
              </tr>
            </tfoot>
          </table>
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
              <p className="font-bold text-gray-900">For {challanData.sender.company}</p>
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

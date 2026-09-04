import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, ArrowLeft, Phone, Mail, MapPin, FileText, CheckCircle2, Award } from 'lucide-react';

export const VendorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const vendor = {
    id: id || '1',
    name: 'Apex Precision Engineering',
    contact_person: 'Mr. Ramesh Kumar (Operations Head)',
    phone: '+91 98401 23456',
    email: 'ops@apexprecision.in',
    city: 'Coimbatore, Tamil Nadu',
    address: '14/B, Cross Cut Road, Peelamedu, Coimbatore - 641004',
    gstin: '33BBBBB1111B2Z6',
    capabilities: ['CNC Turning', 'VMC Milling', 'Precision Grinding', 'Wire EDM'],
    rating: '4.8 / 5.0 (Preferred Partner)',
    total_orders_completed: 48,
    active_orders: [
      { id: 1, order_no: 'JO-2026-001', item: 'CNC Turned Shaft Pins M12', qty: 500, status: 'In Production' },
      { id: 4, order_no: 'JO-2026-004', item: 'Flange Coupling Machining', qty: 80, status: 'In Production' },
    ],
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        to="/vendors"
        className="inline-flex items-center gap-2 text-xs font-bold text-[#888] hover:text-white no-underline transition-colors"
      >
        <ArrowLeft size={16} /> Back to Vendors Directory
      </Link>

      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623] font-black text-2xl flex items-center justify-center">
            {vendor.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{vendor.name}</h1>
            <p className="text-xs text-[#888] flex items-center gap-2 mt-0.5">
              <MapPin size={14} className="text-amber-400" />
              <span>{vendor.city}</span>
              <span className="text-[#555]">|</span>
              <span className="text-emerald-400 font-semibold">{vendor.rating}</span>
            </p>
          </div>
        </div>

        <Link
          to={`/job-orders?action=new`}
          className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl no-underline"
        >
          Assign New Job Order
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 size={18} className="text-amber-400" />
            Vendor Profile &amp; Contact
          </h3>

          <div className="space-y-3 text-xs divide-y divide-[#222]">
            <div className="pt-2">
              <span className="text-[#888] block mb-1">Contact Representative:</span>
              <span className="font-semibold text-white">{vendor.contact_person}</span>
            </div>
            <div className="pt-2">
              <span className="text-[#888] block mb-1">Phone Number:</span>
              <a href={`tel:${vendor.phone}`} className="text-amber-400 font-semibold no-underline hover:underline">
                {vendor.phone}
              </a>
            </div>
            <div className="pt-2">
              <span className="text-[#888] block mb-1">Email:</span>
              <a href={`mailto:${vendor.email}`} className="text-blue-400 no-underline hover:underline">
                {vendor.email}
              </a>
            </div>
            <div className="pt-2">
              <span className="text-[#888] block mb-1">GSTIN Number:</span>
              <span className="font-mono text-gray-300">{vendor.gstin}</span>
            </div>
            <div className="pt-2">
              <span className="text-[#888] block mb-1">Factory Address:</span>
              <span className="text-gray-300 leading-relaxed">{vendor.address}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-400" />
              Active Job Orders with Vendor
            </h3>

            <div className="space-y-3">
              {vendor.active_orders.map((jo) => (
                <div key={jo.id} className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-amber-400 text-sm block">{jo.order_no}</span>
                    <span className="text-white font-semibold mt-0.5 block">{jo.item}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white block">{jo.qty} Pcs</span>
                    <span className="bg-amber-500/15 text-amber-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                      {jo.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-3">Process Capabilities</h3>
            <div className="flex flex-wrap gap-2">
              {vendor.capabilities.map((cap, idx) => (
                <span key={idx} className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-200 text-xs px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#f5a623]" />
                  <span>{cap}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetail;

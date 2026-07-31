import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Truck,
  MessageSquare,
  Paperclip,
  Send,
  AlertTriangle
} from 'lucide-react';

export const JobOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'cancelled'>('in_progress');
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState([
    { id: 1, author: 'Senthil Kumar (Production Lead)', text: 'Raw material 42CrMo4 dispatched via DC-2026-042.', date: '2026-07-25 10:30 AM' },
    { id: 2, author: 'Vendor (Apex Precision)', text: 'Rough turning completed. Moving to heat treatment stage.', date: '2026-07-27 04:15 PM' },
  ]);

  const orderData = {
    id: id || '1',
    job_order_number: `JO-2026-00${id || '1'}`,
    vendor_name: 'Apex Precision Engineering',
    vendor_contact: '+91 98401 23456 | ops@apexprecision.in',
    item_name: 'CNC Turned Shaft Pins M12 x 150mm',
    process_type: 'CNC Turning & Precision Grinding',
    raw_material: 'EN8 D-Bar Stock Ø25mm',
    quantity: 500,
    completed_qty: 350,
    rejected_qty: 12,
    dispatch_date: '2026-07-25',
    expected_delivery: '2026-08-05',
    status: status,
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setNotes([
      ...notes,
      {
        id: Date.now(),
        author: 'You (Web Portal)',
        text: newNote.trim(),
        date: new Date().toLocaleString(),
      },
    ]);
    setNewNote('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <Link
        to="/job-orders"
        className="inline-flex items-center gap-2 text-xs font-bold text-[#888] hover:text-white no-underline transition-colors"
      >
        <ArrowLeft size={16} /> Back to Job Orders
      </Link>

      {/* Header Info Banner */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-black text-white font-mono">{orderData.job_order_number}</h1>
            <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-3 py-1 rounded-full font-bold uppercase">
              {orderData.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-[#888] flex items-center gap-2">
            <Building2 size={14} className="text-amber-400" />
            <span className="font-semibold text-gray-200">{orderData.vendor_name}</span>
            <span className="text-[#555]">|</span>
            <span>{orderData.vendor_contact}</span>
          </p>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex items-center gap-2">
          {status !== 'completed' && (
            <button
              onClick={() => setStatus('completed')}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 size={16} /> Mark Completed
            </button>
          )}
          {status === 'pending' && (
            <button
              onClick={() => setStatus('in_progress')}
              className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5"
            >
              Start Production
            </button>
          )}
        </div>
      </div>

      {/* Progress Timeline Tracker */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#888] mb-4">Production Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl text-center">
            <span className="text-[11px] text-[#888] font-medium block">Total Ordered</span>
            <span className="text-xl font-extrabold text-white font-mono mt-1 block">{orderData.quantity} Pcs</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
            <span className="text-[11px] text-emerald-400 font-medium block">Received Good</span>
            <span className="text-xl font-extrabold text-emerald-300 font-mono mt-1 block">{orderData.completed_qty} Pcs</span>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center">
            <span className="text-[11px] text-rose-400 font-medium block">Quality Rejected</span>
            <span className="text-xl font-extrabold text-rose-300 font-mono mt-1 block">{orderData.rejected_qty} Pcs</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center">
            <span className="text-[11px] text-amber-400 font-medium block">Balance Pending</span>
            <span className="text-xl font-extrabold text-amber-300 font-mono mt-1 block">
              {orderData.quantity - orderData.completed_qty - orderData.rejected_qty} Pcs
            </span>
          </div>
        </div>
      </div>

      {/* Specifications & Notes Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Specifications Card */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText size={18} className="text-amber-400" />
            Job Order Specifications
          </h3>
          <div className="divide-y divide-[#222] text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888]">Item Description</span>
              <span className="font-semibold text-white text-right">{orderData.item_name}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888]">Manufacturing Process</span>
              <span className="font-semibold text-white">{orderData.process_type}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888]">Raw Material Grade</span>
              <span className="font-semibold text-white">{orderData.raw_material}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888]">Dispatch Date</span>
              <span className="font-mono text-gray-300">{orderData.dispatch_date}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#888]">Expected Delivery</span>
              <span className="font-mono text-amber-400 font-bold">{orderData.expected_delivery}</span>
            </div>
          </div>
        </div>

        {/* Notes & Updates Feed */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-blue-400" />
              Audit Notes & Log
            </h3>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {notes.map((note) => (
                <div key={note.id} className="bg-[#1a1a1a] border border-[#2a2a2a] p-3 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-[#777]">
                    <span className="font-bold text-amber-400">{note.author}</span>
                    <span>{note.date}</span>
                  </div>
                  <p className="text-gray-200">{note.text}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddNote} className="flex gap-2 pt-2 border-t border-[#222]">
            <input
              type="text"
              placeholder="Add progress note or update..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs px-3.5 py-2 text-white focus:outline-none focus:border-[#f5a623]"
            />
            <button
              type="submit"
              className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold p-2.5 rounded-xl border-none cursor-pointer flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JobOrderDetail;

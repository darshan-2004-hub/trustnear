import React from 'react';
import { 
  Printer, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  IndianRupee, 
  FileText 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const InvoiceModal = ({ booking, onClose }) => {
  const { user } = useAuth();

  if (!booking) return null;

  const invoiceNumber = `TN-INV-${String(booking.id).padStart(5, '0')}`;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const customerName = booking.counterpart?.role === 'customer' 
    ? booking.counterpart.full_name 
    : booking.customer_name || user?.full_name || 'Customer';

  const providerName = booking.counterpart?.role === 'provider'
    ? booking.counterpart.full_name
    : booking.provider_name || 'Verified Service Provider';

  const agreedPrice = parseFloat(booking.agreed_price) || 350;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      {/* Print-specific CSS styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-card, #printable-invoice-card * {
            visibility: visible;
          }
          #printable-invoice-card {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
            color: #0f172a !important;
            padding: 32px;
            margin: 0;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div 
        className="theme-card max-w-2xl w-full p-6 sm:p-8 relative shadow-2xl animate-in fade-in zoom-in-95 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden on actual print) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#363d66] no-print">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#2dd4bf]" />
            <h3 className="font-bold text-white text-base">Service Receipt & Proof of Work</h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="btn-primary px-4 py-2 text-xs font-bold flex items-center space-x-1.5 shadow-lg cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#a9b0d0] hover:text-white rounded-xl hover:bg-[#363d66] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE RECEIPT BODY */}
        <div 
          id="printable-invoice-card" 
          className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6"
        >
          {/* Header & Logo */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-xl font-black tracking-tight text-slate-900">
                  Trust<span className="text-indigo-600">Near</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Autonomous Smart Local Discovery & Recommendation Platform
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tax Invoice & Receipt</span>
              <p className="text-base font-extrabold text-slate-900">{invoiceNumber}</p>
              <p className="text-xs text-slate-500">Date Issued: {currentDate}</p>
            </div>
          </div>

          {/* Customer & Provider Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            {/* Bill To */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Details (Billed To)</span>
              <p className="font-bold text-slate-900 text-sm">{customerName}</p>
              <p className="text-slate-600 flex items-start space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{booking.customer_address || booking.service_address || 'Mangaluru Central, Karnataka'}</span>
              </p>
            </div>

            {/* Service Performed By */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service Provider (Contractor)</span>
              <p className="font-bold text-slate-900 text-sm">{providerName}</p>
              <p className="text-indigo-600 font-semibold">{booking.service_category} Specialist</p>
              <p className="text-slate-500 text-[11px]">KYC Background Checked & Verified</p>
            </div>
          </div>

          {/* Service Details Table */}
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Service Description</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Service Status</th>
                  <th className="py-3 px-4 text-right">Agreed Rate (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {booking.service_title}
                    <span className="block text-[11px] text-slate-500 font-normal">{booking.service_category} Service</span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {booking.booking_date} at {booking.booking_time}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ✓ Completed & Confirmed
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    ₹{agreedPrice.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pricing Calculation Summary */}
          <div className="flex justify-end text-xs">
            <div className="w-full sm:w-64 space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>₹{agreedPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Platform Discovery Fee:</span>
                <span className="text-emerald-600 font-bold">₹0.00 (Free)</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Taxes & GST:</span>
                <span>Included</span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between font-black text-slate-900 text-base">
                <span>Total Amount:</span>
                <span className="text-indigo-600">₹{agreedPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Security & Academic Verification Stamp */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 gap-2">
            <div>
              <p className="font-semibold text-slate-600">Authentic Digital Verification Record</p>
              <p>St Agnes College Autonomous MCA Final Year Project. Decoupled Architecture.</p>
            </div>
            <div className="flex items-center space-x-1 text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Status: Settled & Signed</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
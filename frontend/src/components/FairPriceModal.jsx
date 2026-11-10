import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calculator, X, IndianRupee } from 'lucide-react';

const CATEGORIES = ['Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Appliance Repair', 'Painting'];

const FairPriceModal = ({ onClose, initialCategory = 'Plumbing' }) => {
  const [category, setCategory] = useState(initialCategory);
  const [durationHours, setDurationHours] = useState(1.5);
  const [isEmergency, setIsEmergency] = useState(false);
  const [estimation, setEstimation] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculatePrice = async () => {
    setLoading(true);
    try {
      const res = await api.post('/providers/estimate-price', {
        category,
        duration_hours: Number(durationHours),
        is_emergency: isEmergency,
      });
      if (res.data?.success) {
        setEstimation(res.data.estimation);
      }
    } catch (err) {
      console.warn('Fair price calculation fallback:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculatePrice();
  }, [category, durationHours, isEmergency]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl border border-[#e2e8f0] max-w-md w-full p-6 relative shadow-xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#475569] hover:text-[#172033] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#172033] text-base">Fair Price Estimator</h3>
            <p className="text-xs text-[#475569]">Machine Learning Regression for Fair Rates</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Category */}
          <div>
            <label className="block text-[#475569] font-semibold mb-1">Service Trade Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[#172033] outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Duration Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[#475569] font-semibold">Estimated Job Duration</label>
              <span className="font-bold text-[#172033] text-xs">{durationHours} Hours</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="6.0"
              step="0.5"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#475569] mt-1 font-medium">
              <span>30 Mins</span>
              <span>3 Hours</span>
              <span>6+ Hours</span>
            </div>
          </div>

          {/* Emergency Checkbox */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-[#e2e8f0] flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#172033]">Emergency / Immediate Dispatch</p>
              <p className="text-[10px] text-[#475569]">Within 30 minutes arrival surcharge</p>
            </div>
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="w-4 h-4 rounded border-[#cbd5e1] accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Result Card */}
          {estimation ? (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center space-y-1">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Fair Market Estimate Range
              </span>
              <p className="text-3xl font-black text-[#172033] flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-blue-600" />
                {estimation.fair_range_min} - ₹{estimation.fair_range_max}
              </p>
              <p className="text-[11px] text-[#475569]">
                Estimated Median: ₹{estimation.estimated_price}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] text-center text-xs text-[#475569]">
              Calculating fair market regression...
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 btn-primary text-xs font-bold uppercase tracking-wider mt-2 shadow-sm"
          >
            Apply to Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default FairPriceModal;

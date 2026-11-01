import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calculator, X, Sparkles, AlertCircle, IndianRupee, ShieldCheck } from 'lucide-react';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="theme-card max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#a9b0d0] hover:text-white p-1 rounded-lg hover:bg-[#363d66]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#6d5dfc] to-[#d946ef] p-0.5">
            <div className="w-full h-full bg-[#1c2036] rounded-[10px] flex items-center justify-center text-[#2dd4bf]">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Fair Price Estimator</h3>
            <p className="text-xs text-[#a9b0d0]">Machine Learning Regression for Fair Rates</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Category */}
          <div>
            <label className="block text-[#a9b0d0] font-semibold mb-1">Service Trade Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#1c2036] border border-[#363d66] rounded-xl px-3 py-2.5 text-white outline-none focus:border-[#6d5dfc]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Duration Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[#a9b0d0] font-semibold">Estimated Job Duration</label>
              <span className="font-bold text-white text-xs">{durationHours} Hours</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="6.0"
              step="0.5"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className="w-full accent-[#6d5dfc] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#a9b0d0] mt-1">
              <span>30 Mins</span>
              <span>3 Hours</span>
              <span>6+ Hours</span>
            </div>
          </div>

          {/* Emergency Checkbox */}
          <div className="p-3 rounded-xl bg-[#1c2036] border border-[#363d66] flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Emergency / Immediate Dispatch</p>
              <p className="text-[10px] text-[#a9b0d0]">Within 30 minutes arrival surcharge</p>
            </div>
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="w-4 h-4 rounded border-[#363d66] accent-[#d946ef] cursor-pointer"
            />
          </div>

          {/* Result Card */}
          {estimation ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#262b47] to-[#1c2036] border border-[#2dd4bf]/40 text-center space-y-1">
              <span className="text-[11px] font-bold text-[#2dd4bf] uppercase tracking-wider">
                Fair Market Estimate Range
              </span>
              <p className="text-3xl font-black text-white flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-[#2dd4bf]" />
                {estimation.fair_range_min} - ₹{estimation.fair_range_max}
              </p>
              <p className="text-[11px] text-[#a9b0d0]">
                Estimated Median: ₹{estimation.estimated_price}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#1c2036] text-center text-xs text-[#a9b0d0]">
              Calculating fair market regression...
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 btn-primary text-xs font-bold uppercase tracking-wider mt-2"
          >
            Apply to Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default FairPriceModal;
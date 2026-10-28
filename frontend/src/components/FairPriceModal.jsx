import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calculator, X, IndianRupee, Clock, AlertCircle, Sparkles, CheckCircle2, Zap } from 'lucide-react';

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Home Cleaning',
  'Carpentry',
];

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
      if (res.data.success) {
        setEstimation(res.data.estimation);
      }
    } catch (err) {
      console.error('Failed to calculate fair price:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculatePrice();
  }, [category, durationHours, isEmergency]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Fair Market Price Estimator
              </h3>
              <p className="text-xs text-slate-500">
                Powered by our Scikit-learn Historical Job Regression Model
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input Controls */}
        <div className="space-y-4 my-5">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Service Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Slider */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 uppercase">Estimated Job Duration</span>
              <span className="font-bold text-brand-600">{durationHours} Hours</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className="w-full accent-brand-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>30 Mins (Minor fix)</span>
              <span>2.5 Hrs (Standard)</span>
              <span>5.0 Hrs (Major overhaul)</span>
            </div>
          </div>

          {/* Urgency Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-2">
              <Zap className={`h-4 w-4 ${isEmergency ? 'text-amber-500' : 'text-slate-400'}`} />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Emergency / Immediate Dispatch</span>
                <span className="text-[11px] text-slate-500">Requires arrival within 45 minutes</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="h-4 w-4 text-brand-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Prediction Output Box */}
        {estimation && (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Predicted Fair Market Cost
              </span>
              <span className="text-xl font-extrabold text-emerald-900">
                ₹{estimation.estimated_price}
              </span>
            </div>

            {/* Fair Range Band */}
            <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800">
              <span>Reasonable Market Range:</span>
              <span className="font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                ₹{estimation.fair_range_min} — ₹{estimation.fair_range_max}
              </span>
            </div>

            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Quotes falling within this range represent fair, unmanipulated regional labor rates for Mangaluru.
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          Close Estimator
        </button>
      </div>
    </div>
  );
};

export default FairPriceModal;
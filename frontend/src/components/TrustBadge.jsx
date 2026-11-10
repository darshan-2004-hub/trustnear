import React, { useState } from 'react';
import { ShieldCheck, Info, Sparkles, X } from 'lucide-react';

const TrustBadge = ({ score = 50, shapFactors = null, providerName = 'Verified Pro' }) => {
  const [showModal, setShowModal] = useState(false);
  const numScore = parseFloat(score) || 50;

  const getBadgeStyle = () => {
    if (numScore >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    if (numScore >= 65) return 'bg-blue-50 text-blue-700 border-blue-300';
    return 'bg-amber-50 text-amber-700 border-amber-300';
  };

  return (
    <>
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 cursor-pointer shadow-2xs ${getBadgeStyle()}`}
        title="Click to view Machine Learning SHAP Factors"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>{numScore.toFixed(1)} Trust Score</span>
        <Info className="w-3 h-3 opacity-70" />
      </button>

      {/* SHAP Explanation Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="theme-card bg-white max-w-md w-full p-6 relative shadow-2xl border border-[#e2e8f0] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-[#172033] p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#172033]">{providerName} — Trust Intelligence</h3>
                <p className="text-xs text-[#475569]">Explainable Machine Learning Insights</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-[#e2e8f0] mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#475569]">Computed Trust Rating</span>
                <span className="text-xl font-black text-blue-600">{numScore.toFixed(1)} / 100</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, numScore))}%` }}
                />
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] mb-3">Key Contributing Factors (SHAP Attribution):</h4>
            <div className="space-y-2 text-xs">
              {shapFactors && Array.isArray(shapFactors) && shapFactors.length > 0 ? (
                shapFactors.map((f, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-[#e2e8f0]">
                    <span className="text-[#172033] font-medium">{f.description || f.label || f.feature}</span>
                    <span className={`font-bold ${f.impact >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {f.impact >= 0 ? `+${f.impact}` : f.impact}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] text-center space-y-1">
                  <p className="text-[#172033] font-semibold">Baseline Trust Rating (50.0)</p>
                  <p className="text-[#475569] text-[11px]">
                    This provider is newly registered. SHAP factor attributions will dynamically compute as verified jobs and reviews are recorded.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-6 py-2.5 btn-primary text-xs font-bold uppercase tracking-wider shadow-sm"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TrustBadge;

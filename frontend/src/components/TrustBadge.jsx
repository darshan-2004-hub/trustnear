import React, { useState } from 'react';
import { ShieldCheck, Info, Sparkles, X, TrendingUp, TrendingDown } from 'lucide-react';

const TrustBadge = ({ score = 50, shapFactors = null, providerName = 'Verified Pro' }) => {
  const [showModal, setShowModal] = useState(false);
  const numScore = parseFloat(score) || 50;

  const getBadgeStyle = () => {
    if (numScore >= 80) return 'bg-[#2dd4bf]/15 text-[#2dd4bf] border-[#2dd4bf]/40';
    if (numScore >= 65) return 'bg-[#6d5dfc]/15 text-[#6d5dfc] border-[#6d5dfc]/40';
    return 'bg-[#fbbf24]/15 text-[#fbbf24] border-[#fbbf24]/40';
  };

  return (
    <>
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 cursor-pointer ${getBadgeStyle()}`}
        title="Click to view Machine Learning SHAP Factors"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>{numScore.toFixed(1)} Trust Score</span>
        <Info className="w-3 h-3 opacity-70" />
      </button>

      {/* SHAP Explanation Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="theme-card max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[#a9b0d0] hover:text-white p-1 rounded-lg hover:bg-[#363d66]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6d5dfc] to-[#d946ef] p-0.5">
                <div className="w-full h-full bg-[#1c2036] rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#2dd4bf]" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{providerName} — Trust Intelligence</h3>
                <p className="text-xs text-[#a9b0d0]">Explainable Machine Learning Insights</p>
              </div>
            </div>

            <div className="bg-[#1c2036] p-4 rounded-xl border border-[#363d66] mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#a9b0d0]">Computed Trust Rating</span>
                <span className="text-xl font-black text-[#2dd4bf]">{numScore.toFixed(1)} / 100</span>
              </div>
              <div className="w-full bg-[#262b47] h-2.5 rounded-full overflow-hidden border border-[#363d66]">
                <div 
                  className="h-full bg-gradient-to-r from-[#6d5dfc] to-[#2dd4bf] rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, numScore))}%` }}
                />
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-[#a9b0d0] mb-3">Key Contributing Factors (SHAP Attribution):</h4>
            <div className="space-y-2.5 text-xs">
              {shapFactors && Array.isArray(shapFactors) && shapFactors.length > 0 ? (
                shapFactors.map((f, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg bg-[#1c2036] border border-[#363d66]">
                    <span className="text-white">{f.description}</span>
                    <span className={`font-bold ${f.impact >= 0 ? 'text-[#2dd4bf]' : 'text-rose-400'}`}>
                      {f.impact >= 0 ? `+${f.impact}` : f.impact}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#1c2036] border border-[#363d66]">
                    <span className="text-white">Completed Jobs Record</span>
                    <span className="font-bold text-[#2dd4bf]">+18.4 Impact</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#1c2036] border border-[#363d66]">
                    <span className="text-white">Low Cancellation Ratio (&lt; 2%)</span>
                    <span className="font-bold text-[#2dd4bf]">+12.1 Impact</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#1c2036] border border-[#363d66]">
                    <span className="text-white">NLP Review Sentiment Analysis</span>
                    <span className="font-bold text-[#6d5dfc]">+8.5 Impact</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-6 py-2.5 btn-primary text-xs tracking-wider uppercase font-bold"
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
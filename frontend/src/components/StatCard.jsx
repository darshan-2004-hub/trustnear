import React from 'react';

const ACCENTS = {
  violet: 'text-[#6d5dfc] bg-[#6d5dfc]/10 border-[#6d5dfc]/30',
  pink: 'text-[#d946ef] bg-[#d946ef]/10 border-[#d946ef]/30',
  teal: 'text-[#2dd4bf] bg-[#2dd4bf]/10 border-[#2dd4bf]/30',
  amber: 'text-[#fbbf24] bg-[#fbbf24]/10 border-[#fbbf24]/30',
};

const StatCard = ({ title, value, change, icon: Icon, accent = 'violet', subtitle, onClick }) => {
  const accentClass = ACCENTS[accent] || ACCENTS.violet;

  return (
    <div 
      onClick={onClick}
      className={`theme-card p-5 relative overflow-hidden flex flex-col justify-between ${onClick ? 'cursor-pointer hover:border-[#6d5dfc] transition-all' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-extrabold text-[#a9b0d0] tracking-wider uppercase">{title}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${accentClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">{value}</p>
        <div className="flex items-center space-x-2 mt-1">
          {change && (
            <span className="text-[11px] font-bold text-[#2dd4bf] bg-[#2dd4bf]/10 px-1.5 py-0.5 rounded">
              {change}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-[#a9b0d0]">{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
import React from 'react';

const ACCENTS = {
  blue: 'text-blue-700 bg-blue-50 border-blue-200',
  violet: 'text-blue-700 bg-blue-50 border-blue-200',
  teal: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-200',
  pink: 'text-purple-700 bg-purple-50 border-purple-200',
  purple: 'text-purple-700 bg-purple-50 border-purple-200',
};

const StatCard = ({ title, value, change, icon: Icon, accent = 'blue', subtitle, onClick }) => {
  const accentClass = ACCENTS[accent] || ACCENTS.blue;

  return (
    <div 
      onClick={onClick}
      className={`theme-card bg-white p-5 relative overflow-hidden flex flex-col justify-between border border-[#e2e8f0] shadow-xs ${
        onClick ? 'cursor-pointer hover:border-blue-400 transition-all' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-extrabold text-[#475569] tracking-wider uppercase">{title}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${accentClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">{value}</p>
        <div className="flex items-center space-x-2 mt-1">
          {change && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              {change}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-[#475569]">{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;

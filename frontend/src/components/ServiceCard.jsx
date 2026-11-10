import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const ACCENT_STYLES = {
  teal: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    hover: 'group-hover:border-emerald-400',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    hover: 'group-hover:border-amber-400',
  },
  violet: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    hover: 'group-hover:border-blue-400',
  },
  pink: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    hover: 'group-hover:border-purple-400',
  },
};

const ServiceCard = ({ 
  title, 
  icon: Icon, 
  count = '12+ Pros', 
  description = 'Verified experts near your area.', 
  accent = 'violet',
  onClick 
}) => {
  const styling = ACCENT_STYLES[accent] || ACCENT_STYLES.violet;

  return (
    <div
      onClick={onClick}
      className={`theme-card theme-card-hover p-6 cursor-pointer relative group flex flex-col justify-between bg-white border border-[#e2e8f0] shadow-xs ${styling.hover}`}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl ${styling.bg} border ${styling.border} flex items-center justify-center ${styling.text} transition-transform group-hover:scale-105`}>
            {Icon && <Icon className="w-6 h-6" />}
          </div>
          <span className="text-[11px] font-bold tracking-wide text-slate-700 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
            {count}
          </span>
        </div>

        <h3 className="text-lg font-bold text-[#172033] mb-1 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-[#475569] leading-relaxed">
          {description}
        </p>
      </div>

      <div className="pt-4 mt-4 border-t border-[#e2e8f0] flex items-center justify-between text-xs font-semibold text-[#475569] group-hover:text-blue-600 transition-colors">
        <span>Browse Pros</span>
        <ArrowUpRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </div>
  );
};

export default ServiceCard;

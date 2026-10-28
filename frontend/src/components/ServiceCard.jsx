import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const ACCENT_STYLES = {
  teal: {
    bg: 'bg-[#2dd4bf]/10',
    border: 'border-[#2dd4bf]/30',
    text: 'text-[#2dd4bf]',
    hover: 'group-hover:border-[#2dd4bf]/60',
  },
  amber: {
    bg: 'bg-[#fbbf24]/10',
    border: 'border-[#fbbf24]/30',
    text: 'text-[#fbbf24]',
    hover: 'group-hover:border-[#fbbf24]/60',
  },
  violet: {
    bg: 'bg-[#6d5dfc]/10',
    border: 'border-[#6d5dfc]/30',
    text: 'text-[#6d5dfc]',
    hover: 'group-hover:border-[#6d5dfc]/60',
  },
  pink: {
    bg: 'bg-[#d946ef]/10',
    border: 'border-[#d946ef]/30',
    text: 'text-[#d946ef]',
    hover: 'group-hover:border-[#d946ef]/60',
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
      className={`theme-card theme-card-hover p-6 cursor-pointer relative group flex flex-col justify-between ${styling.hover}`}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl ${styling.bg} border ${styling.border} flex items-center justify-center ${styling.text} transition-transform group-hover:scale-110`}>
            {Icon && <Icon className="w-6 h-6" />}
          </div>
          <span className="text-[11px] font-bold tracking-wide text-[#a9b0d0] px-2.5 py-1 rounded-full bg-[#1c2036] border border-[#363d66]">
            {count}
          </span>
        </div>

        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#6d5dfc] transition-colors">
          {title}
        </h3>
        <p className="text-xs text-[#a9b0d0] leading-relaxed">
          {description}
        </p>
      </div>

      <div className="pt-4 mt-4 border-t border-[#363d66]/60 flex items-center justify-between text-xs font-semibold text-[#a9b0d0] group-hover:text-white">
        <span>Browse Pros</span>
        <ArrowUpRight className="w-4 h-4 text-[#6d5dfc] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </div>
  );
};

export default ServiceCard;
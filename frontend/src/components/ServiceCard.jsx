import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const ACCENT_STYLES = {
  emerald: {
    card: 'bg-gradient-to-br from-white/95 to-emerald-50/90 border-emerald-200 border-t-4 border-t-emerald-600 hover:border-emerald-400',
    iconBox: 'bg-emerald-100 border-emerald-200 text-emerald-700',
    pill: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    footer: 'border-emerald-200/70 text-emerald-700',
    titleHover: 'group-hover:text-emerald-700',
  },
  lime: {
    card: 'bg-gradient-to-br from-white/95 to-lime-50/90 border-lime-200 border-t-4 border-t-lime-600 hover:border-lime-400',
    iconBox: 'bg-lime-100 border-lime-200 text-lime-700',
    pill: 'bg-lime-50 border-lime-200 text-lime-800',
    footer: 'border-lime-200/70 text-lime-700',
    titleHover: 'group-hover:text-lime-700',
  },
  sky: {
    card: 'bg-gradient-to-br from-white/95 to-sky-50/90 border-sky-200 border-t-4 border-t-sky-600 hover:border-sky-400',
    iconBox: 'bg-sky-100 border-sky-200 text-sky-700',
    pill: 'bg-sky-50 border-sky-200 text-sky-800',
    footer: 'border-sky-200/70 text-sky-700',
    titleHover: 'group-hover:text-sky-700',
  },
  cyan: {
    card: 'bg-gradient-to-br from-white/95 to-cyan-50/90 border-cyan-200 border-t-4 border-t-cyan-600 hover:border-cyan-400',
    iconBox: 'bg-cyan-100 border-cyan-200 text-cyan-700',
    pill: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    footer: 'border-cyan-200/70 text-cyan-700',
    titleHover: 'group-hover:text-cyan-700',
  },
  amber: {
    card: 'bg-gradient-to-br from-white/95 to-amber-50/90 border-amber-200 border-t-4 border-t-amber-500 hover:border-amber-400',
    iconBox: 'bg-amber-100 border-amber-200 text-amber-700',
    pill: 'bg-amber-50 border-amber-200 text-amber-800',
    footer: 'border-amber-200/70 text-amber-700',
    titleHover: 'group-hover:text-amber-700',
  },
  teal: {
    card: 'bg-gradient-to-br from-white/95 to-teal-50/90 border-teal-200 border-t-4 border-t-teal-600 hover:border-teal-400',
    iconBox: 'bg-teal-100 border-teal-200 text-teal-700',
    pill: 'bg-teal-50 border-teal-200 text-teal-800',
    footer: 'border-teal-200/70 text-teal-700',
    titleHover: 'group-hover:text-teal-700',
  },
};

// Keep backwards compatibility for older accent aliases
ACCENT_STYLES.violet = ACCENT_STYLES.sky;
ACCENT_STYLES.pink = ACCENT_STYLES.cyan;

const ServiceCard = ({ 
  title, 
  icon: Icon, 
  count = '12+ Pros', 
  description = 'Verified experts near your area.', 
  accent = 'emerald',
  onClick 
}) => {
  const styling = ACCENT_STYLES[accent] || ACCENT_STYLES.emerald;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl backdrop-blur-md p-6 cursor-pointer relative group flex flex-col justify-between border shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-200 ${styling.card}`}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-105 ${styling.iconBox}`}>
            {Icon && <Icon className="w-6 h-6" />}
          </div>
          <span className={`text-[11px] font-bold tracking-wide px-2.5 py-0.5 rounded-full border ${styling.pill}`}>
            {count}
          </span>
        </div>

        <h3 className={`text-lg font-bold text-[#172033] mb-1 transition-colors ${styling.titleHover}`}>
          {title}
        </h3>
        <p className="text-xs text-[#475569] leading-relaxed">
          {description}
        </p>
      </div>

      <div className={`pt-4 mt-4 border-t flex items-center justify-between text-xs font-bold transition-colors ${styling.footer}`}>
        <span>Browse Pros</span>
        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </div>
  );
};

export default ServiceCard;

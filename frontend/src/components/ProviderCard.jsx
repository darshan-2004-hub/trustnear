import React from 'react';
import { Star, MapPin, CheckCircle2, IndianRupee, MessageSquare, Calendar } from 'lucide-react';
import TrustBadge from './TrustBadge';

const ProviderCard = ({ provider, onBook, onViewReviews }) => {
  const name = provider.full_name || provider.name || 'Verified Pro';
  const category = provider.service_category || provider.category || 'General Service';
  const rating = provider.rating || 4.9;
  const reviewsCount = provider.completed_jobs || provider.reviews_count || 24;
  const hourlyRate = provider.hourly_rate || 350;
  const address = provider.service_address || 'Mangaluru Central';
  const trustScore = provider.trust_score || provider.trust_metrics?.trust_score || 88;

  return (
    <div className="theme-card theme-card-hover p-6 flex flex-col justify-between">
      <div>
        {/* Header: Avatar, Name & Trust Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#6d5dfc] via-[#d946ef] to-[#2dd4bf]">
              <div className="w-full h-full rounded-full bg-[#1c2036] flex items-center justify-center text-lg font-black text-white">
                {name.charAt(0)}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h4 className="text-base font-bold text-white">{name}</h4>
                <CheckCircle2 className="w-4 h-4 text-[#2dd4bf]" />
              </div>
              <span className="text-[11px] font-semibold text-[#6d5dfc] bg-[#6d5dfc]/10 px-2 py-0.5 rounded-full border border-[#6d5dfc]/20">
                {category}
              </span>
            </div>
          </div>

          {/* Interactive Trust Badge (SHAP factor modal) */}
          <TrustBadge score={trustScore} providerName={name} shapFactors={provider.shap_factors} />
        </div>

        {/* Rating & Location */}
        <div className="grid grid-cols-2 gap-2 my-4 p-3 rounded-xl bg-[#1c2036]/70 border border-[#363d66]/60 text-xs">
          <button
            onClick={() => onViewReviews && onViewReviews(provider)}
            className="flex items-center space-x-1.5 text-[#fbbf24] hover:opacity-80 transition-opacity text-left cursor-pointer"
            title="Click to view verified customer reviews"
          >
            <Star className="w-4 h-4 fill-[#fbbf24]" />
            <span className="font-bold text-white">{rating}</span>
            <span className="text-[#a9b0d0]">({reviewsCount} jobs)</span>
          </button>

          <div className="flex items-center space-x-1 text-[#a9b0d0] truncate">
            <MapPin className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0" />
            <span className="truncate">{address}</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline space-x-1 mb-5">
          <span className="text-xs text-[#a9b0d0]">Standard Rate:</span>
          <span className="text-lg font-black text-white flex items-center">
            <IndianRupee className="w-4 h-4 text-[#2dd4bf]" />
            {hourlyRate}
          </span>
          <span className="text-xs text-[#a9b0d0]">/ hr</span>
        </div>
      </div>

      {/* Action Buttons: Reviews & Book */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          onClick={() => onViewReviews && onViewReviews(provider)}
          className="btn-secondary py-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#6d5dfc]" />
          <span>Reviews</span>
        </button>

        <button
          onClick={() => onBook && onBook(provider)}
          className="btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Book Now</span>
        </button>
      </div>
    </div>
  );
};

export default ProviderCard;
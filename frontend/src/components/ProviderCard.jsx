import React from 'react';
import { Star, MapPin, CheckCircle2, IndianRupee, MessageSquare, Calendar } from 'lucide-react';
import TrustBadge from './TrustBadge';

const ProviderCard = ({ provider, onBook, onViewReviews }) => {
  const name = provider.full_name || provider.name || 'Verified Pro';
  const category = provider.service_category || provider.category || 'General Service';
  const hasRating = provider.rating !== null && provider.rating !== undefined && Number(provider.rating) > 0;
  const rating = hasRating ? Number(provider.rating).toFixed(1) : null;
  const reviewsCount = provider.reviews_count ?? provider.completed_jobs ?? 0;
  const hourlyRate = provider.hourly_rate ? Number(provider.hourly_rate).toFixed(0) : null;
  const address = provider.service_address || 'Mangaluru';
  const trustScore = provider.trust_score ?? provider.trust_metrics?.trust_score ?? 50.0;
  const matchVal = provider.match_percentage ?? (provider.match_score ? Math.round(provider.match_score * 100) : null);

  return (
    <div className="theme-card theme-card-hover p-6 flex flex-col justify-between">
      <div>
        {/* Header: Avatar, Name & Actions (Match Score + Trust Badge) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#6d5dfc] via-[#d946ef] to-[#2dd4bf] shrink-0">
              <div className="w-full h-full rounded-full bg-[#1c2036] flex items-center justify-center text-lg font-black text-white">
                {name.charAt(0)}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h4 className="text-base font-bold text-white">{name}</h4>
                <CheckCircle2 className="w-4 h-4 text-[#2dd4bf] shrink-0" />
              </div>
              <span className="text-[11px] font-semibold text-[#6d5dfc] bg-[#6d5dfc]/10 px-2 py-0.5 rounded-full border border-[#6d5dfc]/20">
                {category}
              </span>
            </div>
          </div>

          {/* Header Right: Match Pill + Trust Badge (Natural Flex Row, No Overlap) */}
          <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
            {matchVal !== null && matchVal !== undefined && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#2dd4bf]/15 text-[#2dd4bf] text-xs font-bold border border-[#2dd4bf]/30 shadow-xs whitespace-nowrap">
                <span>✨</span>
                <span>{matchVal}% Match</span>
              </span>
            )}
            <TrustBadge score={trustScore} providerName={name} shapFactors={provider.shap_factors} />
          </div>
        </div>

        {/* Rating & Location */}
        <div className="grid grid-cols-2 gap-2 my-4 p-3 rounded-xl bg-[#1c2036]/70 border border-[#363d66]/60 text-xs">
          <button
            onClick={() => onViewReviews && onViewReviews(provider)}
            className="flex items-center space-x-1.5 text-[#fbbf24] hover:opacity-80 transition-opacity text-left cursor-pointer"
            title="Click to view verified customer reviews"
          >
            {hasRating ? (
              <>
                <Star className="w-4 h-4 fill-[#fbbf24]" />
                <span className="font-bold text-white">{rating}</span>
                <span className="text-[#a9b0d0]">({reviewsCount} reviews)</span>
              </>
            ) : (
              <span className="text-xs font-semibold text-[#a9b0d0]">
                {reviewsCount > 0 ? `${reviewsCount} verified jobs` : 'New Provider'}
              </span>
            )}
          </button>

          <div className="flex items-center space-x-1 text-[#a9b0d0] truncate">
            <MapPin className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0" />
            <span className="truncate">{address}</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline space-x-1 mb-5">
          <span className="text-xs text-[#a9b0d0]">Standard Rate:</span>
          {hourlyRate ? (
            <>
              <span className="text-lg font-black text-white flex items-center">
                <IndianRupee className="w-4 h-4 text-[#2dd4bf]" />
                {hourlyRate}
              </span>
              <span className="text-xs text-[#a9b0d0]">/ hr</span>
            </>
          ) : (
            <span className="text-xs font-semibold text-[#a9b0d0]">Contact for quote</span>
          )}
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

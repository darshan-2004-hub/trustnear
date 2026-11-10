import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, CheckCircle2, IndianRupee, MessageSquare, Calendar, ExternalLink, Sparkles } from 'lucide-react';
import TrustBadge from './TrustBadge';

const ProviderCard = ({ provider, onBook, onViewReviews }) => {
  const providerId = provider.user_id || provider.id;
  const name = provider.full_name || provider.name || 'Verified Pro';
  const category = provider.service_category || provider.category || 'General Service';
  const hasRating = provider.rating !== null && provider.rating !== undefined && Number(provider.rating) > 0;
  const rating = hasRating ? Number(provider.rating).toFixed(1) : null;
  const reviewsCount = provider.reviews_count ?? provider.completed_jobs ?? 0;
  const hourlyRate = provider.hourly_rate ? Number(provider.hourly_rate).toFixed(0) : null;
  const address = provider.service_address || 'Mangaluru';
  const trustScore = provider.trust_score ?? provider.trust_metrics?.trust_score ?? null;
  const matchVal = provider.match_percentage ?? (provider.match_score ? Math.round(provider.match_score * 100) : null);
  const distance = provider.distance_km ?? provider.distance ?? null;
  const aiReason = provider.recommendation_reason || provider.ai_reason || null;
  const estimatedPrice = provider.estimated_price ?? provider.predicted_price ?? null;

  return (
    <div className="theme-card theme-card-hover p-6 flex flex-col justify-between">
      <div>
        {/* Header: Avatar, Name & Actions (Match Score + Trust Badge) */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <Link to={`/provider/${providerId}`} className="flex items-center space-x-3 group">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#6d5dfc] via-[#d946ef] to-[#2dd4bf] shrink-0">
              <div className="w-full h-full rounded-full bg-[#1c2036] flex items-center justify-center text-lg font-black text-white group-hover:text-[#2dd4bf] transition-colors">
                {name.charAt(0)}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h4 className="text-base font-bold text-white group-hover:text-[#2dd4bf] transition-colors">{name}</h4>
                <CheckCircle2 className="w-4 h-4 text-[#2dd4bf] shrink-0" />
              </div>
              <span className="text-[11px] font-semibold text-[#6d5dfc] bg-[#6d5dfc]/10 px-2 py-0.5 rounded-full border border-[#6d5dfc]/20">
                {category}
              </span>
            </div>
          </Link>

          {/* Header Right: Match Pill + Trust Badge stacked vertically */}
          <div className="flex flex-col items-end gap-1.5 self-start shrink-0">
            {matchVal !== null && matchVal !== undefined && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#2dd4bf]/15 text-[#2dd4bf] text-xs font-bold border border-[#2dd4bf]/30 whitespace-nowrap">
                <span>✨</span>
                <span>{matchVal}% Match</span>
              </span>
            )}
            {trustScore !== null ? (
              <TrustBadge score={trustScore} providerName={name} shapFactors={provider.shap_factors} />
            ) : (
              <span className="px-2 py-1 rounded-full bg-[#363d66]/50 text-[#a9b0d0] text-xs font-medium border border-[#363d66]">
                New Pro
              </span>
            )}
          </div>
        </div>

        {/* AI Recommendation Reason Banner */}
        {aiReason && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-[#6d5dfc]/10 border border-[#6d5dfc]/25 text-xs text-[#a9b0d0] flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-[#6d5dfc] shrink-0" />
            <span className="truncate"><strong className="text-white">AI Reason:</strong> {aiReason}</span>
          </div>
        )}

        {/* Rating & Location / Distance */}
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
            <span className="truncate">
              {distance !== null ? `${distance} km • ` : ''}{address}
            </span>
          </div>
        </div>

        {/* Pricing / Estimates */}
        <div className="flex items-baseline justify-between mb-5">
          <div className="flex items-baseline space-x-1">
            <span className="text-xs text-[#a9b0d0]">Rate:</span>
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

          {estimatedPrice && (
            <span className="text-xs text-[#2dd4bf] font-medium bg-[#2dd4bf]/10 px-2 py-0.5 rounded border border-[#2dd4bf]/20">
              Est. ₹{Number(estimatedPrice).toFixed(0)}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons: View Profile & Book */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Link
          to={`/provider/${providerId}`}
          className="btn-secondary py-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5 hover:border-[#6d5dfc]"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#6d5dfc]" />
          <span>View Profile</span>
        </Link>

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

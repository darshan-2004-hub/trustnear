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
    <div className="theme-card theme-card-hover p-6 flex flex-col justify-between bg-white border border-[#e2e8f0] shadow-xs">
      <div>
        {/* Header: Avatar, Name & Actions (Match Score + Trust Badge) */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <Link to={`/provider/${providerId}`} className="flex items-center space-x-3 group">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-blue-600 to-indigo-600 shrink-0 shadow-xs">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-lg font-black text-blue-600 group-hover:bg-blue-50 transition-colors">
                {name.charAt(0)}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h4 className="text-base font-bold text-[#172033] group-hover:text-blue-600 transition-colors">{name}</h4>
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              </div>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {category}
              </span>
            </div>
          </Link>

          {/* Header Right: Match Pill + Trust Badge stacked vertically */}
          <div className="flex flex-col items-end gap-1.5 self-start shrink-0">
            {matchVal !== null && matchVal !== undefined && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 whitespace-nowrap">
                <span>✨</span>
                <span>{matchVal}% Match</span>
              </span>
            )}
            {trustScore !== null ? (
              <TrustBadge score={trustScore} providerName={name} shapFactors={provider.shap_factors} />
            ) : (
              <span className="px-2 py-1 rounded-full bg-slate-100 text-[#475569] text-xs font-medium border border-slate-200">
                New Pro
              </span>
            )}
          </div>
        </div>

        {/* AI Recommendation Reason Banner */}
        {aiReason && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-[#475569] flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate"><strong className="text-[#172033]">AI Reason:</strong> {aiReason}</span>
          </div>
        )}

        {/* Rating & Location / Distance */}
        <div className="grid grid-cols-2 gap-2 my-4 p-3 rounded-xl bg-slate-50 border border-[#e2e8f0] text-xs">
          <button
            onClick={() => onViewReviews && onViewReviews(provider)}
            className="flex items-center space-x-1.5 text-amber-500 hover:opacity-80 transition-opacity text-left cursor-pointer"
            title="Click to view verified customer reviews"
          >
            {hasRating ? (
              <>
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-[#172033]">{rating}</span>
                <span className="text-[#475569]">({reviewsCount} reviews)</span>
              </>
            ) : (
              <span className="text-xs font-semibold text-[#475569]">
                {reviewsCount > 0 ? `${reviewsCount} verified jobs` : 'New Provider'}
              </span>
            )}
          </button>

          <div className="flex items-center space-x-1 text-[#475569] truncate">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate font-medium">
              {distance !== null ? `${distance} km • ` : ''}{address}
            </span>
          </div>
        </div>

        {/* Pricing / Estimates */}
        <div className="flex items-baseline justify-between mb-5">
          <div className="flex items-baseline space-x-1">
            <span className="text-xs text-[#475569]">Rate:</span>
            {hourlyRate ? (
              <>
                <span className="text-lg font-black text-[#172033] flex items-center">
                  <IndianRupee className="w-4 h-4 text-blue-600" />
                  {hourlyRate}
                </span>
                <span className="text-xs text-[#475569]">/ hr</span>
              </>
            ) : (
              <span className="text-xs font-semibold text-[#475569]">Contact for quote</span>
            )}
          </div>

          {estimatedPrice && (
            <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Est. ₹{Number(estimatedPrice).toFixed(0)}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons: View Profile & Book */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Link
          to={`/provider/${providerId}`}
          className="btn-secondary py-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5 hover:border-blue-400"
        >
          <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
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

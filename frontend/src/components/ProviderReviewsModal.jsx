import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Star, X, Sparkles, ThumbsUp, ThumbsDown, MessageSquare, Loader2, ExternalLink } from 'lucide-react';

const ProviderReviewsModal = ({ provider, onClose }) => {
  const providerId = provider?.user_id || provider?.id;
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ positive_highlights: [], critical_highlights: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await api.get(`/reviews/provider/${providerId}`);
        if (res.data?.success) {
          setReviews(res.data.reviews || []);
          setSummary(res.data.summary || { positive_highlights: [], critical_highlights: [] });
        }
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoading(false);
      }
    };
    if (providerId) fetchReviews();
  }, [providerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="theme-card max-w-xl w-full max-h-[640px] flex flex-col shadow-2xl border border-[#363d66] animate-in fade-in duration-150 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#363d66] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#6d5dfc]/15 text-[#6d5dfc] rounded-xl border border-[#6d5dfc]/30">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{provider.full_name || provider.name}</h3>
              <p className="text-xs text-[#a9b0d0]">
                Verified Reviews & AI Extractive Summary ({reviews.length} reviews)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#a9b0d0] hover:text-white p-1 rounded-lg cursor-pointer hover:bg-[#363d66]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-7 w-7 text-[#6d5dfc] animate-spin mb-2" />
              <p className="text-xs text-[#a9b0d0]">Analyzing customer feedback with NLP...</p>
            </div>
          ) : (
            <>
              {/* AI TF-IDF Extractive Summary Cards */}
              <div className="p-4 bg-[#1c2036] rounded-2xl border border-[#363d66] space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#6d5dfc] uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Review Highlights (TF-IDF NLP)</span>
                </div>

                {/* Positive Highlights */}
                {summary.positive_highlights?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[#2dd4bf] flex items-center">
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      What Customers Praised:
                    </span>
                    {summary.positive_highlights.map((sent, idx) => (
                      <p key={idx} className="text-xs text-[#f1f3ff] bg-[#262b47]/80 p-2.5 rounded-xl border border-[#2dd4bf]/20">
                        "{sent}"
                      </p>
                    ))}
                  </div>
                )}

                {/* Critical Highlights */}
                {summary.critical_highlights?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center">
                      <ThumbsDown className="h-3 w-3 mr-1" />
                      Areas for Attention:
                    </span>
                    {summary.critical_highlights.map((sent, idx) => (
                      <p key={idx} className="text-xs text-[#f1f3ff] bg-[#262b47]/80 p-2.5 rounded-xl border border-amber-500/20">
                        "{sent}"
                      </p>
                    ))}
                  </div>
                )}

                {summary.positive_highlights?.length === 0 && summary.critical_highlights?.length === 0 && (
                  <p className="text-xs text-[#a9b0d0] italic">
                    AI extractive summary will automatically generate once multiple verified reviews are logged.
                  </p>
                )}
              </div>

              {/* Review Cards List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#a9b0d0] uppercase tracking-wider">
                    Customer Reviews
                  </h4>
                  <Link
                    to={`/provider/${providerId}`}
                    onClick={onClose}
                    className="text-[11px] text-[#2dd4bf] hover:underline inline-flex items-center space-x-1 font-semibold"
                  >
                    <span>View Profile & Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {reviews.length === 0 ? (
                  <p className="text-xs text-[#a9b0d0] py-6 text-center italic">
                    No approved reviews published yet for this service provider.
                  </p>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="p-3.5 bg-[#1c2036] rounded-xl border border-[#363d66] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{r.customer_name || 'Verified Customer'}</span>
                        <div className="flex items-center space-x-0.5 text-[#fbbf24]">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < r.rating ? 'fill-[#fbbf24] text-[#fbbf24]' : 'text-[#363d66]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-[#f1f3ff] leading-relaxed">"{r.review_text}"</p>
                      <div className="flex items-center justify-between pt-1 border-t border-[#363d66]/60 text-[10px] text-[#a9b0d0]">
                        <span>
                          {r.sentiment_score !== null && r.sentiment_score !== undefined
                            ? `Sentiment: ${r.sentiment_score > 0 ? `+${r.sentiment_score}` : r.sentiment_score}`
                            : 'Sentiment: neutral'}
                        </span>
                        <span>{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderReviewsModal;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[640px] flex flex-col shadow-xl border border-[#e2e8f0] animate-in fade-in duration-150 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#172033]">{provider.full_name || provider.name}</h3>
              <p className="text-xs text-[#475569]">
                Verified Reviews & AI Extractive Summary ({reviews.length} reviews)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#475569] hover:text-[#172033] p-1.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-7 w-7 text-blue-600 animate-spin mb-2" />
              <p className="text-xs text-[#475569]">Analyzing customer feedback with NLP...</p>
            </div>
          ) : (
            <>
              {/* AI TF-IDF Extractive Summary Cards */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-[#e2e8f0] space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Review Highlights (TF-IDF NLP)</span>
                </div>

                {/* Positive Highlights */}
                {summary.positive_highlights?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center">
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      What Customers Praised:
                    </span>
                    {summary.positive_highlights.map((sent, idx) => (
                      <p key={idx} className="text-xs text-[#172033] bg-white p-2.5 rounded-xl border border-emerald-200">
                        "{sent}"
                      </p>
                    ))}
                  </div>
                )}

                {/* Critical Highlights */}
                {summary.critical_highlights?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-amber-700 flex items-center">
                      <ThumbsDown className="h-3 w-3 mr-1" />
                      Areas for Attention:
                    </span>
                    {summary.critical_highlights.map((sent, idx) => (
                      <p key={idx} className="text-xs text-[#172033] bg-white p-2.5 rounded-xl border border-amber-200">
                        "{sent}"
                      </p>
                    ))}
                  </div>
                )}

                {summary.positive_highlights?.length === 0 && summary.critical_highlights?.length === 0 && (
                  <p className="text-xs text-[#475569] italic">
                    AI extractive summary will automatically generate once multiple verified reviews are logged.
                  </p>
                )}
              </div>

              {/* Review Cards List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#475569] uppercase tracking-wider">
                    Customer Reviews
                  </h4>
                  <Link
                    to={`/provider/${providerId}`}
                    onClick={onClose}
                    className="text-[11px] text-blue-600 hover:underline inline-flex items-center space-x-1 font-semibold"
                  >
                    <span>View Profile & Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {reviews.length === 0 ? (
                  <p className="text-xs text-[#475569] py-6 text-center italic">
                    No approved reviews published yet for this service provider.
                  </p>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="p-3.5 bg-slate-50 rounded-xl border border-[#e2e8f0] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#172033]">{r.customer_name || 'Verified Customer'}</span>
                        <div className="flex items-center space-x-0.5 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-[#172033] leading-relaxed">"{r.review_text}"</p>
                      <div className="flex items-center justify-between pt-1 border-t border-[#e2e8f0] text-[10px] text-[#475569]">
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

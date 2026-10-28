import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Star, X, Sparkles, ThumbsUp, ThumbsDown, MessageSquare, Loader2 } from 'lucide-react';

const ProviderReviewsModal = ({ provider, onClose }) => {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ positive_highlights: [], critical_highlights: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await api.get(`/reviews/provider/${provider.user_id}`);
        if (res.data.success) {
          setReviews(res.data.reviews);
          setSummary(res.data.summary);
        }
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [provider.user_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[620px] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in duration-150 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{provider.full_name}</h3>
              <p className="text-xs text-slate-500">
                Verified Reviews & AI Extractive Summary ({reviews.length} reviews)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-7 w-7 text-brand-600 animate-spin mb-2" />
              <p className="text-xs text-slate-500">Analyzing feedback and generating AI summary...</p>
            </div>
          ) : (
            <>
              {/* AI TF-IDF Extractive Summary Cards */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-brand-700 uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Review Highlights (TF-IDF NLP)</span>
                </div>

                {/* Positive Highlights */}
                {summary.positive_highlights?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-emerald-800 flex items-center">
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      What Customers Praised:
                    </span>
                    {summary.positive_highlights.map((sent, idx) => (
                      <p key={idx} className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                        "{sent}"
                      </p>
                    ))}
                  </div>
                )}

                {/* Critical Highlights */}
                {summary.critical_highlights?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-amber-800 flex items-center">
                      <ThumbsDown className="h-3 w-3 mr-1" />
                      Areas for Attention:
                    </span>
                    {summary.critical_highlights.map((sent, idx) => (
                      <p key={idx} className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-amber-100 shadow-2xs">
                        "{sent}"
                      </p>
                    ))}
                  </div>
                )}

                {summary.positive_highlights?.length === 0 && summary.critical_highlights?.length === 0 && (
                  <p className="text-xs text-slate-500 italic">
                    AI summary will activate as soon as more reviews are logged.
                  </p>
                )}
              </div>

              {/* Review Cards List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Customer Reviews
                </h4>
                {reviews.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center italic">
                    No approved reviews yet for this provider.
                  </p>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{r.customer_name}</span>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">"{r.review_text}"</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>Sentiment Polarity: {r.sentiment_score !== null ? `${r.sentiment_score}` : 'N/A'}</span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
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
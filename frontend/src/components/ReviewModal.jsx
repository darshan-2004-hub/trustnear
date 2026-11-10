import React, { useState } from 'react';
import api from '../services/api';
import { Star, X, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';

const ReviewModal = ({ booking, onClose, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!reviewText.trim()) {
      setError('Please write a short review describing the service quality.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/reviews', {
        booking_id: booking.id,
        rating: rating,
        review_text: reviewText.trim(),
      });

      if (res.data.success) {
        setResult(res.data);
        if (onReviewSubmitted) onReviewSubmitted();
      } else {
        setError(res.data.message || 'Failed to submit review.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error while submitting review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl border border-[#e2e8f0] max-w-lg w-full p-6 relative shadow-xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#475569] hover:text-[#172033] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-2xs">
            <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-[#172033] text-base">Rate {booking.counterpart?.full_name || booking.provider_name || 'Service'}</h3>
            <p className="text-xs text-[#475569]">Verified Review with NLP Sentiment Screening</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result ? (
          <div className="p-5 rounded-xl bg-slate-50 border border-[#e2e8f0] text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-[#172033] text-sm">Review Submitted Successfully!</h4>
            <div className="p-3 rounded-lg bg-white border border-[#e2e8f0] text-xs space-y-1">
              <p className="text-[#475569]">NLP Sentiment Score: <strong className="text-emerald-600">{result.review?.sentiment_score ?? result.sentiment_score ?? 'Verified'}</strong></p>
              {result.is_suspicious && (
                <p className="text-amber-700 font-bold">Flagged for admin moderation: {result.flag_reason}</p>
              )}
            </div>
            <button onClick={onClose} className="w-full py-2.5 btn-primary text-xs uppercase font-bold tracking-wider mt-2">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Interactive Stars */}
            <div>
              <label className="block text-[#475569] font-semibold mb-2">Overall Quality Rating</label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-600 ml-2">{rating}.0 / 5.0</span>
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-[#475569] font-semibold mb-1">Your Detailed Feedback</label>
              <textarea
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="How was the punctuality, pricing, and quality of work?"
                className="w-full bg-white border border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[#172033] outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center space-x-2 text-xs text-blue-700">
              <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />
              <span>NLP anti-spam screening automatically validates sentiment consistency.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 btn-primary text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Analyzing Feedback...' : 'Submit Verified Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;

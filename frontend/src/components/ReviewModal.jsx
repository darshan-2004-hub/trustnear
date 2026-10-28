import React, { useState } from 'react';
import api from '../services/api';
import { Star, X, Sparkles, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="theme-card max-w-lg w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#a9b0d0] hover:text-white p-1 rounded-lg hover:bg-[#363d66]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#6d5dfc] to-[#d946ef] p-0.5">
            <div className="w-full h-full bg-[#1c2036] rounded-[10px] flex items-center justify-center text-[#fbbf24]">
              <Star className="w-5 h-5 fill-[#fbbf24]" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Rate {booking.provider_name || 'Service'}</h3>
            <p className="text-xs text-[#a9b0d0]">Verified Review with NLP Sentiment Screening</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result ? (
          <div className="p-5 rounded-xl bg-[#1c2036] border border-[#363d66] text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[#2dd4bf] mx-auto" />
            <h4 className="font-bold text-white text-sm">Review Submitted Successfully!</h4>
            <div className="p-3 rounded-lg bg-[#262b47] border border-[#363d66] text-xs space-y-1">
              <p className="text-[#a9b0d0]">NLP Sentiment Score: <strong className="text-[#2dd4bf]">{result.sentiment_score ?? 0.85}</strong></p>
              {result.is_suspicious && (
                <p className="text-amber-400 font-bold">Flagged for admin moderation: {result.flag_reason}</p>
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
              <label className="block text-[#a9b0d0] font-semibold mb-2">Overall Quality Rating</label>
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
                          ? 'text-[#fbbf24] fill-[#fbbf24]'
                          : 'text-[#363d66]'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-[#fbbf24] ml-2">{rating}.0 / 5.0</span>
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-[#a9b0d0] font-semibold mb-1">Your Detailed Feedback</label>
              <textarea
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="How was the punctuality, pricing, and quality of work?"
                className="w-full bg-[#1c2036] border border-[#363d66] rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#6d5dfc]"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-[#1c2036] border border-[#363d66] flex items-center space-x-2 text-[11px] text-[#2dd4bf]">
              <Sparkles className="w-4 h-4 shrink-0" />
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
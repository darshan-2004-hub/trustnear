import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Trash2, 
  RotateCcw, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Check
} from 'lucide-react';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    total_reviews: 0,
    flagged_reviews_count: 0,
    approved_reviews_count: 0,
    removed_reviews_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Action loading
  const [actionLoading, setActionLoading] = useState(null);
  const [removeModal, setRemoveModal] = useState({
    open: false,
    review: null,
    reason: '',
    loading: false,
    error: ''
  });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusFilter
      });
      if (searchTerm.trim()) params.append('q', searchTerm.trim());

      const res = await api.get(`/admin/reviews?${params.toString()}`);
      if (res.data?.success) {
        setReviews(res.data.reviews || []);
        setTotalCount(res.data.total_count || 0);
        setTotalPages(res.data.total_pages || 1);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } else {
        setError(res.data?.message || 'Failed to fetch reviews.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading reviews from server.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, searchTerm]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReviews();
  };

  const handleApprove = async (reviewId) => {
    setActionLoading(`approve-${reviewId}`);
    try {
      const res = await api.patch(`/admin/reviews/${reviewId}/moderate`, { action: 'approve' });
      if (res.data?.success) {
        fetchReviews();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve review.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (reviewId) => {
    setActionLoading(`restore-${reviewId}`);
    try {
      const res = await api.patch(`/admin/reviews/${reviewId}/moderate`, { action: 'restore' });
      if (res.data?.success) {
        fetchReviews();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to restore review.');
    } finally {
      setActionLoading(null);
    }
  };

  const openRemoveModal = (review) => {
    setRemoveModal({
      open: true,
      review,
      reason: '',
      loading: false,
      error: ''
    });
  };

  const handleRemoveSubmit = async (e) => {
    e.preventDefault();
    if (!removeModal.reason.trim()) {
      setRemoveModal(prev => ({ ...prev, error: 'A justification reason is required to remove a review.' }));
      return;
    }

    setRemoveModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await api.patch(`/admin/reviews/${removeModal.review.id}/moderate`, {
        action: 'remove',
        reason: removeModal.reason.trim()
      });
      if (res.data?.success) {
        setRemoveModal({ open: false, review: null, reason: '', loading: false, error: '' });
        fetchReviews();
      }
    } catch (err) {
      setRemoveModal(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to remove review.'
      }));
    }
  };

  return (
    <div className="space-y-6 text-xs text-[#172033]">
      
      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#e2e8f0] shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#475569] block">Total Reviews</span>
          <p className="text-xl font-black text-[#172033] mt-0.5">{stats.total_reviews}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-rose-700 block">Flagged / Suspicious</span>
          <p className="text-xl font-black text-rose-600 mt-0.5">{stats.flagged_reviews_count}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Approved & Published</span>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{stats.approved_reviews_count}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-300 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#475569] block">Removed / Hidden</span>
          <p className="text-xl font-black text-slate-700 mt-0.5">{stats.removed_reviews_count}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reviewer, provider, or review text..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#cbd5e1] text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <span className="text-[#475569] font-medium text-[11px]">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 rounded-xl border border-[#cbd5e1] text-xs bg-white font-medium cursor-pointer"
            >
              <option value="all">All Reviews</option>
              <option value="flagged">Flagged by NLP</option>
              <option value="approved">Approved</option>
              <option value="removed">Removed / Archived</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl btn-primary font-bold transition cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Reviews Queue */}
      <div className="glass-card rounded-2xl p-6">
        {loading ? (
          <div className="py-16 text-center text-[#475569] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
            <p className="font-semibold">Loading community reviews...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="font-bold">{error}</p>
            <button
              onClick={fetchReviews}
              className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-[#475569] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto opacity-60" />
            <p className="font-bold text-[#172033]">No Reviews in this View</p>
            <p className="text-[11px]">No review records match your current filter selection.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => {
              const reasons = Array.isArray(r.flag_reasons) && r.flag_reasons.length > 0
                ? r.flag_reasons
                : r.flag_reason
                  ? r.flag_reason.split(' | ').filter(Boolean)
                  : [];

              return (
                <div key={r.id} className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#172033]">{r.customer_name}</span>
                      <span className="text-[#475569] mx-1.5">→</span>
                      <span className="font-bold text-blue-700">{r.provider_name}</span>
                      {r.service_title && (
                        <span className="text-[11px] text-[#475569] ml-2 font-medium">({r.service_title})</span>
                      )}
                      <span className="text-[10px] text-slate-400 ml-2">Booking #{r.booking_id}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-amber-600 font-black">★ {r.rating}/5</span>
                      {r.is_deleted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">Removed</span>
                      ) : r.is_approved_by_admin ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Approved</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Flagged</span>
                      )}
                    </div>
                  </div>

                  <p className="text-[#172033] italic bg-white p-3 rounded-lg border border-[#e2e8f0]">
                    "{r.review_text}"
                  </p>

                  {/* Badges: NLP Sentiment & Similarity */}
                  <div className="flex flex-wrap items-center gap-2">
                    {r.sentiment_score !== undefined && r.sentiment_score !== null && (
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] border ${
                        r.sentiment_score < -0.05 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : r.sentiment_score > 0.05 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-[#475569] border-[#e2e8f0]'
                      }`}>
                        VADER Sentiment: {Number(r.sentiment_score) > 0 ? `+${Number(r.sentiment_score).toFixed(2)}` : Number(r.sentiment_score).toFixed(2)}
                      </span>
                    )}

                    {r.similarity_score !== undefined && r.similarity_score !== null && (
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
                        TF-IDF Similarity: {(Number(r.similarity_score) * 100).toFixed(1)}%
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 ml-auto">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>

                  {/* Flag Reasons Breakdown */}
                  {reasons.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider block">
                        NLP Screening Signals:
                      </span>
                      {reasons.map((reason, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium text-[11px] flex items-start space-x-1.5"
                        >
                          <span className="text-rose-600 font-bold shrink-0">•</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Moderation Reason display if removed or restored */}
                  {r.moderation_reason && (
                    <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-[11px]">
                      <strong>Admin Moderation Note:</strong> {r.moderation_reason}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2 pt-2 border-t border-[#e2e8f0]">
                    {r.is_deleted ? (
                      <button
                        onClick={() => handleRestore(r.id)}
                        disabled={actionLoading === `restore-${r.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold transition cursor-pointer flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Review</span>
                      </button>
                    ) : (
                      <>
                        {!r.is_approved_by_admin && (
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={actionLoading === `approve-${r.id}`}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold transition cursor-pointer flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Publish</span>
                          </button>
                        )}
                        <button
                          onClick={() => openRemoveModal(r)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition cursor-pointer flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Review</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 pt-4 border-t border-[#e2e8f0] flex items-center justify-between text-[#475569]">
            <span>Showing {reviews.length} of {totalCount} reviews</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl border border-[#cbd5e1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-xl border border-[#cbd5e1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* REMOVE REVIEW MODAL */}
      {removeModal.open && removeModal.review && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="text-base font-bold text-rose-700 flex items-center space-x-2">
                <Trash2 className="w-4 h-4" />
                <span>Remove Review</span>
              </h3>
              <button
                onClick={() => setRemoveModal({ open: false, review: null, reason: '', loading: false, error: '' })}
                className="text-[#475569] hover:text-[#172033] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRemoveSubmit} className="space-y-4 text-xs">
              <p className="text-[#475569]">
                Are you sure you want to remove this review by <strong className="text-[#172033]">{removeModal.review.customer_name}</strong>?
                The review record will be soft-removed and preserved in the database for compliance and audit history.
              </p>

              {removeModal.error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[11px]">
                  {removeModal.error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Removal Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={removeModal.reason}
                  onChange={(e) => setRemoveModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="E.g., Fraudulent duplicate review pattern, explicit language, policy violation..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#cbd5e1] text-xs focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-[10px] text-[#475569]">This reason will be logged in the Admin Audit Log.</span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setRemoveModal({ open: false, review: null, reason: '', loading: false, error: '' })}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172033] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={removeModal.loading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {removeModal.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Removal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminReviews;

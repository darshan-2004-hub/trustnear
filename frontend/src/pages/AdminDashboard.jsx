import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Users, 
  Briefcase, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Check, 
  Trash2, 
  RefreshCw, 
  Search,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total_customers: 0,
    total_providers: 0,
    pending_verifications: 0,
    total_bookings: 0,
    completed_bookings: 0,
    flagged_reviews_count: 0,
  });

  const [pendingProviders, setPendingProviders] = useState([]);
  const [flaggedReviews, setFlaggedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);

    // Fetch Stats
    try {
      const statsRes = await api.get('/admin/stats');
      if (statsRes.data?.success && statsRes.data.stats) {
        setStats(statsRes.data.stats);
      }
    } catch (err) {
      console.warn('Admin stats endpoint fallback:', err.message);
    }

    // Fetch Providers
    try {
      const providersRes = await api.get('/admin/providers?status=pending');
      if (providersRes.data?.success && providersRes.data.providers) {
        setPendingProviders(providersRes.data.providers);
      }
    } catch (err) {
      console.warn('Admin providers fallback:', err.message);
    }

    // Fetch Flagged Reviews
    try {
      const reviewsRes = await api.get('/admin/reviews/flagged');
      if (reviewsRes.data?.success && reviewsRes.data.flagged_reviews) {
        setFlaggedReviews(reviewsRes.data.flagged_reviews);
      }
    } catch (err) {
      console.warn('Admin flagged reviews fallback:', err.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleProviderStatus = async (userId, status) => {
    setActionLoading(`provider-${userId}`);
    try {
      const res = await api.patch(`/admin/providers/${userId}/verify`, { status });
      if (res.data?.success) {
        setPendingProviders((prev) => prev.filter((p) => p.user_id !== userId));
        setStats((prev) => ({
          ...prev,
          pending_verifications: Math.max(0, prev.pending_verifications - 1),
          total_providers: status === 'verified' ? prev.total_providers : prev.total_providers - 1,
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update provider status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReviewAction = async (reviewId, action) => {
    setActionLoading(`review-${reviewId}`);
    try {
      const res = await api.patch(`/admin/reviews/${reviewId}/moderate`, { action });
      if (res.data?.success) {
        setFlaggedReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setStats((prev) => ({
          ...prev,
          flagged_reviews_count: Math.max(0, prev.flagged_reviews_count - 1),
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to moderate review.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#172033] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-[#172033]">TrustNear Administration Console</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                Root Admin
              </span>
            </div>
            <p className="text-xs text-[#475569] mt-1">
              Platform governance, provider KYC verification, and NLP fraud review moderation.
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="btn-secondary px-4 py-2 text-xs font-bold flex items-center space-x-2 rounded-xl shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 border-b border-[#e2e8f0] pb-3 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Overview KPIs
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'providers'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            <span>Provider Verification</span>
            {pendingProviders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                {pendingProviders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'reviews'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            <span>NLP Review Moderation</span>
            {flaggedReviews.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
                {flaggedReviews.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: OVERVIEW KPIs */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1 */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-[#475569] mb-2">
                  <span>CUSTOMERS</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-3xl font-black text-[#172033]">{stats.total_customers}</p>
                <span className="text-[11px] text-[#475569] mt-1">Registered platform users</span>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-[#475569] mb-2">
                  <span>SERVICE PROVIDERS</span>
                  <Briefcase className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-3xl font-black text-[#172033]">{stats.total_providers}</p>
                <span className="text-[11px] text-[#475569] mt-1">Trade contractors onboarded</span>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-[#475569] mb-2">
                  <span>COMPLETED JOBS</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-3xl font-black text-[#172033]">{stats.completed_bookings}</p>
                <span className="text-[11px] text-[#475569] mt-1">Out of {stats.total_bookings} total bookings</span>
              </div>

              {/* Card 4 */}
              <div className="bg-white rounded-2xl border border-amber-200 p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-700 mb-2">
                  <span>PENDING VERIFICATIONS</span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-3xl font-black text-amber-600">{stats.pending_verifications}</p>
                <span className="text-[11px] text-[#475569] mt-1">Awaiting KYC background check</span>
              </div>

            </div>

            {/* Alert Banner for Flagged Reviews */}
            {stats.flagged_reviews_count > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-[#172033]">{stats.flagged_reviews_count} review(s) currently flagged by the NLP system</p>
                    <p className="text-[#475569]">Suspicious sentiment conflict or templated patterns require manual inspection.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition cursor-pointer shadow-sm"
                >
                  Review Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PENDING PROVIDERS */}
        {activeTab === 'providers' && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm">
            <h3 className="text-base font-bold text-[#172033] mb-4">Pending Provider KYC Verifications</h3>
            {pendingProviders.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#475569]">
                <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-60" />
                <p className="font-bold text-[#172033]">All Clear!</p>
                <p>No providers are currently awaiting verification.</p>
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-[#475569] uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Provider</th>
                      <th className="pb-3">Trade</th>
                      <th className="pb-3">Experience</th>
                      <th className="pb-3">Rate</th>
                      <th className="pb-3">Location</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {pendingProviders.map((p) => (
                      <tr key={p.user_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 font-bold text-[#172033]">{p.full_name} ({p.email})</td>
                        <td className="py-3 text-blue-700 font-semibold">{p.service_category}</td>
                        <td className="py-3 text-[#475569]">{p.experience_years} years</td>
                        <td className="py-3 text-[#172033] font-bold">₹{p.hourly_rate}/hr</td>
                        <td className="py-3 text-[#475569]">{p.service_address}</td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => handleProviderStatus(p.user_id, 'verified')}
                            disabled={actionLoading === `provider-${p.user_id}`}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold cursor-pointer"
                          >
                            Verify ✓
                          </button>
                          <button
                            onClick={() => handleProviderStatus(p.user_id, 'rejected')}
                            disabled={actionLoading === `provider-${p.user_id}`}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold cursor-pointer"
                          >
                            Reject ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FLAGGED REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm">
            <h3 className="text-base font-bold text-[#172033] mb-4">NLP Suspicious Review Moderation Queue</h3>
            {flaggedReviews.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#475569]">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-60" />
                <p className="font-bold text-[#172033]">Zero Flagged Reviews</p>
                <p>The NLP pipeline has screened all community reviews without fraud flags.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {flaggedReviews.map((r) => {
                  const reasons = Array.isArray(r.flag_reasons) && r.flag_reasons.length > 0
                    ? r.flag_reasons
                    : r.flag_reason
                      ? r.flag_reason.split(' | ').filter(Boolean)
                      : ['NLP Sentiment discrepancy or duplicate template pattern'];

                  return (
                    <div key={r.id} className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[#172033]">{r.customer_name}</span>
                          <span className="text-[#475569] mx-1.5">→</span>
                          <span className="font-bold text-blue-700">{r.provider_name}</span>
                          {r.service_title && (
                            <span className="text-[11px] text-[#475569] ml-2 font-medium">({r.service_title})</span>
                          )}
                        </div>
                        <span className="text-amber-600 font-bold">Rating: {r.rating} ★</span>
                      </div>

                      <p className="text-[#172033] italic bg-white p-2.5 rounded-lg border border-[#e2e8f0]">
                        "{r.review_text}"
                      </p>

                      {/* NLP Metrics Badges (Sentiment & Similarity) */}
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
                      </div>

                      {/* Flag Reasons Breakdown */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider block">
                          NLP Screening Reasons:
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

                      {/* Moderation Controls */}
                      <div className="flex justify-end space-x-2 pt-2 border-t border-[#e2e8f0]">
                        <button
                          onClick={() => handleReviewAction(r.id, 'approve')}
                          disabled={actionLoading === `review-${r.id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold transition cursor-pointer"
                        >
                          Approve (Keep)
                        </button>
                        <button
                          onClick={() => handleReviewAction(r.id, 'delete')}
                          disabled={actionLoading === `review-${r.id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition cursor-pointer"
                        >
                          Remove Review
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;

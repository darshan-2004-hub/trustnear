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
    total_customers: 3,
    total_providers: 7,
    pending_verifications: 1,
    total_bookings: 3,
    completed_bookings: 2,
    flagged_reviews_count: 1,
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
    <div className="min-h-screen bg-[#1c2036] text-[#f1f3ff] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white">TrustNear Administration Console</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d946ef]/20 text-[#d946ef] border border-[#d946ef]/30 uppercase">
                Root Admin
              </span>
            </div>
            <p className="text-xs text-[#a9b0d0] mt-1">
              Platform governance, provider KYC verification, and NLP fraud review moderation.
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="btn-secondary px-4 py-2 text-xs font-bold flex items-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#2dd4bf] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 border-b border-[#363d66] pb-3 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#6d5dfc] text-white font-bold shadow-md'
                : 'text-[#a9b0d0] hover:text-white hover:bg-[#262b47]'
            }`}
          >
            Overview KPIs
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'providers'
                ? 'bg-[#6d5dfc] text-white font-bold shadow-md'
                : 'text-[#a9b0d0] hover:text-white hover:bg-[#262b47]'
            }`}
          >
            <span>Provider Verification</span>
            {pendingProviders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#fbbf24] text-[#1c2036] text-[10px] font-black">
                {pendingProviders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'reviews'
                ? 'bg-[#6d5dfc] text-white font-bold shadow-md'
                : 'text-[#a9b0d0] hover:text-white hover:bg-[#262b47]'
            }`}
          >
            <span>NLP Review Moderation</span>
            {flaggedReviews.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
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
              <div className="theme-card p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-[#a9b0d0] mb-2">
                  <span>CUSTOMERS</span>
                  <Users className="w-4 h-4 text-[#2dd4bf]" />
                </div>
                <p className="text-3xl font-black text-white">{stats.total_customers}</p>
                <span className="text-[11px] text-[#a9b0d0] mt-1">Registered platform users</span>
              </div>

              {/* Card 2 */}
              <div className="theme-card p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-[#a9b0d0] mb-2">
                  <span>SERVICE PROVIDERS</span>
                  <Briefcase className="w-4 h-4 text-[#6d5dfc]" />
                </div>
                <p className="text-3xl font-black text-white">{stats.total_providers}</p>
                <span className="text-[11px] text-[#a9b0d0] mt-1">Trade contractors onboarded</span>
              </div>

              {/* Card 3 */}
              <div className="theme-card p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-[#a9b0d0] mb-2">
                  <span>COMPLETED JOBS</span>
                  <CheckCircle2 className="w-4 h-4 text-[#2dd4bf]" />
                </div>
                <p className="text-3xl font-black text-white">{stats.completed_bookings}</p>
                <span className="text-[11px] text-[#a9b0d0] mt-1">Out of {stats.total_bookings} total bookings</span>
              </div>

              {/* Card 4 */}
              <div className="theme-card p-5 flex flex-col justify-between border-[#fbbf24]/30">
                <div className="flex items-center justify-between text-xs font-semibold text-[#fbbf24] mb-2">
                  <span>PENDING VERIFICATIONS</span>
                  <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />
                </div>
                <p className="text-3xl font-black text-[#fbbf24]">{stats.pending_verifications}</p>
                <span className="text-[11px] text-[#a9b0d0] mt-1">Awaiting KYC background check</span>
              </div>

            </div>

            {/* Alert Banner for Flagged Reviews */}
            {stats.flagged_reviews_count > 0 && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{stats.flagged_reviews_count} review(s) currently flagged by the NLP system</p>
                    <p className="text-[#a9b0d0]">Suspicious sentiment conflict or templated patterns require manual inspection.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition"
                >
                  Review Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PENDING PROVIDERS */}
        {activeTab === 'providers' && (
          <div className="theme-card p-6">
            <h3 className="text-base font-bold text-white mb-4">Pending Provider KYC Verifications</h3>
            {pendingProviders.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#a9b0d0]">
                <ShieldCheck className="w-10 h-10 text-[#2dd4bf] mx-auto mb-2 opacity-60" />
                <p className="font-bold text-white">All Clear!</p>
                <p>No providers are currently awaiting verification.</p>
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#363d66] text-[#a9b0d0] uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Provider</th>
                      <th className="pb-3">Trade</th>
                      <th className="pb-3">Experience</th>
                      <th className="pb-3">Rate</th>
                      <th className="pb-3">Location</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#363d66]/60">
                    {pendingProviders.map((p) => (
                      <tr key={p.user_id}>
                        <td className="py-3 font-bold text-white">{p.full_name} ({p.email})</td>
                        <td className="py-3 text-[#2dd4bf] font-semibold">{p.service_category}</td>
                        <td className="py-3 text-[#a9b0d0]">{p.experience_years} years</td>
                        <td className="py-3 text-white font-bold">₹{p.hourly_rate}/hr</td>
                        <td className="py-3 text-[#a9b0d0]">{p.service_address}</td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => handleProviderStatus(p.user_id, 'verified')}
                            disabled={actionLoading === `provider-${p.user_id}`}
                            className="px-3 py-1.5 rounded-xl bg-[#2dd4bf]/20 text-[#2dd4bf] hover:bg-[#2dd4bf]/30 font-bold"
                          >
                            Verify ✓
                          </button>
                          <button
                            onClick={() => handleProviderStatus(p.user_id, 'rejected')}
                            disabled={actionLoading === `provider-${p.user_id}`}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 font-bold"
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
          <div className="theme-card p-6">
            <h3 className="text-base font-bold text-white mb-4">NLP Suspicious Review Moderation Queue</h3>
            {flaggedReviews.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#a9b0d0]">
                <CheckCircle2 className="w-10 h-10 text-[#2dd4bf] mx-auto mb-2 opacity-60" />
                <p className="font-bold text-white">Zero Flagged Reviews</p>
                <p>The NLP pipeline has screened all community reviews without fraud flags.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {flaggedReviews.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl bg-[#1c2036] border border-[#363d66] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{r.customer_name} → {r.provider_name}</span>
                      <span className="text-[#fbbf24] font-bold">Rating: {r.rating} ★</span>
                    </div>
                    <p className="text-[#a9b0d0] italic">"{r.review_text}"</p>
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold text-[11px]">
                      Flag Reason: {r.flag_reason || 'NLP Sentiment discrepancy or duplicate template pattern'}
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        onClick={() => handleReviewAction(r.id, 'approve')}
                        disabled={actionLoading === `review-${r.id}`}
                        className="px-3 py-1.5 rounded-xl bg-[#2dd4bf]/20 text-[#2dd4bf] hover:bg-[#2dd4bf]/30 font-bold"
                      >
                        Approve (Keep)
                      </button>
                      <button
                        onClick={() => handleReviewAction(r.id, 'delete')}
                        disabled={actionLoading === `review-${r.id}`}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 font-bold"
                      >
                        Delete Fake Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
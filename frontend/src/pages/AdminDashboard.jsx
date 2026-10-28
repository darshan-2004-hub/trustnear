import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Users, Briefcase, CalendarCheck, AlertTriangle, Check, X, Trash2,
  CheckCircle2, ShieldAlert, Star, Loader2, RefreshCw, ShieldCheck,
} from 'lucide-react';

// Shared style tokens (mid-dark theme)
const card = 'bg-[#262b47] border border-[#363d66] rounded-2xl';
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2dd4bf]';
const btnBase = `inline-flex items-center gap-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${focus}`;

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [flaggedReviews, setFlaggedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get('/admin/stats');
      if (statsRes.data.success) setStats(statsRes.data.stats);

      const provRes = await api.get('/admin/providers?status=pending');
      if (provRes.data.success) setPendingProviders(provRes.data.providers);

      const revRes = await api.get('/admin/reviews/flagged');
      if (revRes.data.success) setFlaggedReviews(revRes.data.flagged_reviews);
    } catch (err) {
      console.error('Failed to load admin console data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const refreshStats = async () => {
    const statsRes = await api.get('/admin/stats');
    if (statsRes.data.success) setStats(statsRes.data.stats);
  };

  const handleVerifyProvider = async (userId, newStatus) => {
    setActionLoading(`prov_${userId}`);
    try {
      const res = await api.patch(`/admin/providers/${userId}/verify`, { status: newStatus });
      if (res.data.success) {
        setPendingProviders((prev) => prev.filter((p) => p.user_id !== userId));
        await refreshStats();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Verification update failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleModerateReview = async (reviewId, action) => {
    setActionLoading(`rev_${reviewId}`);
    try {
      const res = await api.patch(`/admin/reviews/${reviewId}/moderate`, { action });
      if (res.data.success) {
        setFlaggedReviews((prev) => prev.filter((r) => r.id !== reviewId));
        await refreshStats();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Moderation action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  // Security gate
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#1c2036] flex items-center justify-center p-4">
        <div className={`${card} max-w-md w-full p-8 text-center`}>
          <div className="p-3 bg-[#f472b6]/15 text-[#f472b6] rounded-2xl inline-flex mb-3">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#f1f3ff]">Access denied</h2>
          <p className="text-sm text-[#a9b0d0] mt-2 mb-6">
            Sign in with an administrator account to open this console.
          </p>
          <Link
            to="/login"
            className={`inline-flex px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-br from-[#6d5dfc] to-[#d946ef] ${focus}`}
          >
            Sign in as administrator
          </Link>
        </div>
      </div>
    );
  }

  const completedPct =
    stats && stats.total_bookings > 0
      ? Math.round((stats.completed_bookings / stats.total_bookings) * 100)
      : 0;

  const tabClass = (name) =>
    `px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${focus} ${
      activeTab === name
        ? 'bg-gradient-to-br from-[#6d5dfc] to-[#d946ef] text-white'
        : 'text-[#a9b0d0] hover:bg-[#2f3556] hover:text-[#f1f3ff]'
    }`;

  return (
    <div
      className="min-h-screen bg-[#1c2036] text-[#f1f3ff]"
      style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">Administration console</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#2dd4bf]/15 text-[#2dd4bf]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Root admin
              </span>
            </div>
            <p className="text-sm text-[#a9b0d0] mt-1">
              Verify providers and moderate reviews flagged by the fraud checker.
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            className={`${btnBase} px-4 py-2.5 bg-[#262b47] hover:bg-[#2f3556] text-[#f1f3ff] border border-[#4a5285] self-start sm:self-auto`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh data
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#363d66] pb-3 mb-6">
          <button onClick={() => setActiveTab('overview')} className={tabClass('overview')}>
            Overview
          </button>
          <button onClick={() => setActiveTab('verifications')} className={tabClass('verifications')}>
            <span>Provider verification</span>
            {pendingProviders.length > 0 && (
              <span className="px-1.5 rounded-full bg-[#fbbf24] text-[#1c2036] text-[11px] font-extrabold">
                {pendingProviders.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('moderation')} className={tabClass('moderation')}>
            <span>Review moderation</span>
            {flaggedReviews.length > 0 && (
              <span className="px-1.5 rounded-full bg-[#f472b6] text-[#1c2036] text-[11px] font-extrabold">
                {flaggedReviews.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className={`${card} flex flex-col items-center justify-center py-20`}>
            <Loader2 className="h-8 w-8 text-[#8b7bff] animate-spin mb-3" />
            <p className="text-sm text-[#a9b0d0]">Loading admin data...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Customers */}
                  <div className={`${card} p-5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#a9b0d0]">Customers</span>
                      <span className="p-2 rounded-xl bg-[#8b7bff]/15 text-[#8b7bff]">
                        <Users className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="text-4xl font-extrabold text-[#8b7bff] mt-3">
                      {stats.total_customers}
                    </div>
                    <p className="text-xs text-[#a9b0d0] mt-1">Registered users</p>
                  </div>

                  {/* Providers */}
                  <div className={`${card} p-5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#a9b0d0]">Service providers</span>
                      <span className="p-2 rounded-xl bg-[#60a5fa]/15 text-[#60a5fa]">
                        <Briefcase className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="text-4xl font-extrabold text-[#60a5fa] mt-3">
                      {stats.total_providers}
                    </div>
                    <p className="text-xs text-[#a9b0d0] mt-1">Contractors onboarded</p>
                  </div>

                  {/* Completed jobs with progress */}
                  <div className={`${card} p-5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#a9b0d0]">Completed jobs</span>
                      <span className="p-2 rounded-xl bg-[#2dd4bf]/15 text-[#2dd4bf]">
                        <CalendarCheck className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="text-4xl font-extrabold text-[#2dd4bf] mt-3">
                      {stats.completed_bookings}
                    </div>
                    <div
                      className="h-1.5 rounded-full bg-[#1c2036] mt-3 overflow-hidden"
                      role="img"
                      aria-label={`${completedPct}% of bookings completed`}
                    >
                      <div
                        className="h-full rounded-full bg-[#2dd4bf]"
                        style={{ width: `${completedPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#a9b0d0] mt-2">
                      {completedPct}% of {stats.total_bookings} bookings
                    </p>
                  </div>

                  {/* Pending verifications: the one that needs action */}
                  <button
                    onClick={() => setActiveTab('verifications')}
                    className={`text-left p-5 rounded-2xl bg-gradient-to-br from-[#6d5dfc] to-[#d946ef] text-white cursor-pointer transition hover:brightness-110 ${focus}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Pending verifications</span>
                      <span className="p-2 rounded-xl bg-white/20">
                        <AlertTriangle className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="text-4xl font-extrabold mt-3">{stats.pending_verifications}</div>
                    <p className="text-xs mt-1 text-white/90">Open the queue to review</p>
                  </button>
                </div>

                {stats.flagged_reviews_count > 0 && (
                  <div className="p-4 bg-[#f472b6]/10 border border-[#f472b6]/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="h-5 w-5 text-[#f472b6] shrink-0" />
                      <div>
                        <p className="text-sm font-bold">
                          {stats.flagged_reviews_count} review(s) flagged by the fraud checker
                        </p>
                        <p className="text-xs text-[#a9b0d0]">
                          Rating and text disagree, or the wording looks copied. Check them by hand.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('moderation')}
                      className={`${btnBase} px-4 py-2 bg-[#f472b6] hover:bg-[#f78cc7] text-[#1c2036]`}
                    >
                      Review flagged
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PROVIDER VERIFICATION */}
            {activeTab === 'verifications' && (
              <div className={`${card} overflow-hidden`}>
                <div className="p-5 border-b border-[#363d66] flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold">Pending provider applications</h3>
                    <p className="text-sm text-[#a9b0d0]">
                      Check skills, trade license and address before the provider appears in search.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#a9b0d0] shrink-0">
                    {pendingProviders.length} pending
                  </span>
                </div>

                {pendingProviders.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle2 className="h-9 w-9 text-[#2dd4bf] mx-auto mb-2" />
                    <p className="font-bold">All provider applications are verified</p>
                    <p className="text-sm text-[#a9b0d0] mt-0.5">New sign-ups will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#363d66]">
                    {pendingProviders.map((p) => (
                      <div
                        key={p.user_id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 max-w-xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-bold">{p.full_name}</h4>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#60a5fa]/15 text-[#60a5fa] font-semibold">
                              {p.service_category}
                            </span>
                            <span className="text-xs text-[#fbbf24] font-bold">
                              ₹{p.hourly_rate}/hr
                            </span>
                          </div>
                          <p className="text-sm text-[#a9b0d0]">
                            {p.service_address}, {p.experience_years} years experience
                          </p>
                          <p className="text-sm text-[#d4d8f0] leading-relaxed italic">
                            "{p.bio || 'No bio submitted.'}"
                          </p>
                          <p className="text-xs text-[#a9b0d0]">
                            {p.email}, {p.phone || 'No phone'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            disabled={actionLoading === `prov_${p.user_id}`}
                            onClick={() => handleVerifyProvider(p.user_id, 'verified')}
                            className={`${btnBase} px-4 py-2.5 bg-[#2dd4bf] hover:bg-[#5eead4] text-[#1c2036]`}
                          >
                            <Check className="h-4 w-4" />
                            Approve and verify
                          </button>
                          <button
                            disabled={actionLoading === `prov_${p.user_id}`}
                            onClick={() => handleVerifyProvider(p.user_id, 'rejected')}
                            className={`${btnBase} px-3.5 py-2.5 border border-[#4a5285] text-[#f1f3ff] hover:bg-[#f472b6]/15 hover:border-[#f472b6]`}
                          >
                            <X className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: REVIEW MODERATION */}
            {activeTab === 'moderation' && (
              <div className={`${card} overflow-hidden`}>
                <div className="p-5 border-b border-[#363d66] flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold">Flagged review queue</h3>
                    <p className="text-sm text-[#a9b0d0]">
                      Approve to publish the review anyway. Delete to remove it from the database.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#a9b0d0] shrink-0">
                    {flaggedReviews.length} flagged
                  </span>
                </div>

                {flaggedReviews.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle2 className="h-9 w-9 text-[#2dd4bf] mx-auto mb-2" />
                    <p className="font-bold">No flagged reviews</p>
                    <p className="text-sm text-[#a9b0d0] mt-0.5">
                      The fraud checker is screening every new review.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#363d66]">
                    {flaggedReviews.map((r) => (
                      <div
                        key={r.id}
                        className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 max-w-2xl">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f472b6]/15 text-[#f472b6] text-xs font-bold">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Flag reason: {r.flag_reason}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <span className="font-bold">Customer: {r.customer_name}</span>
                            <span className="text-[#a9b0d0]">
                              Provider: <strong className="text-[#f1f3ff]">{r.provider_name}</strong>
                            </span>
                            <span className="text-[#8b7bff] font-semibold">{r.service_title}</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < r.rating ? 'fill-[#fbbf24] text-[#fbbf24]' : 'text-[#4a5285]'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[#a9b0d0]">
                              Sentiment score:{' '}
                              <strong className={r.sentiment_score < 0 ? 'text-[#f472b6]' : 'text-[#2dd4bf]'}>
                                {r.sentiment_score}
                              </strong>
                            </span>
                          </div>

                          <p className="text-sm text-[#d4d8f0] bg-[#1c2036] p-3 rounded-xl border border-[#363d66] leading-relaxed">
                            "{r.review_text}"
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            disabled={actionLoading === `rev_${r.id}`}
                            onClick={() => handleModerateReview(r.id, 'approve')}
                            className={`${btnBase} px-4 py-2.5 bg-[#2dd4bf] hover:bg-[#5eead4] text-[#1c2036]`}
                          >
                            <Check className="h-4 w-4" />
                            Approve and publish
                          </button>
                          <button
                            disabled={actionLoading === `rev_${r.id}`}
                            onClick={() => handleModerateReview(r.id, 'delete')}
                            className={`${btnBase} px-4 py-2.5 bg-[#f472b6] hover:bg-[#f78cc7] text-[#1c2036]`}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

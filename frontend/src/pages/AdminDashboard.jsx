import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AdminCustomers from '../components/AdminCustomers';
import AdminProviders from '../components/AdminProviders';
import AdminBookings from '../components/AdminBookings';
import AdminReviews from '../components/AdminReviews';
import AdminNoShows from '../components/AdminNoShows';
import AdminAuditLogs from '../components/AdminAuditLogs';
import AdminPayments from '../components/AdminPayments';
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
  ShieldCheck,
  Calendar,
  Clock,
  AlertOctagon,
  FileText,
  Activity,
  ArrowRight
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total_customers: 0,
    active_customers: 0,
    suspended_customers: 0,
    total_providers: 0,
    verified_providers: 0,
    pending_verifications: 0,
    rejected_providers: 0,
    suspended_providers: 0,
    total_bookings: 0,
    pending_bookings: 0,
    accepted_bookings: 0,
    in_progress_bookings: 0,
    completed_bookings: 0,
    cancelled_bookings: 0,
    total_reviews: 0,
    flagged_reviews_count: 0,
    approved_reviews_count: 0,
    removed_reviews_count: 0,
    pending_no_shows_count: 0,
    total_no_shows_count: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);

    // Fetch Stats & Recent Activity
    try {
      const statsRes = await api.get('/admin/stats');
      if (statsRes.data?.success && statsRes.data.stats) {
        setStats(prev => ({ ...prev, ...statsRes.data.stats }));
        if (statsRes.data.recent_activity) {
          setRecentActivity(statsRes.data.recent_activity);
        }
      }
    } catch (err) {
      console.warn('Admin stats endpoint fallback:', err.message);
    }

    // Fetch Pending Providers for quick queue badge
    try {
      const providersRes = await api.get('/admin/providers?status=pending');
      if (providersRes.data?.success && providersRes.data.providers) {
        setPendingProviders(providersRes.data.providers);
      }
    } catch (err) {
      console.warn('Admin providers fallback:', err.message);
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
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update provider status.');
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
              Unified platform governance, customer accounts, provider KYC verification, booking operations, and NLP fraud review moderation.
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="btn-secondary px-4 py-2 text-xs font-bold flex items-center space-x-2 rounded-xl shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Console</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1.5 border-b border-[#e2e8f0] pb-3 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'bookings'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            <span>Bookings</span>
            {stats.total_bookings > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'bookings' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {stats.total_bookings}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Customers
          </button>

          <button
            onClick={() => setActiveTab('all-providers')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all-providers'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Providers
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'providers'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            <span>KYC Verification</span>
            {pendingProviders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                {pendingProviders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'reviews'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            <span>Review Moderation</span>
            {stats.flagged_reviews_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
                {stats.flagged_reviews_count}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('no-shows')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'no-shows'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            <span>No-Shows</span>
            {stats.pending_no_shows_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
                {stats.pending_no_shows_count}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit-logs')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audit-logs'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Audit Log
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Payments
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Action Alert Banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.flagged_reviews_count > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-[#172033]">{stats.flagged_reviews_count} review(s) flagged by NLP</p>
                      <p className="text-[#475569]">Sentiment contradiction or duplicate template detected.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition cursor-pointer shadow-sm"
                  >
                    Moderate
                  </button>
                </div>
              )}

              {stats.pending_no_shows_count > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-[#172033]">{stats.pending_no_shows_count} reported no-show incident(s)</p>
                      <p className="text-[#475569]">Customer reports awaiting administrative validation.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('no-shows')}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition cursor-pointer shadow-sm"
                  >
                    Inspect
                  </button>
                </div>
              )}
            </div>

            {/* High-Level Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Customers Card */}
              <div 
                onClick={() => setActiveTab('customers')}
                className="bg-white rounded-2xl border border-[#e2e8f0] p-5 flex flex-col justify-between shadow-sm cursor-pointer hover:border-blue-400 transition"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#475569] mb-2">
                  <span>CUSTOMERS</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-black text-[#172033]">{stats.total_customers}</p>
                  <div className="flex items-center space-x-2 text-[11px] text-[#475569] mt-1">
                    <span className="text-emerald-700 font-bold">{stats.active_customers || stats.total_customers} active</span>
                    {stats.suspended_customers > 0 && (
                      <span className="text-rose-600 font-bold">• {stats.suspended_customers} suspended</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Providers Card */}
              <div 
                onClick={() => setActiveTab('all-providers')}
                className="bg-white rounded-2xl border border-[#e2e8f0] p-5 flex flex-col justify-between shadow-sm cursor-pointer hover:border-blue-400 transition"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#475569] mb-2">
                  <span>PROVIDERS</span>
                  <Briefcase className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-black text-[#172033]">{stats.total_providers}</p>
                  <div className="flex items-center space-x-2 text-[11px] text-[#475569] mt-1">
                    <span className="text-emerald-700 font-bold">{stats.verified_providers || 0} verified</span>
                    <span className="text-amber-600 font-bold">• {stats.pending_verifications || 0} pending</span>
                  </div>
                </div>
              </div>

              {/* Bookings Card */}
              <div 
                onClick={() => setActiveTab('bookings')}
                className="bg-white rounded-2xl border border-[#e2e8f0] p-5 flex flex-col justify-between shadow-sm cursor-pointer hover:border-blue-400 transition"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#475569] mb-2">
                  <span>BOOKINGS</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-3xl font-black text-[#172033]">{stats.total_bookings}</p>
                  <div className="flex items-center space-x-2 text-[11px] text-[#475569] mt-1">
                    <span className="text-emerald-700 font-bold">{stats.completed_bookings} completed</span>
                    <span className="text-rose-600 font-bold">• {stats.cancelled_bookings || 0} cancelled</span>
                  </div>
                </div>
              </div>

              {/* Reviews & Integrity Card */}
              <div 
                onClick={() => setActiveTab('reviews')}
                className="bg-white rounded-2xl border border-[#e2e8f0] p-5 flex flex-col justify-between shadow-sm cursor-pointer hover:border-blue-400 transition"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-[#475569] mb-2">
                  <span>REVIEWS & NLP TRUST</span>
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-black text-[#172033]">{stats.total_reviews}</p>
                  <div className="flex items-center space-x-2 text-[11px] text-[#475569] mt-1">
                    <span className="text-emerald-700 font-bold">{stats.approved_reviews_count || 0} approved</span>
                    {stats.flagged_reviews_count > 0 && (
                      <span className="text-rose-600 font-bold">• {stats.flagged_reviews_count} flagged</span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Operational Breakdown Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Booking Status Distribution */}
              <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2.5">
                  <h3 className="text-xs uppercase font-bold text-[#475569] flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Booking Pipeline Status Breakdown</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-[11px] text-blue-600 hover:underline font-bold flex items-center space-x-1"
                  >
                    <span>Manage</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Pending</span>
                    <p className="text-xl font-black text-amber-800 mt-0.5">{stats.pending_bookings || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">Accepted</span>
                    <p className="text-xl font-black text-indigo-800 mt-0.5">{stats.accepted_bookings || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-[10px] uppercase font-bold text-blue-700 block">In Progress</span>
                    <p className="text-xl font-black text-blue-800 mt-0.5">{stats.in_progress_bookings || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Completed</span>
                    <p className="text-xl font-black text-emerald-800 mt-0.5">{stats.completed_bookings || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-[10px] uppercase font-bold text-rose-700 block">Cancelled</span>
                    <p className="text-xl font-black text-rose-800 mt-0.5">{stats.cancelled_bookings || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                    <span className="text-[10px] uppercase font-bold text-[#475569] block">Total Volume</span>
                    <p className="text-xl font-black text-[#172033] mt-0.5">{stats.total_bookings || 0}</p>
                  </div>
                </div>
              </div>

              {/* Recent Audit Activity Feed */}
              <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2.5">
                  <h3 className="text-xs uppercase font-bold text-[#475569] flex items-center space-x-1.5">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <span>Recent Administrative Activity</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('audit-logs')}
                    className="text-[11px] text-blue-600 hover:underline font-bold flex items-center space-x-1"
                  >
                    <span>Full Audit Trail</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {recentActivity.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#475569]">
                    <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <p>No recent administrative actions recorded.</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {recentActivity.slice(0, 5).map((act) => (
                      <div key={act.id} className="p-2.5 rounded-xl bg-slate-50 border border-[#e2e8f0] flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[70%]">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#172033] text-[11px]">{act.action}</span>
                            <span className="text-[10px] text-purple-700 font-semibold capitalize">({act.target_type} #{act.target_id || ''})</span>
                          </div>
                          <p className="text-[10px] text-[#475569] truncate">
                            By {act.admin_name} {act.details?.reason ? `• Reason: ${act.details.reason}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: BOOKINGS */}
        {activeTab === 'bookings' && (
          <AdminBookings />
        )}

        {/* TAB 3: CUSTOMER MANAGEMENT */}
        {activeTab === 'customers' && (
          <AdminCustomers />
        )}

        {/* TAB 4: PROVIDER MANAGEMENT */}
        {activeTab === 'all-providers' && (
          <AdminProviders />
        )}

        {/* TAB 5: QUICK PENDING PROVIDER VERIFICATION */}
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

        {/* TAB 6: REVIEW MODERATION */}
        {activeTab === 'reviews' && (
          <AdminReviews />
        )}

        {/* TAB 7: NO-SHOW MANAGEMENT */}
        {activeTab === 'no-shows' && (
          <AdminNoShows />
        )}

        {/* TAB 8: AUDIT LOGS */}
        {activeTab === 'audit-logs' && (
          <AdminAuditLogs />
        )}

        {/* TAB 9: PAYMENT MANAGEMENT */}
        {activeTab === 'payments' && (
          <AdminPayments />
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;

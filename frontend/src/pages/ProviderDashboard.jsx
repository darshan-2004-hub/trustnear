import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TrustBadge from '../components/TrustBadge';
import { 
  Briefcase, 
  IndianRupee, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  TrendingUp, 
  Star, 
  ShieldCheck, 
  RefreshCw, 
  ArrowRight, 
  Zap, 
  MessageSquare,
  Sparkles,
  Award,
  ChevronRight
} from 'lucide-react';

const ProviderDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeChart, setActiveChart] = useState('earnings'); // 'earnings' | 'trend'

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/providers/dashboard/analytics');
      if (res.data?.success) {
        setDashboardData(res.data);
      } else {
        setError(res.data?.message || 'Failed to load dashboard data.');
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access denied: Provider role required to view this dashboard.');
      } else {
        setError(err.response?.data?.message || 'Could not connect to the analytics server.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1c2036] text-[#f1f3ff] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Skeleton Header */}
          <div className="h-20 bg-[#262b47] rounded-2xl animate-pulse" />
          
          {/* Skeleton KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 bg-[#262b47] rounded-2xl animate-pulse" />
            ))}
          </div>

          {/* Skeleton Chart & Diagnostics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 h-80 bg-[#262b47] rounded-2xl animate-pulse" />
            <div className="lg:col-span-4 h-80 bg-[#262b47] rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1c2036] text-[#f1f3ff] py-16 px-4 flex items-center justify-center">
        <div className="theme-card max-w-md w-full p-8 text-center border-rose-500/30">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Provider Analytics Unavailable</h2>
          <p className="text-xs text-[#a9b0d0] mb-6">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-2 btn-secondary rounded-xl text-xs font-semibold"
            >
              Back Home
            </button>
            <button
              onClick={fetchDashboardData}
              className="flex-1 py-2 btn-primary rounded-xl text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { profile, kpis, analytics, recent_reviews } = dashboardData || {};
  const monthlySeries = analytics?.monthly_series || [];
  const statusDist = analytics?.status_distribution || {};

  // Maximum value for SVG chart scaling
  const maxEarnings = Math.max(...monthlySeries.map((m) => m.earnings || 0), 100);
  const maxBookings = Math.max(...monthlySeries.map((m) => m.total_bookings || 0), 5);

  return (
    <div className="min-h-screen bg-[#1c2036] text-[#f1f3ff] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. TOP PROFILE & SUMMARY BANNER */}
        <div className="theme-card p-6 border-[#363d66] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6d5dfc] via-[#8b5cf6] to-[#d946ef] p-0.5 shrink-0 shadow-lg shadow-[#6d5dfc]/20">
              <div className="w-full h-full bg-[#1c2036] rounded-[14px] flex items-center justify-center font-black text-xl text-white">
                {profile?.full_name?.charAt(0) || 'P'}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{profile?.full_name}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2dd4bf]/15 text-[#2dd4bf] border border-[#2dd4bf]/30 uppercase">
                  {profile?.verification_status || 'verified'}
                </span>
              </div>
              <p className="text-xs text-[#a9b0d0] mt-0.5 flex flex-wrap items-center gap-x-2">
                <span className="text-[#6d5dfc] font-bold">{profile?.service_category}</span>
                <span>•</span>
                <span>{profile?.service_address || 'Mangaluru'}</span>
                <span>•</span>
                <span>Standard: ₹{profile?.hourly_rate}/hr</span>
                <span>•</span>
                <span>{profile?.experience_years} years experience</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={fetchDashboardData}
              className="p-2.5 rounded-xl border border-[#363d66] bg-[#1c2036] hover:bg-[#262b47] text-[#a9b0d0] hover:text-white transition cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              to="/bookings"
              className="btn-primary flex-1 md:flex-none px-4 py-2.5 text-xs font-bold flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Open Job Queue</span>
              {kpis?.pending_requests > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#fbbf24] text-[#1c2036] text-[10px] font-black animate-pulse">
                  {kpis.pending_requests}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* 2. OVERVIEW KPI CARDS (6 CARDS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Card 1: Total Completed Earnings */}
          <div className="theme-card p-4 flex flex-col justify-between border-[#2dd4bf]/40 bg-gradient-to-br from-[#262b47] to-[#1c2a38]">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-[#2dd4bf] uppercase tracking-wider mb-2">
              <span>TOTAL EARNINGS</span>
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white flex items-center">
                <IndianRupee className="w-4 h-4 text-[#2dd4bf] inline" />
                {Number(kpis?.total_earnings || 0).toFixed(0)}
              </p>
              <span className="text-[10px] text-[#a9b0d0] mt-1 block">
                From {kpis?.completed_jobs || 0} delivered jobs
              </span>
            </div>
          </div>

          {/* Card 2: Total Bookings */}
          <div className="theme-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-[#a9b0d0] uppercase tracking-wider mb-2">
              <span>TOTAL BOOKINGS</span>
              <Briefcase className="w-3.5 h-3.5 text-[#6d5dfc]" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{kpis?.total_bookings || 0}</p>
              <span className="text-[10px] text-[#a9b0d0] mt-1 block">Lifetime appointments</span>
            </div>
          </div>

          {/* Card 3: Pending Requests */}
          <div className="theme-card p-4 flex flex-col justify-between border-[#fbbf24]/30">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-[#fbbf24] uppercase tracking-wider mb-2">
              <span>PENDING REQUESTS</span>
              <Clock className="w-3.5 h-3.5 text-[#fbbf24]" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#fbbf24]">{kpis?.pending_requests || 0}</p>
              <span className="text-[10px] text-[#a9b0d0] mt-1 block">Awaiting your response</span>
            </div>
          </div>

          {/* Card 4: Active Jobs */}
          <div className="theme-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-[#2dd4bf] uppercase tracking-wider mb-2">
              <span>ACTIVE JOBS</span>
              <Zap className="w-3.5 h-3.5 text-[#2dd4bf]" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{kpis?.active_jobs || 0}</p>
              <span className="text-[10px] text-[#a9b0d0] mt-1 block">Accepted or in progress</span>
            </div>
          </div>

          {/* Card 5: Completed Jobs */}
          <div className="theme-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider mb-2">
              <span>COMPLETED JOBS</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{kpis?.completed_jobs || 0}</p>
              <span className="text-[10px] text-[#a9b0d0] mt-1 block">Verified delivered</span>
            </div>
          </div>

          {/* Card 6: Actual ML Trust Score */}
          <div className="theme-card p-4 flex flex-col justify-between border-[#6d5dfc]/40">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-[#6d5dfc] uppercase tracking-wider mb-2">
              <span>ML TRUST SCORE</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#6d5dfc]" />
            </div>
            <div>
              {kpis?.trust_score !== null && kpis?.trust_score !== undefined ? (
                <>
                  <p className="text-2xl font-black text-[#2dd4bf]">
                    {Number(kpis.trust_score).toFixed(1)} <span className="text-[11px] font-normal text-[#a9b0d0]">/ 100</span>
                  </p>
                  <div className="mt-1">
                    <TrustBadge 
                      score={kpis.trust_score} 
                      providerName={profile?.full_name} 
                      shapFactors={kpis.shap_factors}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-base font-bold text-[#fbbf24]">Unavailable</p>
                  <span className="text-[9px] text-[#a9b0d0] block mt-0.5">
                    Pending verified jobs
                  </span>
                </>
              )}
            </div>
          </div>

        </div>

        {/* 3. CHARTS & STATUS DISTRIBUTION (12 COLS GRID) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Interactive Monthly Charts (8 cols) */}
          <div className="lg:col-span-8 theme-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-[#2dd4bf]" />
                    <span>Monthly Operational Analytics</span>
                  </h3>
                  <p className="text-xs text-[#a9b0d0] mt-0.5">
                    {activeChart === 'earnings'
                      ? 'Gross revenue derived strictly from completed bookings in INR.'
                      : 'Monthly service request volume and completion velocity.'}
                  </p>
                </div>

                {/* Chart Toggle Tabs */}
                <div className="flex items-center space-x-1 bg-[#1c2036] p-1 rounded-xl border border-[#363d66] text-xs">
                  <button
                    onClick={() => setActiveChart('earnings')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      activeChart === 'earnings'
                        ? 'bg-[#6d5dfc] text-white shadow-md'
                        : 'text-[#a9b0d0] hover:text-white'
                    }`}
                  >
                    Earnings (₹)
                  </button>
                  <button
                    onClick={() => setActiveChart('trend')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      activeChart === 'trend'
                        ? 'bg-[#6d5dfc] text-white shadow-md'
                        : 'text-[#a9b0d0] hover:text-white'
                    }`}
                  >
                    Booking Volume
                  </button>
                </div>
              </div>

              {/* Responsive SVG Bar Chart */}
              {monthlySeries.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-xs text-[#a9b0d0]">
                  No historical booking records found.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2 border-b border-[#363d66]">
                    {monthlySeries.map((m) => {
                      const value = activeChart === 'earnings' ? m.earnings : m.total_bookings;
                      const maxVal = activeChart === 'earnings' ? maxEarnings : maxBookings;
                      const heightPercent = Math.max(8, Math.round((value / maxVal) * 100));

                      return (
                        <div key={m.month_key} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          {/* Tooltip on Hover */}
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[#1c2036] border border-[#363d66] px-2 py-1 rounded-lg text-[10px] text-white font-bold whitespace-nowrap z-20 shadow-xl">
                            {activeChart === 'earnings'
                              ? `₹${m.earnings.toFixed(0)} (${m.completed_count} completed)`
                              : `${m.total_bookings} total (${m.completed_count} completed, ${m.cancelled_count} cancelled)`}
                          </div>

                          {/* Top value label */}
                          <span className="text-[10px] font-bold text-[#a9b0d0] mb-1.5 opacity-80 group-hover:text-white">
                            {activeChart === 'earnings' ? (value > 0 ? `₹${value.toFixed(0)}` : '0') : value}
                          </span>

                          {/* Bar */}
                          <div className="w-full max-w-[48px] bg-[#1c2036] rounded-t-xl overflow-hidden p-0.5 border border-[#363d66]/50">
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className={`w-full rounded-t-lg transition-all duration-500 ${
                                activeChart === 'earnings'
                                  ? value > 0
                                    ? 'bg-gradient-to-t from-[#6d5dfc] to-[#2dd4bf]'
                                    : 'bg-[#363d66]/40'
                                  : value > 0
                                    ? 'bg-gradient-to-t from-[#8b5cf6] to-[#d946ef]'
                                    : 'bg-[#363d66]/40'
                              }`}
                            />
                          </div>

                          {/* Month Label */}
                          <span className="text-[11px] font-semibold text-[#a9b0d0] mt-3 whitespace-nowrap">
                            {m.short_month}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#a9b0d0] pt-2">
                    <span className="flex items-center space-x-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${activeChart === 'earnings' ? 'bg-[#2dd4bf]' : 'bg-[#d946ef]'}`} />
                      <span>{activeChart === 'earnings' ? 'Gross verified earnings' : 'Total customer job requests'}</span>
                    </span>
                    <span className="text-[10px]">Real transaction records</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Status Distribution & Performance Diagnostics (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Status Distribution Card */}
            <div className="theme-card p-6">
              <h3 className="text-base font-bold text-white mb-1">Booking Status Breakdown</h3>
              <p className="text-xs text-[#a9b0d0] mb-4">Distribution across current request lifecycle</p>

              {/* Segmented Distribution Bar */}
              <div className="h-3 w-full bg-[#1c2036] rounded-full overflow-hidden flex mb-4 border border-[#363d66]">
                <div 
                  style={{ width: `${statusDist.percentages?.completed || 0}%` }} 
                  className="bg-emerald-400" 
                  title={`Completed: ${statusDist.percentages?.completed || 0}%`} 
                />
                <div 
                  style={{ width: `${statusDist.percentages?.active || 0}%` }} 
                  className="bg-[#2dd4bf]" 
                  title={`Active: ${statusDist.percentages?.active || 0}%`} 
                />
                <div 
                  style={{ width: `${statusDist.percentages?.pending || 0}%` }} 
                  className="bg-[#fbbf24]" 
                  title={`Pending: ${statusDist.percentages?.pending || 0}%`} 
                />
                <div 
                  style={{ width: `${statusDist.percentages?.cancelled || 0}%` }} 
                  className="bg-rose-500" 
                  title={`Cancelled: ${statusDist.percentages?.cancelled || 0}%`} 
                />
              </div>

              {/* Status List */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c2036] border border-[#363d66]/50">
                  <span className="flex items-center space-x-2 text-[#f1f3ff]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Completed</span>
                  </span>
                  <span className="font-bold text-white">
                    {statusDist.completed || 0} ({statusDist.percentages?.completed || 0}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c2036] border border-[#363d66]/50">
                  <span className="flex items-center space-x-2 text-[#f1f3ff]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2dd4bf] shrink-0" />
                    <span>Active / In Progress</span>
                  </span>
                  <span className="font-bold text-white">
                    {statusDist.active || 0} ({statusDist.percentages?.active || 0}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c2036] border border-[#363d66]/50">
                  <span className="flex items-center space-x-2 text-[#f1f3ff]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] shrink-0" />
                    <span>Pending Requests</span>
                  </span>
                  <span className="font-bold text-[#fbbf24]">
                    {statusDist.pending || 0} ({statusDist.percentages?.pending || 0}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c2036] border border-[#363d66]/50">
                  <span className="flex items-center space-x-2 text-[#f1f3ff]">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span>Cancelled</span>
                  </span>
                  <span className="font-bold text-rose-400">
                    {statusDist.cancelled || 0} ({statusDist.percentages?.cancelled || 0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Response & Cancellation Diagnostics */}
            <div className="theme-card p-6 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider text-[11px] text-[#a9b0d0]">
                Operational Metrics
              </h4>

              {/* Response Speed */}
              <div className="flex items-center justify-between border-b border-[#363d66] pb-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#6d5dfc]" />
                  <span className="text-xs text-[#a9b0d0]">Average Response Speed</span>
                </div>
                <span className="text-xs font-bold text-white">
                  {kpis?.avg_response_minutes !== null && kpis?.avg_response_minutes !== undefined ? (
                    `${kpis.avg_response_minutes} minutes`
                  ) : (
                    <span className="text-[#a9b0d0] italic">~20m (Benchmark)</span>
                  )}
                </span>
              </div>

              {/* Cancellation Rate */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />
                  <span className="text-xs text-[#a9b0d0]">Cancellation Rate</span>
                </div>
                <span className={`text-xs font-bold ${
                  (kpis?.cancellation_rate || 0) > 15 ? 'text-rose-400' : 'text-[#2dd4bf]'
                }`}>
                  {kpis?.cancellation_rate !== null && kpis?.cancellation_rate !== undefined
                    ? `${Number(kpis.cancellation_rate).toFixed(1)}%`
                    : '0.0%'}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* 4. TRUST INTELLIGENCE & RECENT REVIEWS (2 EQUAL COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Column: Trust Engine Explanations & Evidence */}
          <div className="theme-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-[#6d5dfc]/15 text-[#6d5dfc] border border-[#6d5dfc]/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Explainable Trust Signals</h3>
                    <p className="text-xs text-[#a9b0d0]">Machine Learning SHAP Attribution</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  kpis?.data_source === 'real'
                    ? 'bg-[#2dd4bf]/15 text-[#2dd4bf] border-[#2dd4bf]/30'
                    : kpis?.data_source === 'hybrid'
                      ? 'bg-[#6d5dfc]/15 text-[#6d5dfc] border-[#6d5dfc]/30'
                      : 'bg-[#fbbf24]/15 text-[#fbbf24] border-[#fbbf24]/30'
                }`}>
                  {kpis?.data_source || 'synthetic'} Evidence
                </span>
              </div>

              {/* Human-Readable Evidence Note */}
              <div className="p-3.5 rounded-xl bg-[#1c2036] border border-[#363d66] text-xs text-[#a9b0d0] leading-relaxed mb-4">
                <span className="font-bold text-white block mb-1">Evidence Summary:</span>
                {kpis?.evidence_note || 'Baseline scoring active until real transactions are verified.'}
              </div>

              {/* Top SHAP Contributing Factors */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9b0d0] block">
                  Top Influencing Signals:
                </span>
                {Array.isArray(kpis?.shap_factors) && kpis.shap_factors.length > 0 ? (
                  kpis.shap_factors.slice(0, 4).map((f, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-2 rounded-lg bg-[#1c2036]/60 border border-[#363d66]/50 text-xs"
                    >
                      <span className="text-[#f1f3ff] truncate mr-2">{f.description}</span>
                      <span className={`font-bold shrink-0 ${f.type === 'positive' ? 'text-[#2dd4bf]' : 'text-rose-400'}`}>
                        {f.impact > 0 ? `+${f.impact}` : f.impact} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#a9b0d0] py-2">
                    SHAP feature attribution factors will generate upon initial booking recalculation.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#363d66]/50 mt-4 text-[11px] text-[#a9b0d0] flex items-center justify-between">
              <span>Model: GradientBoostingRegressor</span>
              <span>Updated automatically per completion</span>
            </div>
          </div>

          {/* Right Column: Community Reviews & Ratings */}
          <div className="theme-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30">
                    <Star className="w-4 h-4 fill-[#fbbf24]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Community Feedback</h3>
                    <p className="text-xs text-[#a9b0d0]">Verified customer ratings & NLP sentiment</p>
                  </div>
                </div>

                {kpis?.avg_rating !== null && kpis?.avg_rating !== undefined ? (
                  <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#fbbf24]/15 rounded-xl border border-[#fbbf24]/30 text-[#fbbf24] font-bold text-xs">
                    <Star className="w-3.5 h-3.5 fill-[#fbbf24]" />
                    <span>{kpis.avg_rating} / 5.0</span>
                    <span className="text-[10px] text-[#a9b0d0]">({kpis.reviews_count})</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#a9b0d0] italic">No reviews yet</span>
                )}
              </div>

              {/* Reviews List */}
              {recent_reviews && recent_reviews.length > 0 ? (
                <div className="space-y-3">
                  {recent_reviews.map((r) => (
                    <div key={r.id} className="p-3.5 rounded-xl bg-[#1c2036] border border-[#363d66] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{r.customer_name}</span>
                        <div className="flex items-center space-x-1 text-[#fbbf24] font-bold">
                          <span>{r.rating}</span>
                          <Star className="w-3 h-3 fill-[#fbbf24]" />
                        </div>
                      </div>
                      <p className="text-[#a9b0d0] italic">"{r.review_text}"</p>
                      <div className="flex items-center justify-between text-[10px] text-[#a9b0d0] pt-1">
                        <span>{r.service_title}</span>
                        <span>{r.created_at}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-[#a9b0d0] bg-[#1c2036]/50 rounded-2xl border border-dashed border-[#363d66]">
                  <MessageSquare className="w-8 h-8 text-[#6d5dfc] mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-white">Zero Customer Reviews on File</p>
                  <p className="mt-1">Completed bookings will automatically invite customers to rate your workmanship.</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#363d66]/50 mt-4 flex items-center justify-between text-xs">
              <span className="text-[#a9b0d0] text-[11px]">Filtered for authentic verified customers only</span>
              <Link 
                to="/bookings" 
                className="text-xs font-bold text-[#6d5dfc] hover:text-[#d946ef] transition-colors flex items-center space-x-1"
              >
                <span>View Job Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProviderDashboard;

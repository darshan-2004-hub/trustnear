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
  ChevronRight,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Sliders,
  Activity,
  Check,
  X,
  Eye,
  Info
} from 'lucide-react';

const ProviderDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeChart, setActiveChart] = useState('earnings'); // 'earnings' | 'trend'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'portfolio' | 'availability'

  // Portfolio state
  const [portfolioList, setPortfolioList] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [portfolioForm, setPortfolioForm] = useState({
    title: '',
    service_category: '',
    description: '',
    completion_date: '',
    before_image_url: '',
    after_image_url: '',
    authorized_for_display: true
  });
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [portfolioMessage, setPortfolioMessage] = useState(null);
  const [portfolioSubmitting, setPortfolioSubmitting] = useState(false);

  // Availability state
  const [availabilityData, setAvailabilityData] = useState({
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daily_start_time: '09:00',
    daily_end_time: '18:00',
    slot_duration_minutes: 60,
    unavailable_dates: [],
    is_accepting_bookings: true
  });
  const [availLoading, setAvailLoading] = useState(false);
  const [availSaving, setAvailSaving] = useState(false);
  const [availMessage, setAvailMessage] = useState(null);
  const [newUnavailableDate, setNewUnavailableDate] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const resolveImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
  };

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

  const fetchPortfolio = async () => {
    const provId = user?.id;
    if (!provId) return;
    setPortfolioLoading(true);
    try {
      const res = await api.get(`/providers/${provId}/portfolio`);
      if (res.data?.success) {
        setPortfolioList(res.data.portfolio || []);
      }
    } catch (err) {
      console.error('Could not fetch portfolio:', err);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const fetchAvailability = async () => {
    const provId = user?.id;
    if (!provId) return;
    setAvailLoading(true);
    try {
      const res = await api.get(`/providers/${provId}/availability`);
      if (res.data?.success && res.data.availability) {
        setAvailabilityData(res.data.availability);
      }
    } catch (err) {
      console.error('Could not fetch availability:', err);
    } finally {
      setAvailLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchPortfolio();
    fetchAvailability();
  }, [user]);

  // Image upload helper
  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPortfolioMessage({ type: 'error', text: 'File size exceeds maximum limit of 5MB.' });
      return;
    }

    const setUploading = field === 'before_image_url' ? setUploadingBefore : setUploadingAfter;
    setUploading(true);
    setPortfolioMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/providers/portfolio/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success && res.data.image_url) {
        setPortfolioForm((prev) => ({ ...prev, [field]: res.data.image_url }));
        setPortfolioMessage({ type: 'success', text: 'Image uploaded successfully.' });
      }
    } catch (err) {
      setPortfolioMessage({ type: 'error', text: err.response?.data?.message || 'Failed to upload image.' });
    } finally {
      setUploading(false);
    }
  };

  const openAddPortfolioModal = () => {
    setEditingItem(null);
    setPortfolioForm({
      title: '',
      service_category: dashboardData?.profile?.service_category || '',
      description: '',
      completion_date: new Date().toISOString().split('T')[0],
      before_image_url: '',
      after_image_url: '',
      authorized_for_display: true
    });
    setPortfolioMessage(null);
    setPortfolioModalOpen(true);
  };

  const openEditPortfolioModal = (item) => {
    setEditingItem(item);
    setPortfolioForm({
      title: item.title,
      service_category: item.service_category,
      description: item.description,
      completion_date: item.completion_date,
      before_image_url: item.before_image_url || '',
      after_image_url: item.after_image_url || '',
      authorized_for_display: item.authorized_for_display !== false
    });
    setPortfolioMessage(null);
    setPortfolioModalOpen(true);
  };

  const handleSavePortfolio = async (e) => {
    e.preventDefault();
    if (!portfolioForm.title.trim() || !portfolioForm.service_category.trim() || !portfolioForm.description.trim() || !portfolioForm.completion_date) {
      setPortfolioMessage({ type: 'error', text: 'Please fill in all required portfolio fields.' });
      return;
    }

    if (!portfolioForm.authorized_for_display) {
      setPortfolioMessage({ type: 'error', text: 'You must check the authorization confirmation.' });
      return;
    }

    setPortfolioSubmitting(true);
    setPortfolioMessage(null);

    try {
      if (editingItem) {
        const res = await api.put(`/providers/portfolio/${editingItem.id}`, portfolioForm);
        if (res.data?.success) {
          fetchPortfolio();
          setPortfolioModalOpen(false);
        }
      } else {
        const res = await api.post('/providers/portfolio', portfolioForm);
        if (res.data?.success) {
          fetchPortfolio();
          setPortfolioModalOpen(false);
        }
      }
    } catch (err) {
      setPortfolioMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save portfolio item.' });
    } finally {
      setPortfolioSubmitting(false);
    }
  };

  const handleDeletePortfolio = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this portfolio showcase item?')) return;
    try {
      const res = await api.delete(`/providers/portfolio/${itemId}`);
      if (res.data?.success) {
        fetchPortfolio();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete portfolio item.');
    }
  };

  // Availability Save
  const handleSaveAvailability = async () => {
    setAvailSaving(true);
    setAvailMessage(null);
    try {
      const res = await api.put('/providers/availability', availabilityData);
      if (res.data?.success) {
        setAvailMessage({ type: 'success', text: 'Availability and slot settings updated successfully.' });
      }
    } catch (err) {
      setAvailMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update availability.' });
    } finally {
      setAvailSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-[#172033] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Skeleton Header */}
          <div className="h-20 glass-card rounded-2xl animate-pulse" />
          
          {/* Skeleton KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 glass-card rounded-2xl animate-pulse" />
            ))}
          </div>

          {/* Skeleton Chart & Diagnostics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 h-80 glass-card rounded-2xl animate-pulse" />
            <div className="lg:col-span-4 h-80 glass-card rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen text-[#172033] py-16 px-4 flex items-center justify-center">
        <div className="glass-panel rounded-2xl border border-rose-200 max-w-md w-full p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#172033] mb-2">Provider Analytics Unavailable</h2>
          <p className="text-xs text-[#475569] mb-6">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-2 btn-secondary rounded-xl text-xs font-semibold cursor-pointer"
            >
              Back Home
            </button>
            <button
              onClick={fetchDashboardData}
              className="flex-1 py-2 btn-primary rounded-xl text-xs font-semibold cursor-pointer"
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
    <div className="min-h-screen text-[#172033] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. TOP PROFILE & SUMMARY BANNER */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-sky-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md">
              {profile?.full_name?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#172033]">{profile?.full_name}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  {profile?.verification_status || 'verified'}
                </span>
              </div>
              <p className="text-xs text-[#475569] mt-0.5 flex flex-wrap items-center gap-x-2">
                <span className="text-emerald-700 font-bold">{profile?.service_category}</span>
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
              className="p-2.5 rounded-xl border border-emerald-200 bg-white/90 hover:bg-emerald-50 text-emerald-700 transition cursor-pointer shadow-2xs"
              title="Refresh Analytics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              to="/bookings"
              className="btn-primary flex-1 md:flex-none px-4 py-2.5 text-xs font-bold flex items-center justify-center space-x-2 shadow-sm rounded-xl cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Open Job Queue</span>
              {kpis?.pending_requests > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black animate-pulse">
                  {kpis.pending_requests}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* TAB NAVIGATION: Overview vs Portfolio vs Availability */}
        <div className="flex items-center space-x-2 border-b border-emerald-200/70 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-emerald-600 to-sky-600 text-white shadow-sm'
                : 'bg-white/90 text-[#475569] hover:text-emerald-800 border border-emerald-200/70'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Overview & Performance</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'portfolio'
                ? 'bg-gradient-to-r from-emerald-600 to-sky-600 text-white shadow-sm'
                : 'bg-white/90 text-[#475569] hover:text-emerald-800 border border-emerald-200/70'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Work Portfolio ({portfolioList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'availability'
                ? 'bg-gradient-to-r from-emerald-600 to-sky-600 text-white shadow-sm'
                : 'bg-white/90 text-[#475569] hover:text-emerald-800 border border-emerald-200/70'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Availability & Schedule</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW & PERFORMANCE */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* 2. OVERVIEW KPI CARDS (6 CARDS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Card 1: Total Completed Earnings */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-blue-700 uppercase tracking-wider mb-2">
              <span>TOTAL EARNINGS</span>
              <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#172033] flex items-center">
                <IndianRupee className="w-4 h-4 text-blue-600 inline" />
                {Number(kpis?.total_earnings || 0).toFixed(0)}
              </p>
              <span className="text-[10px] text-[#475569] mt-1 block">
                From {kpis?.completed_jobs || 0} delivered jobs
              </span>
            </div>
          </div>

          {/* Card 2: Total Bookings */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-[#475569] uppercase tracking-wider mb-2">
              <span>TOTAL BOOKINGS</span>
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#172033]">{kpis?.total_bookings || 0}</p>
              <span className="text-[10px] text-[#475569] mt-1 block">Lifetime appointments</span>
            </div>
          </div>

          {/* Card 3: Pending Requests */}
          <div className="bg-white rounded-2xl border border-amber-200 p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-700 uppercase tracking-wider mb-2">
              <span>PENDING REQUESTS</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-amber-600">{kpis?.pending_requests || 0}</p>
              <span className="text-[10px] text-[#475569] mt-1 block">Awaiting your response</span>
            </div>
          </div>

          {/* Card 4: Active Jobs */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-blue-700 uppercase tracking-wider mb-2">
              <span>ACTIVE JOBS</span>
              <Zap className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#172033]">{kpis?.active_jobs || 0}</p>
              <span className="text-[10px] text-[#475569] mt-1 block">Accepted or in progress</span>
            </div>
          </div>

          {/* Card 5: Completed Jobs */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider mb-2">
              <span>COMPLETED JOBS</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#172033]">{kpis?.completed_jobs || 0}</p>
              <span className="text-[10px] text-[#475569] mt-1 block">Verified delivered</span>
            </div>
          </div>

          {/* Card 6: Actual ML Trust Score */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-blue-700 uppercase tracking-wider mb-2">
              <span>ML TRUST SCORE</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              {kpis?.trust_score !== null && kpis?.trust_score !== undefined ? (
                <>
                  <p className="text-2xl font-black text-blue-600">
                    {Number(kpis.trust_score).toFixed(1)} <span className="text-[11px] font-normal text-[#475569]">/ 100</span>
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
                  <p className="text-base font-bold text-amber-600">Unavailable</p>
                  <span className="text-[9px] text-[#475569] block mt-0.5">
                    Pending verified jobs
                  </span>
                </>
              )}
            </div>
          </div>

        </div>

        {/* STAGE 5: TRANSPARENT RELIABILITY BREAKDOWN CARD */}
        {kpis?.reliability && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#e2e8f0]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#172033]">Provider Reliability & Attendance Indicator</h3>
                  <p className="text-xs text-[#475569]">
                    Transparent metric derived strictly from genuine fulfillment records (distinct from ML Trust Score).
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                kpis.reliability.status_label === 'High Reliability'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : kpis.reliability.status_label === 'Moderate Reliability'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : kpis.reliability.status_label === 'Needs Improvement'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {kpis.reliability.status_label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-[#475569] uppercase">Fulfillment Rate</span>
                <div className="mt-1">
                  {kpis.reliability.reliability_rate !== null ? (
                    <p className="text-3xl font-black text-emerald-600">
                      {kpis.reliability.reliability_rate}%
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-amber-600">Building History</p>
                  )}
                  <span className="text-[10px] text-[#475569]">Min. 3 events required</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase">Completed Bookings</span>
                <p className="text-3xl font-black text-emerald-700 mt-1">
                  {kpis.reliability.breakdown?.completed_bookings || 0}
                </p>
                <span className="text-[10px] text-emerald-600 font-medium">+100% positive fulfillment</span>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-rose-800 uppercase">Provider Cancellations</span>
                <p className="text-3xl font-black text-rose-700 mt-1">
                  {kpis.reliability.breakdown?.provider_cancellations || 0}
                </p>
                <span className="text-[10px] text-rose-600 font-medium">Provider-initiated cancellations</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#475569] uppercase">Confirmed No-Shows</span>
                  {kpis.reliability.breakdown?.reported_no_shows > 0 && (
                    <span className="text-[10px] font-bold text-amber-600">
                      ({kpis.reliability.breakdown.reported_no_shows} pending)
                    </span>
                  )}
                </div>
                <p className="text-3xl font-black text-[#172033] mt-1">
                  {kpis.reliability.breakdown?.confirmed_no_shows || 0}
                </p>
                <span className="text-[10px] text-[#475569]">Admin verified only</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-800 flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Fair Policy Guarantee:</strong> Customer-initiated cancellations ({kpis.reliability.breakdown?.customer_cancellations || 0}) do <em>not</em> penalize your reliability score. Only cancellations initiated from your portal or confirmed no-shows affect this metric.
              </p>
            </div>
          </div>
        )}

        {/* 3. CHARTS & STATUS DISTRIBUTION (12 COLS GRID) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Interactive Monthly Charts (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e2e8f0] p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#172033] flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span>Monthly Operational Analytics</span>
                  </h3>
                  <p className="text-xs text-[#475569] mt-0.5">
                    {activeChart === 'earnings'
                      ? 'Gross revenue derived strictly from completed bookings in INR.'
                      : 'Monthly service request volume and completion velocity.'}
                  </p>
                </div>

                {/* Chart Toggle Tabs */}
                <div className="flex items-center space-x-1 bg-emerald-50/70 p-1 rounded-xl border border-emerald-200 text-xs">
                  <button
                    onClick={() => setActiveChart('earnings')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      activeChart === 'earnings'
                        ? 'bg-gradient-to-r from-emerald-600 to-sky-600 text-white shadow-xs'
                        : 'text-[#475569] hover:text-emerald-800'
                    }`}
                  >
                    Earnings (₹)
                  </button>
                  <button
                    onClick={() => setActiveChart('trend')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      activeChart === 'trend'
                        ? 'bg-gradient-to-r from-emerald-600 to-sky-600 text-white shadow-xs'
                        : 'text-[#475569] hover:text-emerald-800'
                    }`}
                  >
                    Booking Volume
                  </button>
                </div>
              </div>

              {/* Responsive SVG Bar Chart */}
              {monthlySeries.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-xs text-[#475569]">
                  No historical booking records found.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2 border-b border-emerald-100">
                    {monthlySeries.map((m) => {
                      const value = activeChart === 'earnings' ? m.earnings : m.total_bookings;
                      const maxVal = activeChart === 'earnings' ? maxEarnings : maxBookings;
                      const heightPercent = Math.max(8, Math.round((value / maxVal) * 100));

                      return (
                        <div key={m.month_key} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          {/* Tooltip on Hover */}
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[#064e3b] border border-emerald-700 px-2.5 py-1 rounded-lg text-[10px] text-white font-bold whitespace-nowrap z-20 shadow-xl">
                            {activeChart === 'earnings'
                              ? `₹${m.earnings.toFixed(0)} (${m.completed_count} completed)`
                              : `${m.total_bookings} total (${m.completed_count} completed, ${m.cancelled_count} cancelled)`}
                          </div>

                          {/* Top value label */}
                          <span className="text-[10px] font-bold text-[#475569] mb-1.5 opacity-80 group-hover:text-[#172033]">
                            {activeChart === 'earnings' ? (value > 0 ? `₹${value.toFixed(0)}` : '0') : value}
                          </span>

                          {/* Bar */}
                          <div className="w-full max-w-[48px] bg-emerald-50/70 rounded-t-xl overflow-hidden p-0.5 border border-emerald-100">
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className={`w-full rounded-t-lg transition-all duration-500 ${
                                activeChart === 'earnings'
                                  ? value > 0
                                    ? 'bg-gradient-to-t from-emerald-600 to-teal-500'
                                    : 'bg-slate-300'
                                  : value > 0
                                    ? 'bg-gradient-to-t from-sky-600 to-cyan-500'
                                    : 'bg-slate-300'
                              }`}
                            />
                          </div>

                          {/* Month Label */}
                          <span className="text-[11px] font-semibold text-[#475569] mt-3 whitespace-nowrap">
                            {m.short_month}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#475569] pt-2">
                    <span className="flex items-center space-x-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${activeChart === 'earnings' ? 'bg-emerald-600' : 'bg-sky-600'}`} />
                      <span>{activeChart === 'earnings' ? 'Gross verified earnings' : 'Total customer job requests'}</span>
                    </span>
                    <span className="text-[10px] font-medium">Real transaction records</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Status Distribution & Performance Diagnostics (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Status Distribution Card */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-base font-bold text-[#172033] mb-1">Booking Status Breakdown</h3>
              <p className="text-xs text-[#475569] mb-4">Distribution across current request lifecycle</p>

              {/* Segmented Distribution Bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex mb-4 border border-emerald-100">
                <div 
                  style={{ width: `${statusDist.percentages?.completed || 0}%` }} 
                  className="bg-emerald-500" 
                  title={`Completed: ${statusDist.percentages?.completed || 0}%`} 
                />
                <div 
                  style={{ width: `${statusDist.percentages?.active || 0}%` }} 
                  className="bg-sky-600" 
                  title={`Active: ${statusDist.percentages?.active || 0}%`} 
                />
                <div 
                  style={{ width: `${statusDist.percentages?.pending || 0}%` }} 
                  className="bg-amber-500" 
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
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <span className="flex items-center space-x-2 text-[#172033]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-medium">Completed</span>
                  </span>
                  <span className="font-bold text-[#172033]">
                    {statusDist.completed || 0} ({statusDist.percentages?.completed || 0}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50/50 border border-sky-100">
                  <span className="flex items-center space-x-2 text-[#172033]">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0" />
                    <span className="font-medium">Active / In Progress</span>
                  </span>
                  <span className="font-bold text-[#172033]">
                    {statusDist.active || 0} ({statusDist.percentages?.active || 0}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                  <span className="flex items-center space-x-2 text-[#172033]">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-medium">Pending Requests</span>
                  </span>
                  <span className="font-bold text-amber-700">
                    {statusDist.pending || 0} ({statusDist.percentages?.pending || 0}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                  <span className="flex items-center space-x-2 text-[#172033]">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-medium">Cancelled</span>
                  </span>
                  <span className="font-bold text-rose-600">
                    {statusDist.cancelled || 0} ({statusDist.percentages?.cancelled || 0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Response & Cancellation Diagnostics */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-4 shadow-sm">
              <h4 className="text-sm font-bold text-[#475569] uppercase tracking-wider text-[11px]">
                Operational Metrics
              </h4>

              {/* Response Speed */}
              <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-[#475569]">Average Response Speed</span>
                </div>
                <span className="text-xs font-bold text-[#172033]">
                  {kpis?.avg_response_minutes !== null && kpis?.avg_response_minutes !== undefined ? (
                    `${kpis.avg_response_minutes} minutes`
                  ) : (
                    <span className="text-[#475569] italic">~20m (Benchmark)</span>
                  )}
                </span>
              </div>

              {/* Cancellation Rate */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-[#475569]">Cancellation Rate</span>
                </div>
                <span className={`text-xs font-bold ${
                  (kpis?.cancellation_rate || 0) > 15 ? 'text-rose-600' : 'text-emerald-700'
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
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#172033]">Explainable Trust Signals</h3>
                    <p className="text-xs text-[#475569]">Machine Learning SHAP Attribution</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  kpis?.data_source === 'real'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : kpis?.data_source === 'hybrid'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {kpis?.data_source || 'synthetic'} Evidence
                </span>
              </div>

              {/* Human-Readable Evidence Note */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-[#e2e8f0] text-xs text-[#475569] leading-relaxed mb-4">
                <span className="font-bold text-[#172033] block mb-1">Evidence Summary:</span>
                {kpis?.evidence_note || 'Baseline scoring active until real transactions are verified.'}
              </div>

              {/* Top SHAP Contributing Factors */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569] block">
                  Top Influencing Signals:
                </span>
                {Array.isArray(kpis?.shap_factors) && kpis.shap_factors.length > 0 ? (
                  kpis.shap_factors.slice(0, 4).map((f, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-[#e2e8f0] text-xs"
                    >
                      <span className="text-[#172033] truncate mr-2 font-medium">{f.description}</span>
                      <span className={`font-bold shrink-0 ${f.type === 'positive' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {f.impact > 0 ? `+${f.impact}` : f.impact} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#475569] py-2">
                    SHAP feature attribution factors will generate upon initial booking recalculation.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#e2e8f0] mt-4 text-[11px] text-[#475569] flex items-center justify-between">
              <span>Model: GradientBoostingRegressor</span>
              <span>Updated automatically per completion</span>
            </div>
          </div>

          {/* Right Column: Community Reviews & Ratings */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-500 border border-amber-200">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#172033]">Community Feedback</h3>
                    <p className="text-xs text-[#475569]">Verified customer ratings & NLP sentiment</p>
                  </div>
                </div>

                {kpis?.avg_rating !== null && kpis?.avg_rating !== undefined ? (
                  <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 font-bold text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{kpis.avg_rating} / 5.0</span>
                    <span className="text-[10px] text-[#475569]">({kpis.reviews_count})</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#475569] italic">No reviews yet</span>
                )}
              </div>

              {/* Reviews List */}
              {recent_reviews && recent_reviews.length > 0 ? (
                <div className="space-y-3">
                  {recent_reviews.map((r) => (
                    <div key={r.id} className="p-3.5 rounded-xl bg-slate-50 border border-[#e2e8f0] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#172033]">{r.customer_name}</span>
                        <div className="flex items-center space-x-1 text-amber-500 font-bold">
                          <span>{r.rating}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>
                      </div>
                      <p className="text-[#475569] italic">"{r.review_text}"</p>
                      <div className="flex items-center justify-between text-[10px] text-[#475569] pt-1 border-t border-[#e2e8f0]/60">
                        <span>{r.service_title}</span>
                        <span>{r.created_at}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-[#475569] bg-slate-50 rounded-2xl border border-dashed border-[#e2e8f0]">
                  <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-[#172033]">Zero Customer Reviews on File</p>
                  <p className="mt-1">Completed bookings will automatically invite customers to rate your workmanship.</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#e2e8f0] mt-4 flex items-center justify-between text-xs">
              <span className="text-[#475569] text-[11px]">Filtered for authentic verified customers only</span>
              <Link 
                to="/bookings" 
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
              >
                <span>View Job Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    )}

    {/* ======================================================== */}
    {/* TAB 2: WORK PORTFOLIO SHOWCASE */}
    {/* ======================================================== */}
    {activeTab === 'portfolio' && (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
            <div>
              <h3 className="text-base font-bold text-[#172033] flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                <span>Showcase Your Previous Work</span>
              </h3>
              <p className="text-xs text-[#475569] mt-0.5">
                Upload verified previous work with Before and After photos to build trust and attract prospective customers.
              </p>
            </div>
            <button
              onClick={openAddPortfolioModal}
              className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Project Showcase</span>
            </button>
          </div>

          {portfolioLoading ? (
            <div className="py-12 text-center text-xs text-[#475569] animate-pulse">
              Loading your portfolio items...
            </div>
          ) : portfolioList.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#475569] bg-slate-50 rounded-2xl border border-dashed border-[#e2e8f0] mt-6">
              <ImageIcon className="w-10 h-10 text-blue-600 mx-auto mb-2 opacity-50" />
              <p className="font-bold text-base text-[#172033]">No Portfolio Items Added Yet</p>
              <p className="mt-1 max-w-sm mx-auto">
                Providers with past work showcases receive significantly higher customer bookings.
              </p>
              <button
                onClick={openAddPortfolioModal}
                className="mt-4 btn-primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Showcase</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {portfolioList.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors">
                  <div>
                    {/* Before/After preview images */}
                    {item.before_image_url || item.after_image_url ? (
                      <div className="grid grid-cols-2 gap-1 p-2 bg-slate-100">
                        {item.before_image_url ? (
                          <div
                            className="relative aspect-4/3 rounded-lg overflow-hidden cursor-pointer group bg-white border border-[#e2e8f0]"
                            onClick={() => setPreviewImage({ url: resolveImageUrl(item.before_image_url), label: `${item.title} - Before` })}
                          >
                            <img
                              src={resolveImageUrl(item.before_image_url)}
                              alt="Before"
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <span className="absolute top-1 left-1 bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow">
                              BEFORE
                            </span>
                            <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-4/3 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] text-[#475569]">
                            No Before Photo
                          </div>
                        )}

                        {item.after_image_url ? (
                          <div
                            className="relative aspect-4/3 rounded-lg overflow-hidden cursor-pointer group bg-white border border-[#e2e8f0]"
                            onClick={() => setPreviewImage({ url: resolveImageUrl(item.after_image_url), label: `${item.title} - After` })}
                          >
                            <img
                              src={resolveImageUrl(item.after_image_url)}
                              alt="After"
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow">
                              AFTER
                            </span>
                            <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-4/3 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] text-[#475569]">
                            No After Photo
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 bg-slate-100 flex items-center justify-center text-xs text-[#475569]">
                        <ImageIcon className="w-6 h-6 mr-1.5 text-slate-400" />
                        <span>No images uploaded</span>
                      </div>
                    )}

                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {item.service_category}
                        </span>
                        <span className="text-[10px] text-[#475569]">
                          {item.completion_date}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#172033] line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-[#475569] line-clamp-3 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-2 border-t border-[#e2e8f0] flex items-center justify-end space-x-2">
                    <button
                      onClick={() => openEditPortfolioModal(item)}
                      className="px-3 py-1.5 rounded-xl border border-[#e2e8f0] bg-white hover:bg-slate-50 text-xs font-semibold text-[#172033] inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeletePortfolio(item.id)}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

    {/* ======================================================== */}
    {/* TAB 3: AVAILABILITY & WORKING HOURS */}
    {/* ======================================================== */}
    {activeTab === 'availability' && (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
            <div>
              <h3 className="text-base font-bold text-[#172033] flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Working Schedule & Slot Settings</span>
              </h3>
              <p className="text-xs text-[#475569] mt-0.5">
                Configure your operating hours, working days, and slot increments to prevent overlapping appointments.
              </p>
            </div>
            <button
              onClick={handleSaveAvailability}
              disabled={availSaving}
              className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{availSaving ? 'Saving...' : 'Save Schedule Settings'}</span>
            </button>
          </div>

          {availMessage && (
            <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
              availMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {availMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{availMessage.text}</span>
            </div>
          )}

          {/* Toggle: Accepting Bookings */}
          <div className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#172033]">Accept New Bookings</h4>
              <p className="text-xs text-[#475569]">
                Temporarily pause new customer booking requests when taking time off.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={availabilityData.is_accepting_bookings}
                onChange={(e) => setAvailabilityData({ ...availabilityData, is_accepting_bookings: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Daily Operating Hours & Slot Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                Daily Start Time
              </label>
              <input
                type="time"
                value={availabilityData.daily_start_time}
                onChange={(e) => setAvailabilityData({ ...availabilityData, daily_start_time: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                Daily End Time
              </label>
              <input
                type="time"
                value={availabilityData.daily_end_time}
                onChange={(e) => setAvailabilityData({ ...availabilityData, daily_end_time: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                Appointment Slot Duration
              </label>
              <select
                value={availabilityData.slot_duration_minutes}
                onChange={(e) => setAvailabilityData({ ...availabilityData, slot_duration_minutes: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] focus:outline-none focus:border-blue-600"
              >
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes (Standard)</option>
                <option value={90}>90 Minutes</option>
                <option value={120}>120 Minutes (2 Hours)</option>
              </select>
            </div>
          </div>

          {/* Working Days Checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase mb-2">
              Working Days of the Week
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const isChecked = (availabilityData.working_days || []).includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const current = availabilityData.working_days || [];
                      const updated = isChecked ? current.filter((d) => d !== day) : [...current, day];
                      setAvailabilityData({ ...availabilityData, working_days: updated });
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      isChecked
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-[#475569] border-[#e2e8f0] hover:bg-slate-50'
                    }`}
                  >
                    <span>{day.slice(0, 3)}</span>
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Unavailable Dates */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
              Specific Unavailable Dates (Holidays / Personal Days Off)
            </label>
            <div className="flex space-x-2 max-w-md">
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={newUnavailableDate}
                onChange={(e) => setNewUnavailableDate(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-white border border-[#e2e8f0] rounded-xl text-xs text-[#172033] focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newUnavailableDate) return;
                  const current = availabilityData.unavailable_dates || [];
                  if (!current.includes(newUnavailableDate)) {
                    setAvailabilityData({
                      ...availabilityData,
                      unavailable_dates: [...current, newUnavailableDate].sort()
                    });
                  }
                  setNewUnavailableDate('');
                }}
                className="btn-secondary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Add Date
              </button>
            </div>

            {availabilityData.unavailable_dates && availabilityData.unavailable_dates.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {availabilityData.unavailable_dates.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold"
                  >
                    <span>{d}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAvailabilityData({
                          ...availabilityData,
                          unavailable_dates: availabilityData.unavailable_dates.filter((ud) => ud !== d)
                        });
                      }}
                      className="text-amber-700 hover:text-amber-900 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ======================================================== */}
    {/* PORTFOLIO ADD / EDIT MODAL */}
    {/* ======================================================== */}
    {portfolioModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#e2e8f0] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
            <h3 className="text-base font-bold text-[#172033]">
              {editingItem ? 'Edit Project Showcase' : 'Add Past Project Showcase'}
            </h3>
            <button
              onClick={() => setPortfolioModalOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 text-[#475569] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {portfolioMessage && (
            <div className={`mt-3 p-3 rounded-xl border text-xs flex items-center space-x-2 ${
              portfolioMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {portfolioMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{portfolioMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSavePortfolio} className="space-y-4 mt-4 text-xs">
            <div>
              <label className="block font-semibold text-[#475569] uppercase mb-1">
                Project Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={portfolioForm.title}
                onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                placeholder="e.g. Master Bathroom Copper Re-piping"
                className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#475569] uppercase mb-1">
                  Service Category <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={portfolioForm.service_category}
                  onChange={(e) => setPortfolioForm({ ...portfolioForm, service_category: e.target.value })}
                  placeholder="e.g. Plumbing"
                  className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#475569] uppercase mb-1">
                  Completion Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={portfolioForm.completion_date}
                  onChange={(e) => setPortfolioForm({ ...portfolioForm, completion_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#475569] uppercase mb-1">
                Project Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows="3"
                required
                value={portfolioForm.description}
                onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                placeholder="Describe the scope of work, problems solved, and techniques used..."
                className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Before and After Image Uploads */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-[#e2e8f0]">
                <span className="font-bold text-[#172033] block mb-1">Before-Work Photo</span>
                {portfolioForm.before_image_url ? (
                  <div className="relative aspect-4/3 rounded-lg overflow-hidden border border-[#e2e8f0] mb-2 bg-white">
                    <img
                      src={resolveImageUrl(portfolioForm.before_image_url)}
                      alt="Before Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPortfolioForm({ ...portfolioForm, before_image_url: '' })}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 rounded-lg p-3 text-center flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 mb-2">
                    <Upload className="w-4 h-4 text-slate-500 mb-1" />
                    <span className="text-[11px] text-slate-600 font-semibold">
                      {uploadingBefore ? 'Uploading...' : 'Upload Before Image'}
                    </span>
                    <span className="text-[9px] text-slate-400">JPG, PNG, WEBP (max 5MB)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleImageUpload(e, 'before_image_url')}
                      className="hidden"
                      disabled={uploadingBefore}
                    />
                  </label>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-[#e2e8f0]">
                <span className="font-bold text-[#172033] block mb-1">After-Work Photo</span>
                {portfolioForm.after_image_url ? (
                  <div className="relative aspect-4/3 rounded-lg overflow-hidden border border-[#e2e8f0] mb-2 bg-white">
                    <img
                      src={resolveImageUrl(portfolioForm.after_image_url)}
                      alt="After Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPortfolioForm({ ...portfolioForm, after_image_url: '' })}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 rounded-lg p-3 text-center flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 mb-2">
                    <Upload className="w-4 h-4 text-slate-500 mb-1" />
                    <span className="text-[11px] text-slate-600 font-semibold">
                      {uploadingAfter ? 'Uploading...' : 'Upload After Image'}
                    </span>
                    <span className="text-[9px] text-slate-400">JPG, PNG, WEBP (max 5MB)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleImageUpload(e, 'after_image_url')}
                      className="hidden"
                      disabled={uploadingAfter}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Authorization Checkbox */}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={portfolioForm.authorized_for_display}
                  onChange={(e) => setPortfolioForm({ ...portfolioForm, authorized_for_display: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[11px] text-blue-900 leading-tight">
                  I confirm that I performed this work and have client authorization to display these project details and photos publicly on my TrustNear profile.
                </span>
              </label>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setPortfolioModalOpen(false)}
                className="flex-1 py-2.5 btn-secondary rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={portfolioSubmitting}
                className="flex-1 py-2.5 btn-primary rounded-xl font-bold cursor-pointer disabled:opacity-50"
              >
                {portfolioSubmitting ? 'Saving...' : editingItem ? 'Update Project' : 'Publish Showcase'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Image Zoom Modal */}
    {previewImage && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs"
        onClick={() => setPreviewImage(null)}
      >
        <div
          className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-3 border-b border-[#e2e8f0]">
            <span className="text-xs font-bold text-[#172033]">{previewImage.label}</span>
            <button
              onClick={() => setPreviewImage(null)}
              className="p-1 rounded-lg hover:bg-slate-100 text-[#475569] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-h-[75vh] flex items-center justify-center p-2 bg-slate-950/5">
            <img
              src={previewImage.url}
              alt={previewImage.label}
              className="max-h-[70vh] w-auto object-contain rounded-lg"
            />
          </div>
        </div>
      </div>
    )}

  </div>
</div>
);
};

export default ProviderDashboard;

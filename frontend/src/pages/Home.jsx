import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Search, 
  Wrench, 
  Zap, 
  Hammer, 
  Sparkles, 
  Flame, 
  Paintbrush, 
  ShieldCheck, 
  Star, 
  Users, 
  Clock, 
  ArrowRight,
  CheckCircle2,
  User,
  ShieldAlert
} from 'lucide-react';

import ServiceCard from '../components/ServiceCard';
import ProviderCard from '../components/ProviderCard';
import BookingModal from '../components/BookingModal';
import ProviderReviewsModal from '../components/ProviderReviewsModal';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SERVICES = [
  { title: 'Plumbing', icon: Wrench, count: 'Pros Online', description: 'Leak repairs, pipe fitting & drainage solutions.', accent: 'emerald' },
  { title: 'Electrical', icon: Zap, count: 'Pros Online', description: 'Wiring, fixtures, circuit breakers & inspections.', accent: 'lime' },
  { title: 'Carpentry', icon: Hammer, count: 'Pros Online', description: 'Custom woodwork, door locks & repairs.', accent: 'sky' },
  { title: 'Cleaning', icon: Sparkles, count: 'Pros Online', description: 'Deep cleaning, sanitization & floor scrubbing.', accent: 'cyan' },
  { title: 'Appliance Repair', icon: Flame, count: 'Pros Online', description: 'AC service, refrigerator & washing machine repairs.', accent: 'amber' },
  { title: 'Painting', icon: Paintbrush, count: 'Pros Online', description: 'Interior/exterior wall painting & waterproofing.', accent: 'teal' },
];

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [topProviders, setTopProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [servicesList, setServicesList] = useState(DEFAULT_SERVICES);

  // REAL DATA STATS (Populated dynamically from MySQL via API)
  const [platformStats, setPlatformStats] = useState({
    totalCompletedJobs: 0,
    avgRating: null,
    onTimeRate: '—',
    totalProviders: 0,
  });

  // Modal states
  const [bookingProvider, setBookingProvider] = useState(null);
  const [reviewsProvider, setReviewsProvider] = useState(null);

  useEffect(() => {
    const fetchProvidersAndComputeStats = async () => {
      try {
        const response = await api.get('/providers');
        if (response.data?.success && Array.isArray(response.data.providers)) {
          const providersList = response.data.providers;

          // 1. Compute Top 3 Providers by Trust Score
          const sorted = [...providersList]
            .sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0))
            .slice(0, 3);
          setTopProviders(sorted);

          // 2. COMPUTE REAL DATABASE STATS:
          const totalJobs = providersList.reduce((acc, p) => acc + (p.completed_jobs || 0), 0);
          
          const validRatings = providersList.filter(p => p.rating && Number(p.rating) > 0);
          const computedAvgRating = validRatings.length > 0
            ? (validRatings.reduce((acc, p) => acc + parseFloat(p.rating), 0) / validRatings.length).toFixed(1)
            : null;

          const avgCancellation = providersList.length > 0
            ? providersList.reduce((acc, p) => acc + (parseFloat(p.cancellation_rate) || 0), 0) / providersList.length
            : 0;

          // Punctuality / on-time rate = (100 - cancellation_rate)%
          const computedOnTimeRate = providersList.length > 0
            ? `${Math.max(0, Math.min(100, Math.round(100 - avgCancellation)))}%`
            : '100%';

          setPlatformStats({
            totalCompletedJobs: totalJobs,
            avgRating: computedAvgRating,
            onTimeRate: computedOnTimeRate,
            totalProviders: providersList.length,
          });

          // 3. Make category pro counts dynamic based on real DB providers
          const updatedServices = DEFAULT_SERVICES.map(srv => {
            const count = providersList.filter(p => 
              p.service_category?.toLowerCase().includes(srv.title.toLowerCase().split(' ')[0])
            ).length;
            return {
              ...srv,
              count: count > 0 ? `${count} Verified Pro${count > 1 ? 's' : ''}` : 'Available Pro',
            };
          });
          setServicesList(updatedServices);

        }
      } catch (err) {
        console.warn('Real stats computation fallback:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProvidersAndComputeStats();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/providers?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/providers');
    }
  };

  const handleBook = (provider) => {
    if (!isAuthenticated) {
      const providerId = provider.user_id || provider.id;
      navigate('/login/customer', {
        state: {
          from: location.pathname,
          bookProviderId: providerId,
          returnToBooking: true,
        },
      });
      return;
    }
    setBookingProvider(provider);
  };

  return (
    <div className="min-h-screen text-[#172033] flex flex-col justify-between bg-tech-grid relative overflow-x-hidden">
      
      {/* Ambient Vivid Botanical Background Auroras */}
      <div className="aurora-glow-1 -top-24 left-1/4 pointer-events-none" />
      <div className="aurora-glow-2 top-[550px] -right-20 pointer-events-none" />
      <div className="aurora-glow-3 top-[1200px] -left-20 pointer-events-none" />
      <div className="aurora-glow-1 bottom-40 right-1/4 pointer-events-none" />

      {/* 1. HERO SECTION */}
      <div className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-white/70 via-emerald-50/35 to-transparent border-b border-emerald-200/70 backdrop-blur-xs relative z-10">
        <div className="absolute -top-16 -left-16 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-teal-300 text-emerald-700 text-xs font-bold mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
            <span>Next-Gen Smart Local Discovery with Explainable AI</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#172033] max-w-3xl mx-auto mb-6 leading-tight">
            Find people you can <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600">trust</span>, right near you
          </h1>

          <p className="text-base sm:text-lg text-[#475569] max-w-2xl mx-auto mb-10 font-normal">
            No more deceptive 5-star ratings. TrustNear evaluates real completed jobs, cancellation history, and fair market pricing with verifiable Machine Learning.
          </p>

          {/* Search Box */}
          <form 
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto relative flex items-center bg-white/95 border border-emerald-300/80 rounded-2xl p-2.5 shadow-xl shadow-sky-900/10 focus-within:border-emerald-600 focus-within:ring-3 focus-within:ring-emerald-500/20 transition-all mb-8"
          >
            <Search className="w-5 h-5 text-emerald-600 ml-3 mr-2 shrink-0" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by trade or problem (e.g., Electrician, AC Repair, Leaking Tap)"
              className="w-full bg-transparent text-[#172033] placeholder-slate-400 text-sm sm:text-base outline-none px-2 font-medium"
            />
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 text-white font-bold text-xs sm:text-sm flex items-center space-x-1.5 whitespace-nowrap shadow-md shadow-emerald-600/25 cursor-pointer transition-all"
            >
              <span>Explore</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* AUTHENTICATED USER QUICK ACTIONS */}
          {isAuthenticated && (
            <div className="max-w-2xl mx-auto mt-8 p-4 bg-white/90 backdrop-blur-xs rounded-2xl border border-emerald-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-[#172033]">{user?.full_name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {user?.role}
                    </span>
                  </div>
                  <p className="text-xs text-[#475569]">Session authenticated. Direct portal shortcuts below.</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {user?.role === 'provider' ? (
                  <button
                    onClick={() => navigate('/provider-dashboard')}
                    className="btn-primary py-2 px-4 text-xs font-bold w-full sm:w-auto flex items-center justify-center space-x-1"
                  >
                    <span>Provider Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : user?.role === 'admin' ? (
                  <button
                    onClick={() => navigate('/admin')}
                    className="btn-primary py-2 px-4 text-xs font-bold w-full sm:w-auto flex items-center justify-center space-x-1"
                  >
                    <span>Admin Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/bookings')}
                    className="btn-primary py-2 px-4 text-xs font-bold w-full sm:w-auto flex items-center justify-center space-x-1"
                  >
                    <span>My Bookings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 2. SIX SERVICE CARDS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-[#172033]">Popular Services</h2>
            <p className="text-xs text-[#475569] mt-0.5">Explore top requested services verified by our community</p>
          </div>
          <button 
            onClick={() => navigate('/providers')}
            className="text-xs font-bold text-emerald-700 hover:text-sky-700 transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span>View All Trades</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesList.map((srv) => (
            <ServiceCard
              key={srv.title}
              title={srv.title}
              icon={srv.icon}
              count={srv.count}
              description={srv.description}
              accent={srv.accent}
              onClick={() => navigate(`/providers?category=${encodeURIComponent(srv.title)}`)}
            />
          ))}
        </div>
      </div>

      {/* 3. GRADIENT STATS BAND (100% REAL DATABASE DATA) */}
      <div className="my-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="relative overflow-hidden rounded-3xl text-white p-8 md:p-12 dark-card-gradient border border-sky-400/40 shadow-2xl">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-sky-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-emerald-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/15 relative z-10">
            
            {/* Real Stat 1: Total Completed Jobs */}
            <div className="pt-4 md:pt-0">
              <div className="flex items-center justify-center space-x-2 text-sky-300 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Jobs Completed</span>
              </div>
              <p className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm">
                {platformStats.totalCompletedJobs}
              </p>
              <p className="text-xs text-emerald-100/90 mt-1 font-medium">
                Verified jobs across {platformStats.totalProviders} active providers in Mangaluru
              </p>
            </div>

            {/* Real Stat 2: Authentic Average Rating */}
            <div className="pt-4 md:pt-0">
              <div className="flex items-center justify-center space-x-2 text-amber-300 mb-2">
                <Star className="w-4 h-4 fill-amber-300" />
                <span className="text-xs font-bold uppercase tracking-widest">Community Rating</span>
              </div>
              <p className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm">
                {platformStats.avgRating ? `${platformStats.avgRating} / 5.0` : 'New Platform'}
              </p>
              <p className="text-xs text-emerald-100/90 mt-1 font-medium">
                Calculated from real NLP-screened reviews
              </p>
            </div>

            {/* Real Stat 3: Punctuality / Completion Rate */}
            <div className="pt-4 md:pt-0">
              <div className="flex items-center justify-center space-x-2 text-emerald-300 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Completion Rate</span>
              </div>
              <p className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm">
                {platformStats.onTimeRate}
              </p>
              <p className="text-xs text-emerald-100/90 mt-1 font-medium">
                Punctual arrival and low cancellation ratio
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* 4. THREE TOP-RATED PROVIDER CARDS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 w-full relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-black text-[#172033]">Top-Rated Providers</h2>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                AI Verified
              </span>
            </div>
            <p className="text-xs text-[#475569] mt-0.5">Highest ML Trust Scores in Mangaluru (Click Trust Badge for SHAP)</p>
          </div>
          <button 
            onClick={() => navigate('/providers')}
            className="text-xs font-bold text-emerald-700 hover:text-sky-700 transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span>View All Providers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card rounded-2xl p-6 h-64 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : topProviders.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-xs text-[#475569] shadow-sm">
            No verified providers currently listed in the database.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topProviders.map((provider) => (
              <ProviderCard
                key={provider.id || provider.user_id}
                provider={provider}
                onBook={handleBook}
                onViewReviews={(p) => setReviewsProvider(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="border-t border-emerald-200/70 bg-white/85 backdrop-blur-md py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#475569] gap-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-[#172033]">TrustNear Platform</span>
              <span>— Smart Local Discovery</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
              <Link to="/login/customer" className="hover:text-emerald-700 transition-colors">Customer Login</Link>
              <span className="text-slate-300">•</span>
              <Link to="/register/customer" className="hover:text-emerald-700 transition-colors">Customer Register</Link>
              <span className="text-slate-300">•</span>
              <Link to="/login/provider" className="hover:text-sky-700 transition-colors">Provider Login</Link>
              <span className="text-slate-300">•</span>
              <Link to="/register/provider" className="hover:text-sky-700 transition-colors">Provider Register</Link>
              <span className="text-slate-300">•</span>
              <Link to="/login/admin" className="text-teal-700 hover:text-teal-900 transition-colors font-medium">Admin Staff</Link>
            </div>

            <p>© TrustNear Autonomous Local Discovery</p>
          </div>
        </div>
      </footer>

      {/* POPUP MODAL 1: Booking Modal */}
      {bookingProvider && (
        <BookingModal
          provider={bookingProvider}
          onClose={() => setBookingProvider(null)}
          onSuccess={() => {
            setBookingProvider(null);
            navigate('/bookings');
          }}
        />
      )}

      {/* POPUP MODAL 2: Reviews Modal */}
      {reviewsProvider && (
        <ProviderReviewsModal
          provider={reviewsProvider}
          onClose={() => setReviewsProvider(null)}
        />
      )}

    </div>
  );
};

export default Home;

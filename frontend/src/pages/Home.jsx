import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  CheckCircle2
} from 'lucide-react';

import ServiceCard from '../components/ServiceCard';
import ProviderCard from '../components/ProviderCard';
import BookingModal from '../components/BookingModal';
import ProviderReviewsModal from '../components/ProviderReviewsModal';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SERVICES = [
  { title: 'Plumbing', icon: Wrench, count: 'Pros Online', description: 'Leak repairs, pipe fitting & drainage solutions.', accent: 'teal' },
  { title: 'Electrical', icon: Zap, count: 'Pros Online', description: 'Wiring, fixtures, circuit breakers & inspections.', accent: 'amber' },
  { title: 'Carpentry', icon: Hammer, count: 'Pros Online', description: 'Custom woodwork, door locks & repairs.', accent: 'violet' },
  { title: 'Cleaning', icon: Sparkles, count: 'Pros Online', description: 'Deep cleaning, sanitization & floor scrubbing.', accent: 'pink' },
  { title: 'Appliance Repair', icon: Flame, count: 'Pros Online', description: 'AC service, refrigerator & washing machine repairs.', accent: 'teal' },
  { title: 'Painting', icon: Paintbrush, count: 'Pros Online', description: 'Interior/exterior wall painting & waterproofing.', accent: 'violet' },
];

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
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
    <div className="min-h-screen bg-[#f8fafc] text-[#172033] flex flex-col justify-between">
      
      {/* 1. HERO SECTION */}
      <div className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-blue-50/70 via-[#f8fafc] to-[#f8fafc] border-b border-[#e2e8f0]/60">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-6 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Next-Gen Smart Local Discovery with Explainable AI</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#172033] max-w-3xl mx-auto mb-6 leading-tight">
            Find people you can <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">trust</span>, right near you
          </h1>

          <p className="text-base sm:text-lg text-[#475569] max-w-2xl mx-auto mb-10 font-normal">
            No more deceptive 5-star ratings. TrustNear evaluates real completed jobs, cancellation history, and fair market pricing with verifiable Machine Learning.
          </p>

          {/* Search Box */}
          <form 
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto relative flex items-center bg-white border border-[#e2e8f0] rounded-2xl p-2.5 shadow-md focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all mb-8"
          >
            <Search className="w-5 h-5 text-[#475569] ml-3 mr-2 shrink-0" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by trade or problem (e.g., Electrician, AC Repair, Leaking Tap)"
              className="w-full bg-transparent text-[#172033] placeholder-slate-400 text-sm sm:text-base outline-none px-2"
            />
            <button
              type="submit"
              className="btn-primary px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-1.5 whitespace-nowrap shadow-sm"
            >
              <span>Explore</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>

      {/* 2. SIX SERVICE CARDS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-[#172033]">Popular Services</h2>
            <p className="text-xs text-[#475569] mt-0.5">Explore top requested services verified by our community</p>
          </div>
          <button 
            onClick={() => navigate('/providers')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1 cursor-pointer"
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
      <div className="my-16 relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white py-12 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/20">
            
            {/* Real Stat 1: Total Completed Jobs */}
            <div className="pt-4 md:pt-0">
              <div className="flex items-center justify-center space-x-2 text-white/90 mb-1">
                <Users className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Jobs Completed</span>
              </div>
              <p className="text-4xl sm:text-5xl font-black tracking-tight">
                {platformStats.totalCompletedJobs}
              </p>
              <p className="text-xs text-white/80 mt-1 font-medium">
                Verified jobs across {platformStats.totalProviders} active providers in Mangaluru
              </p>
            </div>

            {/* Real Stat 2: Authentic Average Rating */}
            <div className="pt-4 md:pt-0">
              <div className="flex items-center justify-center space-x-2 text-white/90 mb-1">
                <Star className="w-5 h-5 fill-white" />
                <span className="text-xs font-bold uppercase tracking-widest">Community Rating</span>
              </div>
              <p className="text-4xl sm:text-5xl font-black tracking-tight">
                {platformStats.avgRating ? `${platformStats.avgRating} / 5.0` : 'New Platform'}
              </p>
              <p className="text-xs text-white/80 mt-1 font-medium">
                Calculated from real NLP-screened reviews
              </p>
            </div>

            {/* Real Stat 3: Punctuality / Completion Rate */}
            <div className="pt-4 md:pt-0">
              <div className="flex items-center justify-center space-x-2 text-white/90 mb-1">
                <Clock className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Completion Rate</span>
              </div>
              <p className="text-4xl sm:text-5xl font-black tracking-tight">
                {platformStats.onTimeRate}
              </p>
              <p className="text-xs text-white/80 mt-1 font-medium">
                Punctual arrival and low cancellation ratio
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* 4. THREE TOP-RATED PROVIDER CARDS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-black text-[#172033]">Top-Rated Providers</h2>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                AI Verified
              </span>
            </div>
            <p className="text-xs text-[#475569] mt-0.5">Highest ML Trust Scores in Mangaluru (Click Trust Badge for SHAP)</p>
          </div>
          <button 
            onClick={() => navigate('/providers')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span>View All Providers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-[#e2e8f0] p-6 h-64 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : topProviders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-8 text-center text-xs text-[#475569] shadow-sm">
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
      <footer className="border-t border-[#e2e8f0] bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#475569]">
          <div className="flex items-center space-x-2 mb-4 sm:mb-0">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-[#172033]">TrustNear Platform</span>
            <span>— Smart Local Discovery</span>
          </div>
          <p>© TrustNear Autonomous Local Discovery</p>
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

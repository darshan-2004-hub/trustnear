import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProviderMap from '../components/ProviderMap';
import TrustBadge from '../components/TrustBadge';
import BookingModal from '../components/BookingModal';
import ProviderReviewsModal from '../components/ProviderReviewsModal';
import FairPriceModal from '../components/FairPriceModal';
import { Search, Filter, MapPin, IndianRupee, Clock, Briefcase, Star, MessageSquare, Loader2, Sparkles, Calculator, Zap, ShieldCheck } from 'lucide-react';

const CATEGORIES = [
  'All',
  'Electrical',
  'Plumbing',
  'Appliance Repair',
  'Home Cleaning',
  'Carpentry',
];

const SearchProviders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [priority, setPriority] = useState('trust');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingProvider, setBookingProvider] = useState(null);
  const [viewingReviewsProvider, setViewingReviewsProvider] = useState(null);
  const [showPriceEstimator, setShowPriceEstimator] = useState(false);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'All') params.category = category;
      if (priority) params.priority = priority;

      const res = await api.get('/providers', { params });
      if (res.data.success) {
        setProviders(res.data.providers);
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [category, priority]);

  const handleBookService = (provider) => {
    if (!user) {
      // Guard: Redirect unauthenticated guests directly to login
      navigate('/login');
      return;
    }
    if (user.role !== 'customer') {
      alert('Only registered Customer accounts can book service providers. Providers cannot book other providers.');
      return;
    }
    setBookingProvider(provider);
  };

  const filteredProviders = providers.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.service_category.toLowerCase().includes(q) ||
      (p.bio && p.bio.toLowerCase().includes(q)) ||
      (p.service_address && p.service_address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Fair Price Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Find Verified Local Service Providers
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Personalized discovery adapting to your specific priority: Reliability, Budget, or Speed.
          </p>
        </div>

        <button
          onClick={() => setShowPriceEstimator(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-2xs self-start md:self-auto cursor-pointer"
        >
          <Calculator className="h-4 w-4 text-emerald-600" />
          <span>Estimate Fair Market Price</span>
        </button>
      </div>

      {/* Controls Bar: Priority Selector Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-8 space-y-4">
        <div>
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            What is your top priority for this job?
          </span>
          <div className="grid grid-cols-3 gap-2 sm:w-fit">
            <button
              onClick={() => setPriority('trust')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                priority === 'trust'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Highest Reliability</span>
            </button>

            <button
              onClick={() => setPriority('price')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                priority === 'price'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <IndianRupee className="h-4 w-4 text-emerald-400" />
              <span>Lowest Price</span>
            </button>

            <button
              onClick={() => setPriority('speed')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                priority === 'speed'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Fastest Speed</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, trade specialty, or area in Mangaluru..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                category === cat
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="h-8 w-8 text-brand-600 animate-spin mb-3" />
              <p className="text-sm text-slate-500 font-medium">Re-ranking providers according to your priority...</p>
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8">
              <p className="text-base font-semibold text-slate-700">No providers found matching your criteria.</p>
              <p className="text-xs text-slate-400 mt-1">Try selecting "All" categories or clearing your search query.</p>
            </div>
          ) : (
            filteredProviders.map((p) => (
              <div
                key={p.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-slate-900">{p.full_name}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {p.service_category}
                      </span>
                    </div>

                    {/* Match Score Badge */}
                    {p.match_percentage && (
                      <div className="mt-1 inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        <span>{p.match_percentage}% Match for your {priority.toUpperCase()} priority</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 flex items-center mt-1.5">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      {p.service_address}
                    </p>
                  </div>

                  <TrustBadge
                    score={p.trust_score}
                    shapFactors={p.shap_factors}
                    providerName={p.full_name}
                  />
                </div>

                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {p.bio || 'Verified local service provider available for booking.'}
                </p>

                <div className="grid grid-cols-3 gap-2 py-3 px-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Rate</span>
                    <span className="font-bold text-slate-800">₹{p.hourly_rate}/hr</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Experience</span>
                    <span className="font-bold text-slate-800">{p.experience_years} Years</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Jobs Done</span>
                    <span className="font-bold text-slate-800">{p.completed_jobs} Completed</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setViewingReviewsProvider(p)}
                    className="text-xs font-semibold text-slate-600 hover:text-brand-600 flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <span>Reviews & AI Highlights</span>
                  </button>

                  {/* Auth-guarded Book Service button */}
                  <button
                    onClick={() => handleBookService(p)}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Book Service
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-5 sticky top-24 h-[550px]">
          <ProviderMap
            providers={filteredProviders}
            selectedProvider={selectedProvider}
            onSelectProvider={(p) => setSelectedProvider(p)}
          />
        </div>
      </div>

      {/* Modals */}
      {bookingProvider && (
        <BookingModal
          provider={bookingProvider}
          onClose={() => setBookingProvider(null)}
        />
      )}

      {viewingReviewsProvider && (
        <ProviderReviewsModal
          provider={viewingReviewsProvider}
          onClose={() => setViewingReviewsProvider(null)}
        />
      )}

      {showPriceEstimator && (
        <FairPriceModal
          initialCategory={category !== 'All' ? category : 'Plumbing'}
          onClose={() => setShowPriceEstimator(false)}
        />
      )}
    </div>
  );
};

export default SearchProviders;

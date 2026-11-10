import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProviderMap from '../components/ProviderMap';
import ProviderCard from '../components/ProviderCard';
import BookingModal from '../components/BookingModal';
import ProviderReviewsModal from '../components/ProviderReviewsModal';
import FairPriceModal from '../components/FairPriceModal';
import { 
  Search, 
  MapPin, 
  Star, 
  Sliders, 
  Sparkles, 
  Calculator, 
  ArrowRight,
  TrendingUp,
  Clock,
  IndianRupee,
  ShieldCheck
} from 'lucide-react';

const CATEGORIES = ['All', 'Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Appliance Repair', 'Painting'];

const SearchProviders = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const rawCategory = queryParams.get('category') || 'All';
  const initialCategory = rawCategory.toLowerCase() === 'home cleaning' ? 'Cleaning' : rawCategory;
  const initialQuery = queryParams.get('q') || '';

  const [category, setCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [priority, setPriority] = useState('trust'); // 'trust', 'speed', 'price'
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [bookingProvider, setBookingProvider] = useState(null);
  const [reviewsProvider, setReviewsProvider] = useState(null);
  const [showFairPriceModal, setShowFairPriceModal] = useState(false);
  const [selectedMapProvider, setSelectedMapProvider] = useState(null);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'All') params.category = category;
      if (priority) params.priority = priority;

      const res = await api.get('/providers', { params });
      if (res.data?.success && Array.isArray(res.data.providers)) {
        setProviders(res.data.providers);
      }
    } catch (err) {
      console.warn('Providers search fallback:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [category, priority]);

  // Client-side text filter
  const filteredProviders = providers.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.service_category?.toLowerCase().includes(q) ||
      p.service_address?.toLowerCase().includes(q)
    );
  });

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
    <div className="min-h-screen bg-[#f8fafc] text-[#172033] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033]">Explore Verified Local Pros</h1>
            <p className="text-xs text-[#475569] mt-1">
              Live geolocation radar in Mangaluru with explainable Trust Intelligence & fair pricing.
            </p>
          </div>

          <button
            onClick={() => setShowFairPriceModal(true)}
            className="btn-secondary px-4 py-2.5 text-xs font-bold flex items-center space-x-2 rounded-xl cursor-pointer shadow-2xs"
          >
            <Calculator className="w-4 h-4 text-blue-600" />
            <span>Fair Price Calculator</span>
          </button>
        </div>

        {/* Filter & Priority Bar */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm">
          
          {/* Search Input */}
          <div className="relative flex-1 flex items-center bg-slate-50 border border-[#e2e8f0] rounded-xl px-3 py-2.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition">
            <Search className="w-4 h-4 text-[#475569] mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trade, area, or technician..."
              className="w-full bg-transparent text-xs text-[#172033] placeholder-slate-400 outline-none"
            />
          </div>

          {/* Priority Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-[#e2e8f0] text-xs">
            <span className="text-[10px] font-extrabold uppercase text-[#475569] px-2">Rank By:</span>
            {[
              { id: 'trust', label: '⭐ Trust First' },
              { id: 'speed', label: '⚡ Speed First' },
              { id: 'price', label: '💰 Lowest Price' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPriority(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  priority === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[#475569] hover:text-[#172033] hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer font-semibold ${
                category === cat
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-white border border-[#e2e8f0] text-[#475569] hover:text-[#172033] hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main Split Layout: Provider List (7 cols) & Radar Map (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Provider List */}
          <div className="lg:col-span-7 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white rounded-2xl border border-[#e2e8f0] p-6 h-48 animate-pulse shadow-sm" />
                ))}
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-12 text-center text-xs text-[#475569] shadow-sm">
                <Search className="w-10 h-10 text-blue-600 mx-auto mb-3 opacity-60" />
                <p className="text-base font-bold text-[#172033] mb-1">No providers found</p>
                <p>Try searching for a different category or clearing search filters.</p>
              </div>
            ) : (
              filteredProviders.map((provider) => (
                <ProviderCard
                  key={provider.id || provider.user_id}
                  provider={provider}
                  onBook={handleBook}
                  onViewReviews={(p) => setReviewsProvider(p)}
                />
              ))
            )}
          </div>

          {/* Leaflet Light Matter Radar Map */}
          <div className="lg:col-span-5">
            <div className="sticky top-20">
              <ProviderMap
                providers={filteredProviders}
                selectedProvider={selectedMapProvider}
                onSelectProvider={(p) => setSelectedMapProvider(p)}
                onBookProvider={handleBook}
              />
            </div>
          </div>

        </div>

      </div>

      {/* MODAL 1: Booking Modal */}
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

      {/* MODAL 2: Reviews Modal */}
      {reviewsProvider && (
        <ProviderReviewsModal
          provider={reviewsProvider}
          onClose={() => setReviewsProvider(null)}
        />
      )}

      {/* MODAL 3: Fair Price Calculator Modal */}
      {showFairPriceModal && (
        <FairPriceModal
          initialCategory={category !== 'All' ? category : 'Plumbing'}
          onClose={() => setShowFairPriceModal(false)}
        />
      )}

    </div>
  );
};

export default SearchProviders;

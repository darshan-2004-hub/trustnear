import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BookingModal from '../components/BookingModal';
import TrustBadge from '../components/TrustBadge';
import {
  ArrowLeft,
  Star,
  MapPin,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  IndianRupee,
  Briefcase,
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  Info,
  UserCheck,
  Image as ImageIcon,
  Eye,
  X,
  Activity,
  Check
} from 'lucide-react';

const ProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [provider, setProvider] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [portfolioTabMap, setPortfolioTabMap] = useState({});

  const resolveImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError('');
      try {
        const [provRes, portRes, availRes] = await Promise.allSettled([
          api.get(`/providers/${id}`),
          api.get(`/providers/${id}/portfolio`),
          api.get(`/providers/${id}/availability`)
        ]);

        if (provRes.status === 'fulfilled' && provRes.value.data?.success && provRes.value.data.provider) {
          setProvider(provRes.value.data.provider);

          // Auto-open booking modal if requested in URL query or state
          const searchParams = new URLSearchParams(location.search);
          if (searchParams.get('book') === 'true' || location.state?.openBooking) {
            setShowBookingModal(true);
          }
        } else {
          setError(provRes.status === 'fulfilled' ? provRes.value.data?.message : 'Provider profile not found.');
        }

        if (portRes.status === 'fulfilled' && portRes.value.data?.success) {
          setPortfolio(portRes.value.data.portfolio || []);
        }

        if (availRes.status === 'fulfilled' && availRes.value.data?.success) {
          setAvailability(availRes.value.data.availability);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load provider profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id, location.search, location.state]);

  const handleBookClick = () => {
    if (!isAuthenticated) {
      navigate('/login/customer', {
        state: {
          from: location.pathname,
          bookProviderId: provider?.user_id || provider?.id,
          returnToBooking: true,
        },
      });
      return;
    }
    setShowBookingModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen text-[#172033] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-emerald-100 rounded-lg" />
          <div className="glass-card rounded-2xl p-8 h-64 shadow-sm" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              <div className="glass-card rounded-2xl p-6 h-48 shadow-sm" />
              <div className="glass-card rounded-2xl p-6 h-64 shadow-sm" />
            </div>
            <div className="lg:col-span-5">
              <div className="glass-card rounded-2xl p-6 h-96 shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen text-[#172033] py-16 px-4 flex items-center justify-center">
        <div className="glass-panel rounded-2xl max-w-md w-full p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#172033]">Provider Not Found</h2>
          <p className="text-xs text-[#475569]">
            {error || 'The provider you are looking for does not exist or has been deactivated.'}
          </p>
          <div className="pt-2">
            <Link to="/providers" className="btn-primary px-6 py-2.5 text-xs font-bold inline-flex items-center space-x-2 rounded-xl shadow-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Providers</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const name = provider.full_name || 'Verified Pro';
  const category = provider.service_category || 'General Service';
  const hourlyRate = provider.hourly_rate ? Number(provider.hourly_rate).toFixed(0) : null;
  const rating = provider.rating ? Number(provider.rating).toFixed(1) : null;
  const reviewsCount = provider.reviews_count || 0;
  const isAvailable = provider.is_available !== false;
  const isVerified = provider.verification_status === 'approved' || provider.verification_status === 'verified';
  const trustScore = provider.trust_score;

  return (
    <div className="min-h-screen text-[#172033] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Breadcrumb / Back Link */}
        <div>
          <Link
            to="/providers"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#475569] hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Providers</span>
          </Link>
        </div>

        {/* Hero Profile Header Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            {/* Avatar & Core Bio */}
            <div className="flex items-start sm:items-center space-x-4 sm:space-x-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-emerald-600 to-sky-600 text-white flex items-center justify-center text-3xl font-black shadow-md shrink-0">
                {name.charAt(0)}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#172033]">{name}</h1>
                  {isVerified && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Pro</span>
                    </span>
                  )}
                  <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isAvailable
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span>{isAvailable ? 'Available Now' : 'Currently Busy'}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#475569]">
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {category}
                  </span>
                  {provider.experience_years && (
                    <span className="flex items-center space-x-1">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      <span>{provider.experience_years} Years Experience</span>
                    </span>
                  )}
                  {provider.service_address && (
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>{provider.service_address}</span>
                    </span>
                  )}
                </div>

                {/* Rating Preview */}
                <div className="flex items-center space-x-2 pt-1 text-xs">
                  {rating ? (
                    <div className="flex items-center space-x-1 text-amber-500">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-black text-[#172033]">{rating}</span>
                      <span className="text-[#475569]">({reviewsCount} approved reviews)</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#475569] font-medium">
                      {provider.completed_jobs > 0 ? `${provider.completed_jobs} verified completed jobs` : 'New Provider on TrustNear'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing & CTA */}
            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-4 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-[#e2e8f0]">
              <div className="text-left md:text-right">
                <span className="text-xs text-[#475569] block">Standard Rate</span>
                <div className="flex items-baseline space-x-1">
                  {hourlyRate ? (
                    <>
                      <span className="text-2xl sm:text-3xl font-black text-[#172033] flex items-center">
                        <IndianRupee className="w-6 h-6 text-blue-600" />
                        {hourlyRate}
                      </span>
                      <span className="text-xs text-[#475569]">/ hour</span>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-[#172033]">Custom Quote</span>
                  )}
                </div>
              </div>

              <button
                onClick={handleBookClick}
                disabled={!isAvailable}
                className="btn-primary w-full sm:w-auto px-8 py-3 text-sm font-bold flex items-center justify-center space-x-2 shadow-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>{isAvailable ? 'Book Appointment' : 'Currently Unavailable'}</span>
              </button>
            </div>

          </div>
        </div>

        {/* 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Bio & Genuine Community Reviews */}
          <div className="lg:col-span-7 space-y-6">

            {/* About / Bio Card */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-3 shadow-sm">
              <h3 className="text-base font-bold text-[#172033] flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>About the Professional</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed whitespace-pre-line">
                {provider.bio || `${name} is a certified ${category} specialist serving residents in Mangaluru with professional, on-demand maintenance and home services.`}
              </p>
            </div>

            {/* Work Portfolio Section */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base font-bold text-[#172033]">Work Portfolio & Past Projects</h3>
                </div>
                {portfolio.length > 0 && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {portfolio.length} Showcase{portfolio.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {portfolio.length > 0 ? (
                <div className="space-y-4">
                  {portfolio.map((item) => {
                    const activeView = portfolioTabMap[item.id] || (item.after_image_url ? 'after' : (item.before_image_url ? 'before' : null));
                    const hasBoth = Boolean(item.before_image_url && item.after_image_url);

                    return (
                      <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-[#172033]">{item.title}</h4>
                            <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-[#475569]">
                              <span className="text-blue-600 font-semibold">{item.service_category}</span>
                              {item.completion_date && (
                                <>
                                  <span>•</span>
                                  <span>Completed: {item.completion_date}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-[#475569] leading-relaxed">
                          {item.description}
                        </p>

                        {/* Image Showcase & Comparison */}
                        {(item.before_image_url || item.after_image_url) && (
                          <div className="space-y-2 pt-1">
                            {hasBoth && (
                              <div className="flex items-center space-x-2">
                                <span className="text-[11px] font-semibold text-[#475569]">Compare View:</span>
                                <div className="inline-flex rounded-lg border border-[#e2e8f0] bg-white p-0.5 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => setPortfolioTabMap({ ...portfolioTabMap, [item.id]: 'before' })}
                                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer text-xs ${
                                      activeView === 'before' ? 'bg-amber-100 text-amber-800' : 'text-[#475569] hover:text-[#172033]'
                                    }`}
                                  >
                                    Before
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPortfolioTabMap({ ...portfolioTabMap, [item.id]: 'after' })}
                                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer text-xs ${
                                      activeView === 'after' ? 'bg-emerald-100 text-emerald-800' : 'text-[#475569] hover:text-[#172033]'
                                    }`}
                                  >
                                    After Work
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPortfolioTabMap({ ...portfolioTabMap, [item.id]: 'both' })}
                                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer text-xs ${
                                      activeView === 'both' ? 'bg-blue-100 text-blue-800' : 'text-[#475569] hover:text-[#172033]'
                                    }`}
                                  >
                                    Side-by-Side
                                  </button>
                                </div>
                              </div>
                            )}

                            {activeView === 'both' && hasBoth ? (
                              <div className="grid grid-cols-2 gap-2">
                                <div
                                  className="relative group rounded-xl overflow-hidden border border-[#e2e8f0] bg-white aspect-4/3 cursor-pointer"
                                  onClick={() => setPreviewImage({ url: resolveImageUrl(item.before_image_url), label: `${item.title} - Before` })}
                                >
                                  <img
                                    src={resolveImageUrl(item.before_image_url)}
                                    alt="Before work"
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                  />
                                  <span className="absolute top-2 left-2 bg-amber-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                                    BEFORE
                                  </span>
                                  <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <Eye className="w-5 h-5 text-white" />
                                  </div>
                                </div>
                                <div
                                  className="relative group rounded-xl overflow-hidden border border-[#e2e8f0] bg-white aspect-4/3 cursor-pointer"
                                  onClick={() => setPreviewImage({ url: resolveImageUrl(item.after_image_url), label: `${item.title} - After Completion` })}
                                >
                                  <img
                                    src={resolveImageUrl(item.after_image_url)}
                                    alt="After work"
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                  />
                                  <span className="absolute top-2 left-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                                    AFTER WORK
                                  </span>
                                  <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <Eye className="w-5 h-5 text-white" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="relative group rounded-xl overflow-hidden border border-[#e2e8f0] bg-white aspect-16/9 max-h-60 cursor-pointer"
                                onClick={() => {
                                  const url = activeView === 'before' ? item.before_image_url : (item.after_image_url || item.before_image_url);
                                  setPreviewImage({ url: resolveImageUrl(url), label: `${item.title} (${activeView === 'before' ? 'Before' : 'After'})` });
                                }}
                              >
                                <img
                                  src={resolveImageUrl(activeView === 'before' ? item.before_image_url : (item.after_image_url || item.before_image_url))}
                                  alt="Portfolio sample"
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                />
                                {hasBoth && (
                                  <span className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow ${
                                    activeView === 'before' ? 'bg-amber-600/90' : 'bg-emerald-600/90'
                                  }`}>
                                    {activeView === 'before' ? 'BEFORE' : 'AFTER WORK'}
                                  </span>
                                )}
                                <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                  <Eye className="w-6 h-6 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#475569] space-y-1">
                  <ImageIcon className="w-7 h-7 text-blue-600 mx-auto opacity-50 mb-1" />
                  <p className="font-semibold text-[#172033]">No portfolio items published yet</p>
                  <p>Provider has not uploaded any past project before & after showcases yet.</p>
                </div>
              )}
            </div>

            {/* Genuine Community Reviews Section */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base font-bold text-[#172033]">Genuine Customer Reviews</h3>
                </div>
                {rating && (
                  <div className="flex items-center space-x-1.5 text-xs">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-[#172033]">{rating}</span>
                    <span className="text-[#475569]">/ 5.0</span>
                  </div>
                )}
              </div>

              {provider.reviews && provider.reviews.length > 0 ? (
                <div className="space-y-3">
                  {provider.reviews.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] space-y-2 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                            {r.customer_name ? r.customer_name.charAt(0) : 'C'}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#172033] block">
                              {r.customer_name || 'Verified Customer'}
                            </span>
                            {r.service_title && (
                              <span className="text-[10px] text-blue-600 font-medium block">
                                Service: {r.service_title}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Rating Stars */}
                          <div className="flex items-center text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-[#172033] leading-relaxed">
                        "{r.review_text}"
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-[#475569]">
                        <span>{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}</span>
                        {r.sentiment_score !== null && r.sentiment_score !== undefined && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            r.sentiment_score >= 0.05
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.sentiment_score <= -0.05
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            Sentiment {r.sentiment_score > 0 ? `+${r.sentiment_score}` : r.sentiment_score}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#475569] space-y-2">
                  <MessageSquare className="w-8 h-8 text-blue-600 mx-auto opacity-50" />
                  <p className="font-semibold text-[#172033]">No reviews published yet</p>
                  <p>Book this provider to experience their work and become the first to leave verified feedback!</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Trust Intelligence & Platform Guarantees */}
          <div className="lg:col-span-5 space-y-6">

            {/* Stage 5: Transparent Reliability Indicator Card */}
            {provider.reliability && (
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-bold text-[#172033]">Provider Reliability</h3>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    provider.reliability.status_label === 'High Reliability'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : provider.reliability.status_label === 'Moderate Reliability'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : provider.reliability.status_label === 'Needs Improvement'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {provider.reliability.status_label}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#475569] font-semibold uppercase block">Attendance & Fulfillment</span>
                    <div className="flex items-baseline space-x-1.5 mt-0.5">
                      {provider.reliability.reliability_rate !== null ? (
                        <>
                          <span className="text-3xl font-black text-emerald-600">
                            {provider.reliability.reliability_rate}%
                          </span>
                          <span className="text-xs text-[#475569]">rate</span>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-amber-700">Building History</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#475569] block font-medium">Distinct from ML Trust</span>
                    <span className="text-[10px] text-slate-500">Pure genuine delivery records</span>
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-xs text-[#475569] leading-relaxed">
                  {provider.reliability.explanation}
                </p>

                {/* Breakdown Grid */}
                {provider.reliability.breakdown && (
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <span className="text-[10px] text-emerald-800 font-semibold uppercase block">Completed Bookings</span>
                      <span className="text-sm font-bold text-emerald-700 block mt-0.5">
                        {provider.reliability.breakdown.completed_bookings}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100">
                      <span className="text-[10px] text-rose-800 font-semibold uppercase block">Provider Cancellations</span>
                      <span className="text-sm font-bold text-rose-700 block mt-0.5">
                        {provider.reliability.breakdown.provider_cancellations}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                      <span className="text-[10px] text-[#475569] font-semibold uppercase block">Confirmed No-Shows</span>
                      <span className="text-sm font-bold text-[#172033] block mt-0.5">
                        {provider.reliability.breakdown.confirmed_no_shows}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-[#475569] font-semibold uppercase block">Customer Cancels</span>
                        <span className="text-[9px] text-emerald-600 font-bold">(0 penalty)</span>
                      </div>
                      <span className="text-sm font-bold text-[#172033] block mt-0.5">
                        {provider.reliability.breakdown.customer_cancellations}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trust Intelligence Card */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-[#172033]">Trust Intelligence</h3>
                </div>
                {provider.data_source && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    provider.data_source === 'real'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : provider.data_source === 'hybrid'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {provider.data_source === 'real' ? 'Community Verified' : provider.data_source === 'hybrid' ? 'Hybrid Benchmark' : 'Platform Baseline'}
                  </span>
                )}
              </div>

              {/* Big Trust Gauge */}
              <div className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#475569] font-semibold uppercase block">Verified Trust Score</span>
                  <div className="flex items-baseline space-x-1.5 mt-0.5">
                    {trustScore !== null && trustScore !== undefined ? (
                      <>
                        <span className="text-3xl font-black text-[#172033]">{Number(trustScore).toFixed(1)}</span>
                        <span className="text-xs text-[#475569]">/ 100</span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-[#475569]">New Provider Baseline</span>
                    )}
                  </div>
                </div>

                <div>
                  {trustScore !== null && trustScore !== undefined ? (
                    <TrustBadge score={trustScore} providerName={name} shapFactors={provider.shap_factors} />
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-200 text-xs text-[#475569] font-semibold">
                      New Pro
                    </span>
                  )}
                </div>
              </div>

              {/* Evidence Note */}
              {provider.evidence_note && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start space-x-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <p className="leading-relaxed">{provider.evidence_note}</p>
                </div>
              )}

              {/* Operational Signals */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                  <span className="text-[10px] text-[#475569] uppercase block font-semibold">Completed Jobs</span>
                  <span className="text-sm font-bold text-[#172033] mt-1 block">
                    {provider.completed_jobs || 0} verified
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                  <span className="text-[10px] text-[#475569] uppercase block font-semibold">Cancellation Rate</span>
                  <span className="text-sm font-bold text-[#172033] mt-1 block">
                    {provider.cancellation_rate ? `${Number(provider.cancellation_rate).toFixed(1)}%` : '0.0%'}
                  </span>
                </div>
              </div>

              {/* SHAP Explainable Factors if available */}
              {provider.shap_factors && Array.isArray(provider.shap_factors) && provider.shap_factors.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#e2e8f0]">
                  <span className="text-xs font-bold text-[#172033] flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>ML Trust Score Drivers</span>
                  </span>
                  <div className="space-y-1.5">
                    {provider.shap_factors.slice(0, 4).map((factor, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-50 border border-[#e2e8f0]"
                      >
                        <span className="text-[#172033] truncate mr-2 font-medium">{factor.label || factor.feature}</span>
                        <span
                          className={`font-bold shrink-0 ${
                            factor.impact > 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {factor.impact > 0 ? `+${Number(factor.impact).toFixed(1)}` : Number(factor.impact).toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stage 5: Working Hours & Availability Schedule Card */}
            {availability && (
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-bold text-[#172033]">Working Hours & Slots</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    availability.is_accepting_bookings
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {availability.is_accepting_bookings ? 'Accepting Bookings' : 'Paused'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#e2e8f0]">
                    <span className="text-[#475569]">Daily Operating Hours:</span>
                    <span className="font-bold text-[#172033]">
                      {availability.daily_start_time} - {availability.daily_end_time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#e2e8f0]">
                    <span className="text-[#475569]">Slot Duration:</span>
                    <span className="font-bold text-[#172033]">
                      {availability.slot_duration_minutes} minutes
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-[#475569] block mb-1.5 font-medium">Working Days:</span>
                    <div className="flex flex-wrap gap-1">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                        const isWorking = (availability.working_days || []).includes(day);
                        return (
                          <span
                            key={day}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              isWorking
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Platform Guarantees Card */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#172033]">TrustNear Assurance</h4>
              <ul className="space-y-2 text-xs text-[#475569]">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified government ID & criminal background checked</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Fair market price estimations to prevent overcharging</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zero upfront payment — pay only after service completion</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>

      {/* Image Preview Zoom Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-white/20 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-[#e2e8f0]">
              <span className="text-xs font-bold text-[#172033]">{previewImage.label}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-[#475569] hover:text-[#172033] p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] flex items-center justify-center overflow-auto p-2 bg-slate-950/5">
              <img
                src={previewImage.url}
                alt={previewImage.label}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          provider={provider}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            setShowBookingModal(false);
            navigate('/bookings');
          }}
        />
      )}
    </div>
  );
};

export default ProviderDetail;

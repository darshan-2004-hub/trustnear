import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, IndianRupee, X, CheckCircle, AlertCircle, Wrench, Sparkles, Lock } from 'lucide-react';

const BookingModal = ({ provider, onClose, onSuccess }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [serviceTitle, setServiceTitle] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [agreedPrice, setAgreedPrice] = useState(
    provider?.hourly_rate ? Number(provider.hourly_rate) : ''
  );
  const [fairRange, setFairRange] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateString = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    const fetchFairBenchmark = async () => {
      try {
        const res = await api.post('/providers/estimate-price', {
          category: provider.service_category,
          duration_hours: 1.5,
          is_emergency: false,
        });
        if (res.data?.success && res.data?.estimation) {
          setFairRange(res.data.estimation);
          // If price wasn't set, default to predicted fair benchmark
          if (!agreedPrice && res.data.estimation.predicted_fair_price) {
            setAgreedPrice(res.data.estimation.predicted_fair_price);
          }
        }
      } catch (err) {
        // Non-critical fallback
      }
    };
    if (provider?.service_category) fetchFairBenchmark();
  }, [provider]);

  // If user is not logged in, show authentication required prompt
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl border border-[#e2e8f0] animate-in fade-in duration-150">
          <div className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl inline-flex mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#172033]">Sign In Required</h3>
          <p className="text-xs text-[#475569] mt-1 mb-5">
            You must be signed in with a registered Customer account to book this service provider.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-[#e2e8f0] rounded-xl text-xs font-semibold text-[#475569] hover:text-[#172033] hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const providerId = provider?.user_id || provider?.id;
                onClose();
                navigate('/login/customer', {
                  state: {
                    from: window.location.pathname,
                    bookProviderId: providerId,
                    returnToBooking: true,
                  },
                });
              }}
              className="flex-1 py-2 btn-primary rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Sign In Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success Confirmation Overlay
  if (successMessage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-sm w-full p-8 text-center shadow-xl border border-emerald-200 animate-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-4">
            <CheckCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#172033] mb-1">Booking Confirmed!</h3>
          <p className="text-xs text-[#475569]">{successMessage}</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (user.role !== 'customer') {
      setError('Only customer accounts can book service providers.');
      return;
    }

    if (!serviceTitle.trim() || !bookingDate || !bookingTime || !customerAddress.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        provider_id: provider.user_id || provider.id,
        service_title: serviceTitle.trim(),
        service_category: provider.service_category,
        booking_date: bookingDate,
        booking_time: bookingTime,
        customer_address: customerAddress.trim(),
        agreed_price: agreedPrice ? Number(agreedPrice) : null,
      };

      const res = await api.post('/bookings', payload);
      if (res.data?.success) {
        setSuccessMessage('Your appointment request has been scheduled with the provider.');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data.booking_id);
          onClose();
          navigate('/bookings');
        }, 1200);
      } else {
        setError(res.data?.message || 'Failed to place booking.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error while creating booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#e2e8f0] animate-in fade-in duration-150">
        <div className="flex items-start justify-between pb-4 border-b border-[#e2e8f0]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#172033]">
                Book {provider.full_name || provider.name || 'Provider'}
              </h3>
              <p className="text-xs text-blue-600 font-semibold">
                {provider.service_category} • {provider.hourly_rate ? `₹${provider.hourly_rate}/hr` : 'Custom Quote'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#475569] hover:text-[#172033] p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl flex items-center space-x-2 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
              Issue / Service Required <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={serviceTitle}
              onChange={(e) => setServiceTitle(e.target.value)}
              placeholder="e.g. Bathroom pipe leak & tap replacement"
              className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                Preferred Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="h-4 w-4 text-[#475569] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  required
                  min={minDateString}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                Preferred Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="h-4 w-4 text-[#475569] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="time"
                  required
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
              Your Service Location Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="h-4 w-4 text-[#475569] absolute left-3 top-3.5 pointer-events-none" />
              <textarea
                rows="2"
                required
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="House No., Street, Landmark, Mangaluru"
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
              Estimated Initial Fee (₹)
            </label>
            <div className="relative">
              <IndianRupee className="h-4 w-4 text-[#475569] absolute left-3 top-3 pointer-events-none" />
              <input
                type="number"
                min="0"
                step="50"
                value={agreedPrice}
                onChange={(e) => setAgreedPrice(e.target.value)}
                placeholder="Negotiable / TBD"
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
              />
            </div>

            {/* Regression Fair Price Benchmark Notice */}
            {fairRange && (
              <div className="mt-2.5 p-2.5 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between text-xs text-blue-700">
                <span className="flex items-center font-medium">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                  Fair Market Benchmark (1.5 hrs):
                </span>
                <span className="font-bold">₹{fairRange.fair_range_min} - ₹{fairRange.fair_range_max}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 btn-secondary rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 btn-primary rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Submitting...' : 'Confirm Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;

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
  const [agreedPrice, setAgreedPrice] = useState(provider?.hourly_rate || 350);
  const [fairRange, setFairRange] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        if (res.data.success) {
          setFairRange(res.data.estimation);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 animate-in fade-in duration-150">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl inline-flex mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Sign In Required</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            You must be signed in with a registered Customer account to book this service provider.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/login');
              }}
              className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Sign In Now
            </button>
          </div>
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
        provider_id: provider.user_id,
        service_title: serviceTitle.trim(),
        service_category: provider.service_category,
        booking_date: bookingDate,
        booking_time: bookingTime,
        customer_address: customerAddress.trim(),
        agreed_price: Number(agreedPrice),
      };

      const res = await api.post('/bookings', payload);
      if (res.data.success) {
        if (onSuccess) onSuccess(res.data.booking_id);
        onClose();
        navigate('/bookings');
      } else {
        setError(res.data.message || 'Failed to place booking.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error while creating booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-150">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-brand-100 text-brand-700 rounded-xl">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Book {provider.full_name}
              </h3>
              <p className="text-xs text-brand-600 font-semibold">
                {provider.service_category} • ₹{provider.hourly_rate}/hr
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl flex items-center space-x-2 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Issue / Service Required <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={serviceTitle}
              onChange={(e) => setServiceTitle(e.target.value)}
              placeholder="e.g. Bathroom pipe leak & tap replacement"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Preferred Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  min={minDateString}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Preferred Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="time"
                  required
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Your Service Location Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows="2"
                required
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="House No., Street, Landmark, Mangaluru"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Estimated Initial Fee (₹)
            </label>
            <div className="relative">
              <IndianRupee className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                min="50"
                step="50"
                value={agreedPrice}
                onChange={(e) => setAgreedPrice(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Regression Fair Price Benchmark Notice */}
            {fairRange && (
              <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between text-[11px] text-emerald-800">
                <span className="flex items-center">
                  <Sparkles className="h-3 w-3 mr-1 text-emerald-600" />
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
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition shadow-xs disabled:opacity-50 cursor-pointer"
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

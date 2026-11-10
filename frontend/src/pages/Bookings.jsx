import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChatModal from '../components/ChatModal';
import ReviewModal from '../components/ReviewModal';
import InvoiceModal from '../components/InvoiceModal';
import TrustBadge from '../components/TrustBadge';
import StatCard from '../components/StatCard';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  MessageSquare, 
  Check, 
  X, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  Star,
  Users,
  IndianRupee,
  ShoppingBag,
  FileText,
  TrendingUp,
  ChevronRight,
  Phone
} from 'lucide-react';

const STATUS_PILLS = {
  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending Approval' },
  accepted: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Accepted' },
  in_progress: { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'In Progress' },
  completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed' },
  cancelled: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Cancelled' },
};

const Bookings = () => {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  const [selectedChatBooking, setSelectedChatBooking] = useState(null);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState(null);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState(null);
  const [cancellationBooking, setCancellationBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('Schedule conflict / Change of plans');
  const [customReason, setCustomReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);
  const socketRef = useRef(null);

  const isCustomer = user?.role === 'customer';
  const isProvider = user?.role === 'provider';

  // Live Provider ML Trust Metrics State
  const [providerTrustData, setProviderTrustData] = useState(null);
  const [trustLoading, setTrustLoading] = useState(false);

  const fetchProviderMetrics = async () => {
    if (user?.role !== 'provider') return;
    setTrustLoading(true);
    try {
      const [meRes, providersRes] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/providers')
      ]);

      let score = null;
      let shap = null;
      let note = null;

      if (providersRes.status === 'fulfilled' && providersRes.value.data?.success) {
        const found = (providersRes.value.data.providers || []).find(
          (p) => p.user_id === user.id || p.id === user.id
        );
        if (found) {
          score = found.trust_score;
          shap = found.shap_factors;
          note = found.evidence_note;
        }
      }

      if (score === null && meRes.status === 'fulfilled' && meRes.value.data?.success) {
        const tm = meRes.value.data.user?.trust_metrics;
        if (tm && tm.trust_score !== null && tm.trust_score !== undefined) {
          score = Number(tm.trust_score);
          shap = tm.shap_factors;
        }
      }

      if (score !== null && score !== undefined) {
        setProviderTrustData({
          trust_score: Number(score),
          shap_factors: shap,
          evidence_note: note,
        });
      }
    } catch (err) {
      console.warn('Could not fetch live provider trust data:', err.message);
    } finally {
      setTrustLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings');
      if (res.data?.success && Array.isArray(res.data.bookings)) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    if (isProvider) {
      fetchProviderMetrics();
    }

    // Connect to Flask-SocketIO for real-time booking status notifications
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('booking_status_changed', (data) => {
      fetchBookings();
      if (isProvider) fetchProviderMetrics();
      setToastNotification({
        title: 'Booking Updated',
        message: `Booking #${data.booking_id} status changed to ${data.new_status}`,
        type: 'info',
      });
      setTimeout(() => setToastNotification(null), 5000);
    });

    socket.on('new_chat_message', (msg) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === msg.booking_id ? { ...b, unread_count: (b.unread_count || 0) + 1 } : b))
      );
      setToastNotification({
        title: 'New Message',
        message: `${msg.sender_name}: ${msg.content}`,
        booking_id: msg.booking_id,
        type: 'message',
      });
      setTimeout(() => setToastNotification(null), 6000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleStatusUpdate = async (bookingId, nextStatus, optionalReason = null) => {
    setActionLoading(bookingId);
    try {
      const payload = { status: nextStatus };
      if (optionalReason) {
        payload.cancellation_reason = optionalReason;
      }
      const res = await api.patch(`/bookings/${bookingId}/status`, payload);
      if (res.data?.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  status: nextStatus,
                  cancellation_reason: optionalReason || b.cancellation_reason,
                }
              : b
          )
        );
        if (isProvider) fetchProviderMetrics();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(null);
      setCancellationBooking(null);
    }
  };

  // Filter Bookings by Tab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['pending', 'accepted', 'in_progress'].includes(b.status);
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const totalCount = bookings.length;
  const activeCount = bookings.filter((b) => ['pending', 'accepted', 'in_progress'].includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  
  // Real Financial Calculation (Uses ONLY completed bookings with real agreed prices)
  const totalSpent = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (parseFloat(b.agreed_price) || 0), 0);

  const providerTrustScore = providerTrustData?.trust_score ?? user?.trust_metrics?.trust_score ?? null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#172033] py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Real-time Toast Banner */}
      {toastNotification && (
        <div className="fixed bottom-6 left-6 z-50 bg-white border border-blue-200 rounded-2xl p-4 shadow-xl flex items-center space-x-3 animate-in slide-in-from-bottom-5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#172033]">{toastNotification.title}</h4>
            <p className="text-xs text-[#475569]">{toastNotification.message}</p>
          </div>
          <button
            onClick={() => {
              const b = bookings.find((item) => item.id === toastNotification.booking_id);
              if (b) setSelectedChatBooking(b);
              setToastNotification(null);
            }}
            className="btn-primary px-3 py-1 text-[11px] rounded-lg shadow-2xs"
          >
            Open
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-[#172033]">
                {isCustomer ? 'My Bookings & Appointments' : 'Provider Job Queue & Work Orders'}
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-[#475569] mt-1">
              {isCustomer
                ? 'Track your home service requests, coordinate live with assigned pros, and view official invoices.'
                : 'Manage active customer jobs, accept or decline incoming requests, update work progress, and coordinate with clients.'}
            </p>
          </div>

          {/* Quick link for providers to jump to their dedicated dashboard */}
          {isProvider && (
            <Link
              to="/provider-dashboard"
              className="btn-secondary px-3.5 py-2 text-xs font-bold flex items-center space-x-1.5 shadow-2xs hover:border-blue-300 transition-colors rounded-xl"
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Provider Analytics</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#475569]" />
            </Link>
          )}
        </div>

        {/* 4 STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <StatCard
            title={isCustomer ? 'TOTAL BOOKINGS' : 'TOTAL JOB REQUESTS'}
            value={totalCount}
            change={totalCount > 0 ? `${totalCount} on record` : 'No bookings yet'}
            icon={isCustomer ? ShoppingBag : Calendar}
            accent="violet"
          />

          <StatCard
            title={isCustomer ? 'ACTIVE APPOINTMENTS' : 'ACTIVE JOBS'}
            value={activeCount}
            change={activeCount > 0 ? `${activeCount} in progress` : 'All clear'}
            icon={Clock}
            accent="teal"
          />

          <StatCard
            title={isCustomer ? 'SERVICES COMPLETED' : 'COMPLETED JOBS'}
            value={completedCount}
            subtitle={isCustomer ? 'Verified delivered' : 'Verified in MySQL'}
            icon={CheckCircle2}
            accent="amber"
          />

          {isCustomer ? (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-blue-700 tracking-wider uppercase">
                  TOTAL COMPLETED SPENT
                </span>
                <IndianRupee className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-[#172033] flex items-center">
                  <IndianRupee className="w-5 h-5 text-blue-600" />
                  {totalSpent.toFixed(0)}
                </p>
                <span className="text-xs text-[#475569] mt-1 block">
                  Across {completedCount} completed services
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-blue-700 tracking-wider uppercase">
                  ML TRUST SCORE
                </span>
                <span className="text-xs text-amber-500">★</span>
              </div>
              <div>
                {trustLoading ? (
                  <div className="py-2">
                    <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse mb-2" />
                    <span className="text-[11px] text-[#475569]">Fetching verified metrics...</span>
                  </div>
                ) : providerTrustScore !== null && providerTrustScore !== undefined ? (
                  <>
                    <p className="text-2xl sm:text-3xl font-black text-blue-600">
                      {Number(providerTrustScore).toFixed(1)} <span className="text-xs font-normal text-[#475569]">/ 100</span>
                    </p>
                    <div className="mt-2">
                      <TrustBadge 
                        score={providerTrustScore} 
                        providerName={user?.full_name} 
                        shapFactors={providerTrustData?.shap_factors}
                      />
                    </div>
                    {providerTrustData?.evidence_note && (
                      <p className="text-[10px] text-[#475569] mt-1.5 truncate" title={providerTrustData.evidence_note}>
                        {providerTrustData.evidence_note}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="py-1">
                    <p className="text-lg font-bold text-amber-600">Unavailable</p>
                    <span className="text-[11px] text-[#475569] block mt-0.5">
                      Pending verified jobs & reviews
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 border-b border-[#e2e8f0] pb-3 text-xs font-semibold">
          {[
            { id: 'all', label: `All (${bookings.length})` },
            { id: 'active', label: `Active (${activeCount})` },
            { id: 'completed', label: `Completed (${completedCount})` },
            { id: 'cancelled', label: `Cancelled` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bookings Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-[#e2e8f0] p-6 h-24 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-12 text-center text-xs text-[#475569] space-y-3 shadow-sm">
            <Calendar className="w-10 h-10 text-blue-600 mx-auto opacity-60" />
            <div>
              <p className="text-base font-bold text-[#172033] mb-1">No appointments found</p>
              <p>You don't have any bookings matching this filter category.</p>
            </div>
            {isCustomer && (
              <div className="pt-2">
                <Link to="/providers" className="btn-primary px-5 py-2.5 text-xs font-bold inline-flex items-center space-x-2 rounded-xl shadow-sm">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Explore Local Services</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 sm:p-6 overflow-hidden shadow-sm">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[#475569] uppercase tracking-wider text-[10px]">
                    <th className="pb-3">{isCustomer ? 'Assigned Service Provider' : 'Customer Name'}</th>
                    <th className="pb-3">Service Details</th>
                    <th className="pb-3">Scheduled Date & Time</th>
                    <th className="pb-3">Service Fee</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filteredBookings.map((b) => {
                    const counterpartName = isCustomer
                      ? b.counterpart?.full_name || b.provider_name || 'Verified Pro'
                      : b.counterpart?.full_name || b.customer_name || 'Customer';

                    const pill = STATUS_PILLS[b.status] || STATUS_PILLS.pending;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Name Column with Contact Privacy Policy */}
                        <td className="py-3.5 pr-2">
                          <p className="font-bold text-[#172033]">{counterpartName}</p>
                          <p className="text-[11px] text-[#475569]">{b.customer_address || b.service_address}</p>

                          {/* Contact detail reveal logic: only when confirmed/in-progress/completed */}
                          {isCustomer && (
                            b.counterpart?.contact_permitted && (b.counterpart?.phone || b.counterpart?.email) ? (
                              <div className="flex items-center space-x-1.5 text-[11px] text-emerald-700 mt-0.5">
                                <Phone className="w-3 h-3 shrink-0" />
                                <span>{b.counterpart.phone || b.counterpart.email}</span>
                              </div>
                            ) : b.status === 'pending' ? (
                              <span className="text-[10px] text-[#475569] italic mt-0.5 block">
                                Contact revealed upon confirmation
                              </span>
                            ) : null
                          )}

                          {b.status === 'cancelled' && b.cancellation_reason && (
                            <span className="text-[10px] text-rose-600 italic mt-0.5 block">
                              Reason: {b.cancellation_reason}
                            </span>
                          )}
                        </td>

                        {/* Title & Category */}
                        <td className="py-3.5 pr-2">
                          <p className="font-semibold text-[#172033]">{b.service_title}</p>
                          <span className="text-[10px] text-blue-600 font-semibold">{b.service_category}</span>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 pr-2 text-[#475569] whitespace-nowrap">
                          {b.booking_date} • {b.booking_time}
                        </td>

                        {/* Fee — Actual booking price or TBD (never fabricated fallback) */}
                        <td className="py-3.5 pr-2 font-bold text-[#172033] whitespace-nowrap">
                          {b.agreed_price ? (
                            `₹${parseFloat(b.agreed_price).toFixed(0)}`
                          ) : (
                            <span className="text-[#475569] italic text-[11px]">TBD</span>
                          )}
                        </td>

                        {/* Status Pill */}
                        <td className="py-3.5 pr-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${pill.bg}`}>
                            {pill.label}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 text-right space-x-2 whitespace-nowrap">
                          {/* Live Chat Button */}
                          <button
                            onClick={() => setSelectedChatBooking(b)}
                            className="btn-secondary px-3 py-1.5 text-xs font-semibold inline-flex items-center space-x-1 relative cursor-pointer rounded-xl shadow-2xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            <span>Chat</span>
                            {b.unread_count > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                                {b.unread_count}
                              </span>
                            )}
                          </button>

                          {/* 1-CLICK PRINTABLE INVOICE (for Completed Bookings) */}
                          {b.status === 'completed' && (
                            <button
                              onClick={() => setSelectedInvoiceBooking(b)}
                              className="btn-secondary px-3 py-1.5 text-xs font-bold inline-flex items-center space-x-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 cursor-pointer rounded-xl"
                              title="Print / Save Official Invoice"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Invoice</span>
                            </button>
                          )}

                          {/* PROVIDER ACTIONS */}
                          {isProvider && b.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(b.id, 'accepted')}
                                disabled={actionLoading === b.id}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs cursor-pointer"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => setCancellationBooking(b)}
                                disabled={actionLoading === b.id}
                                className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-medium text-xs cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {isProvider && b.status === 'accepted' && (
                            <button
                              onClick={() => handleStatusUpdate(b.id, 'in_progress')}
                              disabled={actionLoading === b.id}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-xs cursor-pointer"
                            >
                              Start Job
                            </button>
                          )}

                          {isProvider && b.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusUpdate(b.id, 'completed')}
                              disabled={actionLoading === b.id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs cursor-pointer shadow-sm"
                            >
                              Complete
                            </button>
                          )}

                          {/* CUSTOMER ACTIONS */}
                          {isCustomer && b.status === 'completed' && (
                            <button
                              onClick={() => setSelectedReviewBooking(b)}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-bold text-xs inline-flex items-center space-x-1 cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>Rate Service</span>
                            </button>
                          )}

                          {isCustomer && b.status === 'pending' && (
                            <button
                              onClick={() => setCancellationBooking(b)}
                              disabled={actionLoading === b.id}
                              className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-medium text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Cancellation Reason Modal */}
      {cancellationBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-rose-200 animate-in fade-in duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center space-x-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-base font-bold text-[#172033]">Cancel Appointment</h3>
              </div>
              <button
                onClick={() => setCancellationBooking(null)}
                className="text-[#475569] hover:text-[#172033] p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <p className="text-[#475569]">
                Please let us know why you are cancelling this appointment with{' '}
                <strong className="text-[#172033]">
                  {cancellationBooking.counterpart?.full_name || 'the service pro'}
                </strong>:
              </p>

              <div className="space-y-2">
                {[
                  'Schedule conflict / Change of plans',
                  'Found alternative service provider',
                  'Issue resolved on my own',
                  'Price disagreement / Negotiating',
                  'Other reason',
                ].map((reasonOption) => (
                  <label
                    key={reasonOption}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      cancellationReason === reasonOption
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium'
                        : 'bg-slate-50 border-[#e2e8f0] text-[#475569] hover:border-blue-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      value={reasonOption}
                      checked={cancellationReason === reasonOption}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      className="accent-blue-600"
                    />
                    <span>{reasonOption}</span>
                  </label>
                ))}
              </div>

              {cancellationReason === 'Other reason' && (
                <div>
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Briefly describe the reason for cancellation..."
                    className="w-full p-2.5 bg-white border border-[#e2e8f0] rounded-xl text-xs text-[#172033] placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellationBooking(null)}
                  className="flex-1 py-2.5 btn-secondary rounded-xl text-xs font-bold cursor-pointer"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  disabled={actionLoading === cancellationBooking.id}
                  onClick={() => {
                    const finalReason = cancellationReason === 'Other reason' && customReason.trim()
                      ? customReason.trim()
                      : cancellationReason;
                    handleStatusUpdate(cancellationBooking.id, 'cancelled', finalReason);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {actionLoading === cancellationBooking.id ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Chat Modal */}
      {selectedChatBooking && (
        <ChatModal
          booking={selectedChatBooking}
          onClose={() => setSelectedChatBooking(null)}
        />
      )}

      {/* Review Modal */}
      {selectedReviewBooking && (
        <ReviewModal
          booking={selectedReviewBooking}
          onClose={() => setSelectedReviewBooking(null)}
          onReviewSubmitted={() => {
            fetchBookings();
            setSelectedReviewBooking(null);
          }}
        />
      )}

      {/* 1-CLICK PRINTABLE INVOICE MODAL */}
      {selectedInvoiceBooking && (
        <InvoiceModal
          booking={selectedInvoiceBooking}
          onClose={() => setSelectedInvoiceBooking(null)}
        />
      )}

    </div>
  );
};

export default Bookings;

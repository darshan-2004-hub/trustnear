import React, { useState, useEffect, useRef } from 'react';
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
  FileText
} from 'lucide-react';

const STATUS_PILLS = {
  pending: { bg: 'bg-[#fbbf24]/15 text-[#fbbf24] border-[#fbbf24]/30', label: 'Pending Approval' },
  accepted: { bg: 'bg-[#2dd4bf]/15 text-[#2dd4bf] border-[#2dd4bf]/30', label: 'Accepted' },
  in_progress: { bg: 'bg-[#6d5dfc]/15 text-[#6d5dfc] border-[#6d5dfc]/30', label: 'In Progress' },
  completed: { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Completed' },
  cancelled: { bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30', label: 'Cancelled' },
};

const Bookings = () => {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  const [selectedChatBooking, setSelectedChatBooking] = useState(null);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState(null);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);
  const socketRef = useRef(null);

  const isCustomer = user?.role === 'customer';
  const isProvider = user?.role === 'provider';

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings');
      if (res.data?.success) {
        setBookings(res.data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_user_notifications', { token });
    });

    socket.on('new_message_notification', (data) => {
      setToastNotification(data);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === data.booking_id ? { ...b, unread_count: (b.unread_count || 0) + 1 } : b
        )
      );

      setTimeout(() => {
        setToastNotification((curr) => (curr === data ? null : curr));
      }, 6000);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    setActionLoading(bookingId);
    try {
      const res = await api.patch(`/bookings/${bookingId}/status`, { status: newStatus });
      if (res.data?.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update appointment status.');
    } finally {
      setActionLoading(null);
    }
  };

  // Metrics Calculations
  const totalCount = bookings.length;
  const activeCount = bookings.filter((b) => ['pending', 'accepted', 'in_progress'].includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  const totalSpent = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (parseFloat(b.agreed_price) || 0), 0);

  const providerTrustScore = user?.trust_metrics?.trust_score || 94.2;

  // Filter list
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'active') return ['pending', 'accepted', 'in_progress'].includes(b.status);
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#1c2036] text-[#f1f3ff] py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Toast Alert Banner */}
      {toastNotification && (
        <div className="fixed top-20 right-6 z-50 bg-[#262b47] border border-[#6d5dfc] p-4 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs animate-in slide-in-from-top-4">
          <div className="w-8 h-8 rounded-full bg-[#6d5dfc]/20 flex items-center justify-center text-[#6d5dfc]">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-white">New Message from {toastNotification.sender_name}</p>
            <p className="text-[#a9b0d0]">{toastNotification.message_preview}</p>
          </div>
          <button
            onClick={() => {
              const b = bookings.find((item) => item.id === toastNotification.booking_id);
              if (b) setSelectedChatBooking(b);
              setToastNotification(null);
            }}
            className="btn-primary px-3 py-1 text-[11px]"
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
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {isCustomer ? 'My Bookings & Appointments' : 'Provider Service Dashboard'}
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#2dd4bf]/15 text-[#2dd4bf] border border-[#2dd4bf]/30">
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-[#a9b0d0] mt-1">
              {isCustomer
                ? 'Track your home service requests, coordinate live with assigned pros, and view official invoices.'
                : 'Manage incoming customer service requests, update work progress, and monitor your ML Trust Score.'}
            </p>
          </div>
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
            <div className="theme-card p-5 relative overflow-hidden flex flex-col justify-between border-[#2dd4bf]/40 bg-gradient-to-br from-[#262b47] to-[#1e2a47]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#2dd4bf] tracking-wider uppercase">
                  TOTAL COMPLETED SPENT
                </span>
                <IndianRupee className="w-4 h-4 text-[#2dd4bf]" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white flex items-center">
                  <IndianRupee className="w-5 h-5 text-[#2dd4bf]" />
                  {totalSpent.toFixed(0)}
                </p>
                <span className="text-xs text-[#a9b0d0] mt-1 block">
                  Across {completedCount} completed services
                </span>
              </div>
            </div>
          ) : (
            <div className="theme-card p-5 relative overflow-hidden flex flex-col justify-between border-[#2dd4bf]/40 bg-gradient-to-br from-[#262b47] to-[#1e2a47]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#2dd4bf] tracking-wider uppercase">
                  ML TRUST SCORE
                </span>
                <span className="text-xs text-[#2dd4bf]">★</span>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-[#2dd4bf]">
                  {Number(providerTrustScore).toFixed(1)} <span className="text-xs font-normal text-[#a9b0d0]">/ 100</span>
                </p>
                <div className="mt-2">
                  <TrustBadge score={providerTrustScore} providerName={user?.full_name} />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 border-b border-[#363d66] pb-3 text-xs font-semibold">
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
                  ? 'bg-[#6d5dfc] text-white font-bold shadow-md'
                  : 'text-[#a9b0d0] hover:text-white hover:bg-[#262b47]'
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
              <div key={n} className="theme-card p-6 h-24 animate-pulse" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="theme-card p-12 text-center text-xs text-[#a9b0d0]">
            <Calendar className="w-10 h-10 text-[#6d5dfc] mx-auto mb-3 opacity-60" />
            <p className="text-sm font-bold text-white mb-1">No appointments found</p>
            <p>You don't have any bookings in this filter category.</p>
          </div>
        ) : (
          <div className="theme-card p-4 sm:p-6 overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#363d66] text-[#a9b0d0] uppercase tracking-wider text-[10px]">
                    <th className="pb-3">{isCustomer ? 'Assigned Service Provider' : 'Customer Name'}</th>
                    <th className="pb-3">Service Details</th>
                    <th className="pb-3">Scheduled Date & Time</th>
                    <th className="pb-3">Service Fee</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#363d66]/60">
                  {filteredBookings.map((b) => {
                    const counterpartName = isCustomer
                      ? b.counterpart?.full_name || b.provider_name || 'Verified Pro'
                      : b.counterpart?.full_name || b.customer_name || 'Customer';

                    const pill = STATUS_PILLS[b.status] || STATUS_PILLS.pending;

                    return (
                      <tr key={b.id} className="hover:bg-[#1c2036]/50 transition-colors">
                        {/* Name Column */}
                        <td className="py-3.5 pr-2">
                          <p className="font-bold text-white">{counterpartName}</p>
                          <p className="text-[11px] text-[#a9b0d0]">{b.customer_address || b.service_address}</p>
                        </td>

                        {/* Title & Category */}
                        <td className="py-3.5 pr-2">
                          <p className="font-semibold text-white">{b.service_title}</p>
                          <span className="text-[10px] text-[#6d5dfc] font-semibold">{b.service_category}</span>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 pr-2 text-[#a9b0d0] whitespace-nowrap">
                          {b.booking_date} • {b.booking_time}
                        </td>

                        {/* Fee */}
                        <td className="py-3.5 pr-2 font-bold text-white whitespace-nowrap">
                          ₹{b.agreed_price || 350}
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
                            className="btn-secondary px-3 py-1.5 text-xs font-semibold inline-flex items-center space-x-1 relative cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#6d5dfc]" />
                            <span>Chat</span>
                            {b.unread_count > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#d946ef] text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                                {b.unread_count}
                              </span>
                            )}
                          </button>

                          {/* 1-CLICK PRINTABLE INVOICE (for Completed Bookings) */}
                          {b.status === 'completed' && (
                            <button
                              onClick={() => setSelectedInvoiceBooking(b)}
                              className="btn-secondary px-3 py-1.5 text-xs font-bold inline-flex items-center space-x-1 hover:border-[#2dd4bf] text-[#2dd4bf] cursor-pointer"
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
                                className="px-3 py-1.5 rounded-xl bg-[#2dd4bf]/20 text-[#2dd4bf] hover:bg-[#2dd4bf]/30 font-bold text-xs cursor-pointer"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(b.id, 'cancelled')}
                                disabled={actionLoading === b.id}
                                className="px-2.5 py-1.5 text-rose-400 hover:bg-rose-500/10 rounded-xl font-medium text-xs cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {isProvider && b.status === 'accepted' && (
                            <button
                              onClick={() => handleStatusUpdate(b.id, 'in_progress')}
                              disabled={actionLoading === b.id}
                              className="px-3 py-1.5 rounded-xl bg-[#6d5dfc]/20 text-[#6d5dfc] hover:bg-[#6d5dfc]/30 font-bold text-xs cursor-pointer"
                            >
                              Start Job
                            </button>
                          )}

                          {isProvider && b.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusUpdate(b.id, 'completed')}
                              disabled={actionLoading === b.id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold text-xs cursor-pointer"
                            >
                              Complete
                            </button>
                          )}

                          {/* CUSTOMER ACTIONS */}
                          {isCustomer && b.status === 'completed' && (
                            <button
                              onClick={() => setSelectedReviewBooking(b)}
                              className="px-3 py-1.5 rounded-xl bg-[#fbbf24]/20 text-[#fbbf24] hover:bg-[#fbbf24]/30 font-bold text-xs inline-flex items-center space-x-1 cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5 fill-[#fbbf24]" />
                              <span>Rate Service</span>
                            </button>
                          )}

                          {isCustomer && b.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(b.id, 'cancelled')}
                              disabled={actionLoading === b.id}
                              className="px-2.5 py-1.5 text-rose-400 hover:bg-rose-500/10 rounded-xl font-medium text-xs cursor-pointer"
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
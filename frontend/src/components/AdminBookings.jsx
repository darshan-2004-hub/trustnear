import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit3, 
  RefreshCw,
  FileText,
  AlertOctagon,
  ShieldAlert
} from 'lucide-react';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    total_bookings: 0,
    pending_bookings: 0,
    accepted_bookings: 0,
    in_progress_bookings: 0,
    completed_bookings: 0,
    cancelled_bookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [issueFilter, setIssueFilter] = useState('all');

  // Modals
  const [detailModalBooking, setDetailModalBooking] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bookingDetail, setBookingDetail] = useState(null);

  const [correctionModal, setCorrectionModal] = useState({
    open: false,
    booking: null,
    newStatus: '',
    reason: '',
    loading: false,
    error: ''
  });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusFilter,
        issue: issueFilter
      });
      if (searchTerm.trim()) params.append('q', searchTerm.trim());
      if (dateFilter) params.append('date', dateFilter);

      const res = await api.get(`/admin/bookings?${params.toString()}`);
      if (res.data?.success) {
        setBookings(res.data.bookings || []);
        setTotalCount(res.data.total_count || 0);
        setTotalPages(res.data.total_pages || 1);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } else {
        setError(res.data?.message || 'Failed to fetch bookings.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading bookings from server.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, issueFilter, searchTerm, dateFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const openDetailModal = async (bookingId) => {
    setDetailModalBooking(bookingId);
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/bookings/${bookingId}`);
      if (res.data?.success) {
        setBookingDetail(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Could not load booking details.');
      setDetailModalBooking(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openCorrectionModal = (booking) => {
    setCorrectionModal({
      open: true,
      booking,
      newStatus: booking.status,
      reason: '',
      loading: false,
      error: ''
    });
  };

  const handleStatusCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!correctionModal.reason.trim()) {
      setCorrectionModal(prev => ({ ...prev, error: 'A justification reason is required.' }));
      return;
    }
    if (correctionModal.newStatus === correctionModal.booking.status) {
      setCorrectionModal(prev => ({ ...prev, error: 'Please choose a different status.' }));
      return;
    }

    setCorrectionModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await api.patch(`/admin/bookings/${correctionModal.booking.id}/status`, {
        status: correctionModal.newStatus,
        reason: correctionModal.reason.trim()
      });
      if (res.data?.success) {
        setCorrectionModal({ open: false, booking: null, newStatus: '', reason: '', loading: false, error: '' });
        fetchBookings();
        if (bookingDetail && bookingDetail.booking?.id === correctionModal.booking.id) {
          openDetailModal(correctionModal.booking.id);
        }
      }
    } catch (err) {
      setCorrectionModal(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to update booking status.'
      }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">In Progress</span>;
      case 'accepted':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Accepted</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
    }
  };

  return (
    <div className="space-y-6 text-xs text-[#172033]">
      
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#e2e8f0] shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#475569] block">Total</span>
          <p className="text-xl font-black text-[#172033] mt-0.5">{stats.total_bookings}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-700 block">Pending</span>
          <p className="text-xl font-black text-amber-600 mt-0.5">{stats.pending_bookings}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-indigo-700 block">Accepted</span>
          <p className="text-xl font-black text-indigo-600 mt-0.5">{stats.accepted_bookings}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-blue-700 block">In Progress</span>
          <p className="text-xl font-black text-blue-600 mt-0.5">{stats.in_progress_bookings}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Completed</span>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{stats.completed_bookings}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-rose-700 block">Cancelled</span>
          <p className="text-xl font-black text-rose-600 mt-0.5">{stats.cancelled_bookings}</p>
        </div>
      </div>

      {/* Filter / Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, customer, provider, service..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#cbd5e1] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[#475569] font-medium text-[11px]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 rounded-xl border border-[#cbd5e1] text-xs bg-white font-medium cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Special Issue Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[#475569] font-medium text-[11px]">Issues:</span>
              <select
                value={issueFilter}
                onChange={(e) => { setIssueFilter(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 rounded-xl border border-[#cbd5e1] text-xs bg-white font-medium cursor-pointer"
              >
                <option value="all">All Bookings</option>
                <option value="cancelled">Cancelled</option>
                <option value="disputed">Disputed / No-Show Reported</option>
                <option value="incomplete">Overdue / Incomplete</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[#475569] font-medium text-[11px]">Date:</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 rounded-xl border border-[#cbd5e1] text-xs bg-white cursor-pointer"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => { setDateFilter(''); setPage(1); }}
                  className="text-[10px] text-rose-600 hover:underline font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition cursor-pointer"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#475569] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="font-semibold">Loading platform bookings...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="font-bold">{error}</p>
            <button
              onClick={fetchBookings}
              className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-[#475569] space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-[#172033]">No bookings found</p>
            <p className="text-[11px]">No booking records match the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-[#e2e8f0] text-[#475569] text-[10px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Scheduled Slot</th>
                  <th className="py-3 px-4">Agreed Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#172033]">
                      #{b.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#172033]">{b.service_title}</div>
                      <span className="text-[10px] text-blue-700 font-semibold">{b.service_category}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#172033]">{b.customer_name}</div>
                      <div className="text-[11px] text-[#475569]">{b.customer_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#172033]">{b.provider_name}</div>
                      <div className="text-[11px] text-[#475569]">{b.provider_email}</div>
                    </td>
                    <td className="py-3 px-4 text-[#475569]">
                      <div className="flex items-center space-x-1 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{b.booking_date}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{b.booking_time}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#172033]">
                      {b.agreed_price ? `₹${b.agreed_price}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        {getStatusBadge(b.status)}
                        {b.has_no_show && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            Disputed / No-Show
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openDetailModal(b.id)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172033] font-semibold text-[11px] transition cursor-pointer inline-flex items-center space-x-1"
                        title="View Details"
                      >
                        <Eye className="w-3 h-3 text-[#475569]" />
                        <span>Details</span>
                      </button>
                      <button
                        onClick={() => openCorrectionModal(b)}
                        className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[11px] transition cursor-pointer inline-flex items-center space-x-1"
                        title="Administrative Status Correction"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Correct</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#475569]">
            <span>
              Showing {bookings.length} of {totalCount} bookings (Page {page} of {totalPages})
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl border border-[#cbd5e1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-xl border border-[#cbd5e1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {detailModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="text-base font-bold text-[#172033]">
                Booking #{detailModalBooking} Details
              </h3>
              <button
                onClick={() => { setDetailModalBooking(null); setBookingDetail(null); }}
                className="text-[#475569] hover:text-[#172033] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {detailLoading || !bookingDetail ? (
              <div className="py-12 text-center text-[#475569] space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p>Loading booking inspection data...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                
                {/* Service & Slot */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-[#e2e8f0] grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-[#475569] uppercase font-bold block">Service</span>
                    <p className="font-bold text-[#172033]">{bookingDetail.booking.service_title}</p>
                    <span className="text-blue-700 font-semibold">{bookingDetail.booking.service_category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#475569] uppercase font-bold block">Scheduled Slot</span>
                    <p className="font-bold text-[#172033]">{bookingDetail.booking.booking_date} at {bookingDetail.booking.booking_time}</p>
                    <p className="text-[#475569]">Status: {getStatusBadge(bookingDetail.booking.status)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#475569] uppercase font-bold block">Agreed Price</span>
                    <p className="font-bold text-[#172033] text-sm">₹{bookingDetail.booking.agreed_price || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#475569] uppercase font-bold block">Service Location</span>
                    <p className="text-[#172033] font-medium">{bookingDetail.booking.customer_address}</p>
                  </div>
                </div>

                {/* Customer & Provider side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-[#e2e8f0]">
                    <span className="text-[10px] uppercase font-bold text-blue-700 block">Customer</span>
                    <p className="font-bold text-[#172033] mt-1">{bookingDetail.customer.full_name}</p>
                    <p className="text-[#475569]">{bookingDetail.customer.email}</p>
                    <p className="text-[#475569]">{bookingDetail.customer.phone || 'No phone'}</p>
                    <span className="text-[10px] font-semibold text-slate-500">Account: {bookingDetail.customer.account_status}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-[#e2e8f0]">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">Provider</span>
                    <p className="font-bold text-[#172033] mt-1">{bookingDetail.provider.full_name}</p>
                    <p className="text-[#475569]">{bookingDetail.provider.email}</p>
                    <p className="text-[#475569]">{bookingDetail.provider.phone || 'No phone'}</p>
                    <span className="text-[10px] font-semibold text-slate-500">Trade: {bookingDetail.provider.trade_category || '—'}</span>
                  </div>
                </div>

                {/* Cancellation Info if cancelled */}
                {bookingDetail.booking.status === 'cancelled' && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-700 uppercase block">Cancellation Information</span>
                    <p className="text-[#172033] mt-0.5"><strong>Reason:</strong> {bookingDetail.booking.cancellation_reason || 'No reason provided'}</p>
                    <p className="text-[11px] text-[#475569] mt-0.5">Cancelled by User #{bookingDetail.booking.cancelled_by || 'Unknown'}</p>
                  </div>
                )}

                {/* Associated Review if any */}
                {bookingDetail.review && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-[#e2e8f0] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#475569] uppercase">Submitted Review</span>
                      <span className="text-amber-600 font-bold">★ {bookingDetail.review.rating}/5</span>
                    </div>
                    <p className="italic text-[#172033]">"{bookingDetail.review.review_text}"</p>
                    <div className="flex items-center space-x-2 text-[10px] text-[#475569]">
                      <span>Approved: {bookingDetail.review.is_approved_by_admin ? 'Yes' : 'No'}</span>
                      {bookingDetail.review.is_deleted && <span className="text-rose-600 font-bold">• Removed by Admin</span>}
                    </div>
                  </div>
                )}

                {/* No Show Reports if any */}
                {bookingDetail.no_show_reports && bookingDetail.no_show_reports.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center space-x-1">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>Reported No-Show Incidents ({bookingDetail.no_show_reports.length})</span>
                    </span>
                    {bookingDetail.no_show_reports.map((ns) => (
                      <div key={ns.id} className="p-2 bg-white rounded border border-amber-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#172033]">Report #{ns.id}</span>
                          <span className="uppercase text-[10px] font-black text-amber-700">{ns.status}</span>
                        </div>
                        <p className="text-[11px] text-[#475569] mt-0.5"><strong>Reason:</strong> {ns.reason}</p>
                        <span className="text-[10px] text-slate-400">{ns.reported_at}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Audit History */}
                {bookingDetail.audit_history && bookingDetail.audit_history.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[#475569] uppercase block">Administrative Audit Log</span>
                    <div className="space-y-1">
                      {bookingDetail.audit_history.map((ah) => (
                        <div key={ah.id} className="p-2 bg-slate-50 border border-[#e2e8f0] rounded-lg text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-700">{ah.action}</span>
                            <span className="text-[10px] text-[#475569]">{ah.created_at}</span>
                          </div>
                          {ah.details && (
                            <p className="text-[#475569] mt-0.5">
                              {ah.details.reason ? `Reason: ${ah.details.reason}` : JSON.stringify(ah.details)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#e2e8f0]">
              <button
                onClick={() => { setDetailModalBooking(null); setBookingDetail(null); }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172033] font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS CORRECTION MODAL */}
      {correctionModal.open && correctionModal.booking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="text-base font-bold text-[#172033] flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Admin Status Correction</span>
              </h3>
              <button
                onClick={() => setCorrectionModal({ open: false, booking: null, newStatus: '', reason: '', loading: false, error: '' })}
                className="text-[#475569] hover:text-[#172033] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStatusCorrectionSubmit} className="space-y-4 text-xs">
              <div>
                <p className="text-[#475569]">
                  Correcting status for Booking <strong className="text-[#172033]">#{correctionModal.booking.id}</strong> ({correctionModal.booking.service_title}).
                </p>
                <p className="text-[11px] text-[#475569] mt-0.5">
                  Current Status: <strong className="uppercase">{correctionModal.booking.status}</strong>
                </p>
              </div>

              {correctionModal.error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[11px]">
                  {correctionModal.error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Target Status
                </label>
                <select
                  value={correctionModal.newStatus}
                  onChange={(e) => setCorrectionModal(prev => ({ ...prev, newStatus: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[#cbd5e1] text-xs font-semibold bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Justification Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={correctionModal.reason}
                  onChange={(e) => setCorrectionModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Explain why this administrative status correction is necessary..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#cbd5e1] text-xs focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-[#475569]">This reason will be recorded in the immutable Admin Audit Log.</span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setCorrectionModal({ open: false, booking: null, newStatus: '', reason: '', loading: false, error: '' })}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172033] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctionModal.loading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {correctionModal.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Confirm Correction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminBookings;

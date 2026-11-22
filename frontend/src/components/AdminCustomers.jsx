import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users,
  Search,
  Filter,
  Eye,
  Edit2,
  UserX,
  UserCheck,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileText
} from 'lucide-react';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    total_customers: 0,
    active_customers: 0,
    suspended_customers: 0,
    recent_customers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [detailModalCustomer, setDetailModalCustomer] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editModalCustomer, setEditModalCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({ full_name: '', phone: '' });
  const [editErrors, setEditErrors] = useState({});
  const [submittingAction, setSubmittingAction] = useState(false);

  // Confirm dialog state: { type: 'suspend' | 'reactivate' | 'delete', customer: {...}, reason: '' }
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        status: statusFilter
      });
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }

      const res = await api.get(`/admin/customers?${params.toString()}`);
      if (res.data?.success) {
        setCustomers(res.data.customers || []);
        setStats(res.data.stats || {
          total_customers: 0,
          active_customers: 0,
          suspended_customers: 0,
          recent_customers: 0
        });
        setTotalPages(res.data.total_pages || 1);
        setTotalCount(res.data.total_count || 0);
      } else {
        setError(res.data?.message || 'Failed to load customers.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error communicating with backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  // Open detail modal with full booking history
  const handleOpenDetails = async (customerId) => {
    setDetailLoading(true);
    setDetailModalCustomer(null);
    try {
      const res = await api.get(`/admin/customers/${customerId}`);
      if (res.data?.success) {
        setDetailModalCustomer(res.data);
      } else {
        alert(res.data?.message || 'Failed to fetch customer details.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error fetching customer details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (customer) => {
    setEditModalCustomer(customer);
    setEditFormData({
      full_name: customer.full_name || '',
      phone: customer.phone || ''
    });
    setEditErrors({});
  };

  // Submit edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!editFormData.full_name.trim() || editFormData.full_name.trim().length < 2) {
      errs.full_name = 'Full name must be at least 2 characters.';
    }
    if (editFormData.phone.trim()) {
      const clean = editFormData.phone.replace(/[\s\-\+]/g, '');
      if (clean.length < 10) {
        errs.phone = 'Mobile number must be at least 10 digits.';
      }
    }
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await api.patch(`/admin/customers/${editModalCustomer.id}`, {
        full_name: editFormData.full_name.trim(),
        phone: editFormData.phone.trim() || null
      });

      if (res.data?.success) {
        setEditModalCustomer(null);
        showSuccess(`Customer #${editModalCustomer.id} profile updated.`);
        fetchCustomers();
      } else {
        setEditErrors({ server: res.data?.message || 'Failed to update customer.' });
      }
    } catch (err) {
      setEditErrors({ server: err.response?.data?.message || 'Server error updating customer.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Execute confirm action (suspend, reactivate, delete)
  const handleExecuteAction = async () => {
    if (!confirmDialog) return;
    const { type, customer, reason } = confirmDialog;
    setSubmittingAction(true);

    try {
      if (type === 'suspend') {
        const res = await api.post(`/admin/customers/${customer.id}/suspend`, {
          reason: reason || 'Administrative policy violation'
        });
        if (res.data?.success) {
          showSuccess(`Customer #${customer.id} (${customer.full_name}) has been suspended.`);
        }
      } else if (type === 'reactivate') {
        const res = await api.post(`/admin/customers/${customer.id}/reactivate`);
        if (res.data?.success) {
          showSuccess(`Customer #${customer.id} (${customer.full_name}) has been reactivated.`);
        }
      } else if (type === 'delete') {
        const res = await api.delete(`/admin/customers/${customer.id}`);
        if (res.data?.success) {
          showSuccess(`Customer #${customer.id} safely anonymized. Historical records preserved.`);
        }
      }
      setConfirmDialog(null);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const showSuccess = (msg) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(''), 4000);
  };

  return (
    <div className="space-y-6 text-[#172033]">
      {/* SUCCESS TOAST */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 shadow-xs transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#475569] mb-1">
            <span>TOTAL CUSTOMERS</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-[#172033]">{stats.total_customers}</p>
          <span className="text-[11px] text-[#475569] mt-1">Platform registered client accounts</span>
        </div>

        {/* Active Customers */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 mb-1">
            <span>ACTIVE ACCOUNTS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-700">{stats.active_customers}</p>
          <span className="text-[11px] text-[#475569] mt-1">Authorized for bookings</span>
        </div>

        {/* Suspended Customers */}
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700 mb-1">
            <span>SUSPENDED ACCOUNTS</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-rose-700">{stats.suspended_customers}</p>
          <span className="text-[11px] text-[#475569] mt-1">New bookings blocked</span>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#475569] mb-1">
            <span>NEW CLIENTS (30 DAYS)</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-[#172033]">{stats.recent_customers}</p>
          <span className="text-[11px] text-[#475569] mt-1">Onboarded in last month</span>
        </div>
      </div>

      {/* 2. SEARCH, FILTERS & ACTION BAR */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full md:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-[#e2e8f0] rounded-xl outline-none focus:border-blue-500 focus:bg-white text-[#172033]"
            />
          </div>
          <button
            type="submit"
            className="btn-primary py-2 px-3 text-xs font-bold rounded-xl shrink-0 cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => { setStatusFilter('all'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-blue-700 shadow-2xs' : 'text-[#475569] hover:text-[#172033]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setStatusFilter('active'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-[#475569] hover:text-[#172033]'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => { setStatusFilter('suspended'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'suspended' ? 'bg-white text-rose-700 shadow-2xs' : 'text-[#475569] hover:text-[#172033]'
              }`}
            >
              Suspended
            </button>
          </div>

          <button
            onClick={() => { setPage(1); fetchCustomers(); }}
            disabled={loading}
            className="p-2 rounded-xl border border-[#e2e8f0] text-[#475569] hover:text-[#172033] hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. CUSTOMER DATA TABLE */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#475569]">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2 opacity-60" />
            <p className="font-bold text-[#172033]">Loading customers...</p>
            <p>Fetching real database records</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-70" />
            <p className="font-bold">{error}</p>
            <button
              onClick={fetchCustomers}
              className="mt-3 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-bold hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#475569]">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-[#172033]">No customers match your criteria</p>
            <p>Try searching with another name, email or changing the status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-slate-50/70 text-[#475569] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Bookings</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
                          {c.full_name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <p className="font-bold text-[#172033]">{c.full_name}</p>
                          <span className="text-[10px] text-[#475569]">ID #{c.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#475569]">
                      <div className="space-y-0.5">
                        <p className="text-[#172033] font-medium">{c.email}</p>
                        <p className="text-[11px]">{c.phone || 'No phone provided'}</p>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {c.account_status === 'suspended' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Suspended
                        </span>
                      ) : c.account_status === 'deleted' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Anonymized
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-[11px]">
                        <span className="font-bold text-[#172033]">{c.total_bookings} total</span>
                        <div className="text-[10px] text-[#475569] space-x-1.5">
                          <span className="text-emerald-700 font-semibold">{c.completed_bookings} completed</span>
                          <span>•</span>
                          <span className="text-rose-600 font-semibold">{c.cancelled_bookings} cancelled</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#475569] text-[11px]">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => handleOpenDetails(c.id)}
                          className="p-1.5 rounded-lg border border-[#e2e8f0] text-[#475569] hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                          title="View Details & History"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Profile */}
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg border border-[#e2e8f0] text-[#475569] hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-all cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Suspend or Reactivate */}
                        {c.account_status === 'suspended' ? (
                          <button
                            onClick={() => setConfirmDialog({ type: 'reactivate', customer: c })}
                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100 transition-colors cursor-pointer text-[11px]"
                            title="Reactivate Account"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmDialog({ type: 'suspend', customer: c, reason: '' })}
                            className="p-1.5 rounded-lg border border-[#e2e8f0] text-[#475569] hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Suspend Account"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Safe Delete / Anonymize */}
                        <button
                          onClick={() => setConfirmDialog({ type: 'delete', customer: c })}
                          className="p-1.5 rounded-lg border border-[#e2e8f0] text-[#475569] hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-all cursor-pointer"
                          title="Safe Anonymization Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. PAGINATION FOOTER */}
        {!loading && !error && customers.length > 0 && (
          <div className="p-3 border-t border-[#e2e8f0] bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#475569]">
            <span>
              Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, totalCount)} of {totalCount} customers
            </span>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-[#e2e8f0] text-[#475569] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 py-1 font-bold text-[#172033]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-[#e2e8f0] text-[#475569] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CUSTOMER DETAIL & BOOKING HISTORY */}
      {/* ========================================================================= */}
      {(detailLoading || detailModalCustomer) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[#e2e8f0] shadow-2xl">
            <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#172033]">Customer Record & Booking History</h3>
                <p className="text-xs text-[#475569]">Confidential administrative audit details</p>
              </div>
              <button
                onClick={() => setDetailModalCustomer(null)}
                className="p-1.5 text-[#475569] hover:text-[#172033] rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {detailLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2 opacity-60" />
                  <p className="font-bold">Fetching profile and booking history...</p>
                </div>
              ) : (
                <>
                  {/* Customer Profile Summary */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-[#e2e8f0] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-[#475569] uppercase">Full Name</span>
                      <p className="font-bold text-[#172033] text-sm">{detailModalCustomer.customer?.full_name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#475569] uppercase">Email</span>
                      <p className="font-medium text-[#172033] truncate">{detailModalCustomer.customer?.email}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#475569] uppercase">Phone</span>
                      <p className="font-medium text-[#172033]">{detailModalCustomer.customer?.phone || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#475569] uppercase">Status</span>
                      <p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          detailModalCustomer.customer?.account_status === 'suspended'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {detailModalCustomer.customer?.account_status}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Financial & Activity KPI Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white border border-[#e2e8f0] rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-[#475569]">Total Bookings</span>
                      <p className="text-xl font-black text-[#172033]">{detailModalCustomer.booking_metrics?.total_bookings}</p>
                    </div>
                    <div className="p-3 bg-white border border-[#e2e8f0] rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-700">Completed Jobs</span>
                      <p className="text-xl font-black text-emerald-700">{detailModalCustomer.booking_metrics?.completed_bookings}</p>
                    </div>
                    <div className="p-3 bg-white border border-[#e2e8f0] rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-rose-700">Cancellations</span>
                      <p className="text-xl font-black text-rose-700">{detailModalCustomer.booking_metrics?.cancelled_bookings}</p>
                    </div>
                    <div className="p-3 bg-white border border-[#e2e8f0] rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-blue-700">Total Spent</span>
                      <p className="text-xl font-black text-blue-700">₹{detailModalCustomer.booking_metrics?.total_spent?.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Booking History Table */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#172033] text-sm flex items-center space-x-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Historical Booking Ledger</span>
                    </h4>

                    {detailModalCustomer.bookings?.length === 0 ? (
                      <div className="p-6 text-center text-[#475569] bg-slate-50 rounded-xl border border-[#e2e8f0]">
                        No bookings placed by this customer yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#e2e8f0]">
                              <th className="py-2.5 px-3">Service</th>
                              <th className="py-2.5 px-3">Provider</th>
                              <th className="py-2.5 px-3">Date & Time</th>
                              <th className="py-2.5 px-3">Price</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e2e8f0]">
                            {detailModalCustomer.bookings?.map((b) => (
                              <tr key={b.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-semibold text-[#172033]">
                                  {b.service_title}
                                  <span className="block text-[10px] text-[#475569] font-normal">{b.service_category}</span>
                                </td>
                                <td className="py-2.5 px-3 text-[#475569] font-medium">{b.provider_name}</td>
                                <td className="py-2.5 px-3 text-[#475569]">
                                  {b.booking_date} {b.booking_time}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-[#172033]">
                                  {b.agreed_price ? `₹${b.agreed_price}` : '—'}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    b.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : b.status === 'cancelled'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}>
                                    {b.status}
                                  </span>
                                  {b.cancellation_reason && (
                                    <span className="block text-[10px] text-rose-600 mt-0.5 truncate max-w-[150px]">
                                      {b.cancellation_reason}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-[#e2e8f0] bg-slate-50 flex justify-end">
              <button
                onClick={() => setDetailModalCustomer(null)}
                className="btn-secondary py-2 px-4 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT CUSTOMER PROFILE */}
      {/* ========================================================================= */}
      {editModalCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#e2e8f0] shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#172033]">Edit Customer Profile</h3>
                <p className="text-xs text-[#475569]">Customer ID #{editModalCustomer.id}</p>
              </div>
              <button
                onClick={() => setEditModalCustomer(null)}
                className="p-1.5 text-[#475569] hover:text-[#172033] rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              {editErrors.server && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold">
                  {editErrors.server}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-xl outline-none focus:border-blue-500 text-xs text-[#172033]"
                />
                {editErrors.full_name && (
                  <p className="text-rose-500 text-[10px] mt-1">{editErrors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-xl outline-none focus:border-blue-500 text-xs text-[#172033]"
                />
                {editErrors.phone && (
                  <p className="text-rose-500 text-[10px] mt-1">{editErrors.phone}</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-[#e2e8f0] text-[11px] text-[#475569] space-y-1">
                <p className="font-bold text-[#172033]">Protected System Fields:</p>
                <p>Email: <span className="font-mono text-[10px]">{editModalCustomer.email}</span></p>
                <p>Role: <span className="font-bold text-blue-600">customer</span> (Cannot be altered)</p>
                <p className="text-[10px] italic">Account authentication secrets remain protected.</p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditModalCustomer(null)}
                  className="btn-secondary py-2 px-3 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="btn-primary py-2 px-4 text-xs font-bold rounded-xl cursor-pointer"
                >
                  {submittingAction ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRM ACTION DIALOG (Suspend, Reactivate, Safe Delete) */}
      {/* ========================================================================= */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#e2e8f0] shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmDialog.type === 'delete'
                  ? 'bg-rose-100 text-rose-600'
                  : confirmDialog.type === 'suspend'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
              }`}>
                {confirmDialog.type === 'delete' ? (
                  <Trash2 className="w-5 h-5" />
                ) : confirmDialog.type === 'suspend' ? (
                  <UserX className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#172033] capitalize">
                  Confirm Account {confirmDialog.type}
                </h3>
                <p className="text-xs text-[#475569]">
                  Target: {confirmDialog.customer?.full_name} (#{confirmDialog.customer?.id})
                </p>
              </div>
            </div>

            {confirmDialog.type === 'suspend' && (
              <div className="space-y-3">
                <p className="text-[#475569] leading-relaxed">
                  Suspending this customer will immediately revoke their ability to request new bookings and submit reviews. Historical records and invoices will remain intact.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                    Suspension Reason
                  </label>
                  <input
                    type="text"
                    value={confirmDialog.reason || ''}
                    onChange={(e) => setConfirmDialog({ ...confirmDialog, reason: e.target.value })}
                    placeholder="e.g. Terms violation or suspicious booking activity"
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-xl outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>
            )}

            {confirmDialog.type === 'reactivate' && (
              <p className="text-[#475569] leading-relaxed">
                Reactivating this account will restore full booking privileges and permit the customer to utilize platform services.
              </p>
            )}

            {confirmDialog.type === 'delete' && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                <p className="font-bold flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Safe Anonymization Protection</span>
                </p>
                <p className="text-[11px] leading-relaxed text-rose-700">
                  This action permanently strips all Personally Identifiable Information (name, email, phone) and disables the account. <strong>Historical booking, review, and accounting ledgers will be strictly preserved</strong> without cascading data loss.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary py-2 px-3 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={submittingAction}
                className={`py-2 px-4 text-xs font-bold rounded-xl cursor-pointer text-white shadow-xs ${
                  confirmDialog.type === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmDialog.type === 'suspend'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {submittingAction ? 'Processing...' : `Confirm ${confirmDialog.type}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;

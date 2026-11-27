import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  AlertOctagon, 
  CheckCircle2, 
  XCircle, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Calendar,
  Clock,
  UserCheck
} from 'lucide-react';

const AdminNoShows = () => {
  const [noShows, setNoShows] = useState([]);
  const [stats, setStats] = useState({
    total_no_shows: 0,
    pending_no_shows: 0,
    confirmed_no_shows: 0,
    dismissed_no_shows: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Action loading
  const [actionLoading, setActionLoading] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    report: null,
    loading: false,
    error: ''
  });

  const [dismissModal, setDismissModal] = useState({
    open: false,
    report: null,
    reason: '',
    loading: false,
    error: ''
  });

  const fetchNoShows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusFilter
      });
      if (searchTerm.trim()) params.append('q', searchTerm.trim());

      const res = await api.get(`/admin/no-shows?${params.toString()}`);
      if (res.data?.success) {
        setNoShows(res.data.no_shows || []);
        setTotalCount(res.data.total_count || 0);
        setTotalPages(res.data.total_pages || 1);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } else {
        setError(res.data?.message || 'Failed to fetch no-show reports.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading no-shows from server.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, searchTerm]);

  useEffect(() => {
    fetchNoShows();
  }, [fetchNoShows]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchNoShows();
  };

  const openConfirmModal = (report) => {
    setConfirmModal({
      open: true,
      report,
      loading: false,
      error: ''
    });
  };

  const handleConfirmSubmit = async () => {
    setConfirmModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await api.patch(`/admin/no-shows/${confirmModal.report.id}/confirm`);
      if (res.data?.success) {
        setConfirmModal({ open: false, report: null, loading: false, error: '' });
        fetchNoShows();
      }
    } catch (err) {
      setConfirmModal(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to confirm no-show report.'
      }));
    }
  };

  const openDismissModal = (report) => {
    setDismissModal({
      open: true,
      report,
      reason: '',
      loading: false,
      error: ''
    });
  };

  const handleDismissSubmit = async (e) => {
    e.preventDefault();
    if (!dismissModal.reason.trim()) {
      setDismissModal(prev => ({ ...prev, error: 'A justification reason is required to dismiss a no-show.' }));
      return;
    }

    setDismissModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await api.patch(`/admin/no-shows/${dismissModal.report.id}/dismiss`, {
        reason: dismissModal.reason.trim()
      });
      if (res.data?.success) {
        setDismissModal({ open: false, report: null, reason: '', loading: false, error: '' });
        fetchNoShows();
      }
    } catch (err) {
      setDismissModal(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to dismiss no-show report.'
      }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Confirmed No-Show</span>;
      case 'dismissed':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Dismissed</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Pending Review</span>;
    }
  };

  return (
    <div className="space-y-6 text-xs text-[#172033]">
      
      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#e2e8f0] shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#475569] block">Total Reports</span>
          <p className="text-xl font-black text-[#172033] mt-0.5">{stats.total_no_shows}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-700 block">Pending Review</span>
          <p className="text-xl font-black text-amber-600 mt-0.5">{stats.pending_no_shows}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-rose-700 block">Confirmed</span>
          <p className="text-xl font-black text-rose-600 mt-0.5">{stats.confirmed_no_shows}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-700 block">Dismissed</span>
          <p className="text-xl font-black text-slate-700 mt-0.5">{stats.dismissed_no_shows}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search provider, customer, or reason..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#cbd5e1] text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <span className="text-[#475569] font-medium text-[11px]">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 rounded-xl border border-[#cbd5e1] text-xs bg-white font-medium cursor-pointer"
            >
              <option value="all">All Reports</option>
              <option value="reported">Pending Review</option>
              <option value="confirmed">Confirmed</option>
              <option value="dismissed">Dismissed</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl btn-primary font-bold transition cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Reports List */}
      <div className="glass-card rounded-2xl p-6">
        {loading ? (
          <div className="py-16 text-center text-[#475569] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
            <p className="font-semibold">Loading no-show incident reports...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="font-bold">{error}</p>
            <button
              onClick={fetchNoShows}
              className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : noShows.length === 0 ? (
          <div className="text-center py-16 text-[#475569] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto opacity-60" />
            <p className="font-bold text-[#172033]">Zero No-Show Reports</p>
            <p className="text-[11px]">No provider no-show incident reports found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {noShows.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-slate-50 border border-[#e2e8f0] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#172033] text-sm">Report #{r.id}</span>
                    <span className="text-[#475569] mx-2">•</span>
                    <span className="text-blue-700 font-semibold">Booking #{r.booking_id} ({r.service_title})</span>
                  </div>
                  <div>
                    {getStatusBadge(r.status)}
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-[#e2e8f0]">
                  <div>
                    <span className="text-[10px] text-[#475569] uppercase font-bold block">Reporting Customer</span>
                    <p className="font-bold text-[#172033]">{r.customer_name}</p>
                    <p className="text-[11px] text-[#475569]">{r.customer_email} {r.customer_phone ? `• ${r.customer_phone}` : ''}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#475569] uppercase font-bold block">Accused Provider</span>
                    <p className="font-bold text-indigo-700">{r.provider_name}</p>
                    <p className="text-[11px] text-[#475569]">{r.provider_email} {r.provider_phone ? `• ${r.provider_phone}` : ''}</p>
                  </div>
                </div>

                {/* Stated customer reason */}
                <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Customer Incident Statement:</span>
                  <p className="text-[#172033] mt-0.5 italic">"{r.reason}"</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0] text-[#475569] text-[11px]">
                  <span>Reported at: {r.reported_at ? new Date(r.reported_at).toLocaleString() : '—'}</span>

                  {/* Actions only if reported/pending */}
                  {r.status === 'reported' ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openConfirmModal(r)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition cursor-pointer flex items-center space-x-1"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>Confirm No-Show</span>
                      </button>
                      <button
                        onClick={() => openDismissModal(r)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 font-bold transition cursor-pointer flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Dismiss Report</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold italic">
                      Case resolved ({r.status})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 pt-4 border-t border-[#e2e8f0] flex items-center justify-between text-[#475569]">
            <span>Showing {noShows.length} of {totalCount} reports</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl border border-[#cbd5e1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

      {/* CONFIRM NO-SHOW MODAL */}
      {confirmModal.open && confirmModal.report && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="text-base font-bold text-rose-700 flex items-center space-x-2">
                <AlertOctagon className="w-4 h-4" />
                <span>Confirm Provider No-Show</span>
              </h3>
              <button
                onClick={() => setConfirmModal({ open: false, report: null, loading: false, error: '' })}
                className="text-[#475569] hover:text-[#172033] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#475569]">
                Confirm that provider <strong className="text-[#172033]">{confirmModal.report.provider_name}</strong> failed to arrive for Booking #{confirmModal.report.booking_id}.
              </p>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                <p className="font-bold">Operational Impact:</p>
                <p>• Updates the transparent Provider Reliability metric.</p>
                <p>• The ML Trust Score is preserved and not altered directly by no-show confirmations.</p>
                <p>• Action will be permanently logged in the Admin Audit Log.</p>
              </div>

              {confirmModal.error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[11px]">
                  {confirmModal.error}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ open: false, report: null, loading: false, error: '' })}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172033] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={confirmModal.loading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {confirmModal.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertOctagon className="w-3.5 h-3.5" />}
                  <span>Confirm No-Show</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISMISS NO-SHOW MODAL */}
      {dismissModal.open && dismissModal.report && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-slate-600" />
                <span>Dismiss No-Show Report</span>
              </h3>
              <button
                onClick={() => setDismissModal({ open: false, report: null, reason: '', loading: false, error: '' })}
                className="text-[#475569] hover:text-[#172033] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDismissSubmit} className="space-y-4 text-xs">
              <p className="text-[#475569]">
                Dismissing report #{dismissModal.report.id} against <strong className="text-[#172033]">{dismissModal.report.provider_name}</strong>. No reliability penalty will be assessed.
              </p>

              {dismissModal.error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[11px]">
                  {dismissModal.error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase mb-1">
                  Dismissal Justification <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={dismissModal.reason}
                  onChange={(e) => setDismissModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="E.g., Provider arrived on time but customer was not home; GPS check confirms presence..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#cbd5e1] text-xs focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-[#475569]">This reason is mandatory and recorded in the Admin Audit Log.</span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setDismissModal({ open: false, report: null, reason: '', loading: false, error: '' })}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172033] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dismissModal.loading}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {dismissModal.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Dismiss Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminNoShows;

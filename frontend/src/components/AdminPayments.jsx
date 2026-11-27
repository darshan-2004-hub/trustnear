/**
 * AdminPayments – Admin Payment Management tab for TrustNear AdminDashboard.
 *
 * Displays:
 *   - KPI cards: total records, total collected, pending balances, fully paid, refunded
 *   - Paginated, searchable, filterable payment table
 *   - Refund modal (admin only, requires reason)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, Search, RefreshCw, AlertCircle, CheckCircle2,
  Loader2, ChevronLeft, ChevronRight, RotateCcw, X, AlertTriangle
} from 'lucide-react';
import api from '../services/api';

const PAYMENT_STATUS_STYLES = {
  unpaid:         { bg: 'bg-slate-100 text-slate-600 border-slate-200',       label: 'Unpaid' },
  partially_paid: { bg: 'bg-amber-50 text-amber-700 border-amber-200',         label: 'Advance Paid' },
  fully_paid:     { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',   label: 'Fully Paid' },
  refunded:       { bg: 'bg-blue-50 text-blue-700 border-blue-200',            label: 'Refunded' },
};

const fmt  = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function AdminPayments() {
  const [payments, setPayments]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalCount, setTotalCount]   = useState(0);

  // Refund modal
  const [refundTarget, setRefundTarget]   = useState(null);
  const [refundReason, setRefundReason]   = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError]     = useState('');
  const [refundSuccess, setRefundSuccess] = useState('');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search)       params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get(`/admin/payments?${params}`);
      if (res.data?.success) {
        setPayments(res.data.payments || []);
        setStats(res.data.stats || null);
        setTotalPages(res.data.total_pages || 1);
        setTotalCount(res.data.total_count || 0);
      } else {
        setError(res.data?.message || 'Failed to load payments.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error loading payments.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const openRefund = (p) => {
    setRefundTarget(p);
    setRefundReason('');
    setRefundError('');
    setRefundSuccess('');
  };

  const submitRefund = async () => {
    if (!refundReason.trim()) {
      setRefundError('Please provide a refund reason.');
      return;
    }
    setRefundLoading(true);
    setRefundError('');
    try {
      const res = await api.patch(`/admin/payments/${refundTarget.id}/refund`, {
        reason: refundReason.trim(),
        refund_status: 'processed',
      });
      if (res.data?.success) {
        setRefundSuccess('Refund recorded successfully.');
        fetchPayments();
        setTimeout(() => { setRefundTarget(null); setRefundSuccess(''); }, 1500);
      } else {
        setRefundError(res.data?.message || 'Failed to process refund.');
      }
    } catch (err) {
      setRefundError(err.response?.data?.message || 'Server error processing refund.');
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Total Records"    value={stats.total_records}             icon="📋" color="blue" />
          <KpiCard label="Total Collected"  value={fmt(stats.total_collected)}       icon="💰" color="emerald" />
          <KpiCard label="Pending Balances" value={fmt(stats.pending_balances)}      icon="⏳" color="amber" />
          <KpiCard label="Fully Paid"       value={stats.fully_paid_count}           icon="✅" color="green" />
          <KpiCard label="Refunded"         value={stats.refunded_count}             icon="↩️" color="slate" />
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">
              Search (Booking ID or Name)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Enter booking ID or name…"
                className="w-full pl-8 pr-3 py-2 text-xs border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs border border-[#e2e8f0] rounded-xl focus:outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Advance Paid</option>
              <option value="fully_paid">Fully Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 btn-primary text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
            className="px-3 py-2 btn-secondary text-xs font-bold rounded-xl cursor-pointer"
            title="Reset filters"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#e2e8f0] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#172033]">
            Payment Records
            <span className="ml-2 text-[10px] font-normal text-[#475569]">
              ({totalCount} total)
            </span>
          </h3>
          <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
            DEMO SYSTEM
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#475569]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-xs">Loading payments…</span>
          </div>
        ) : error ? (
          <div className="flex items-center space-x-2 p-6 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 text-xs text-[#475569]">
            <IndianRupee className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p className="font-bold text-[#172033]">No payment records found</p>
            <p>Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#475569] uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Customer / Provider</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Advance</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {payments.map((p) => {
                  const style = PAYMENT_STATUS_STYLES[p.payment_status] || PAYMENT_STATUS_STYLES.unpaid;
                  const canRefund = ['partially_paid', 'fully_paid'].includes(p.payment_status);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#172033]">
                        #{p.booking_id}
                        {p.service_title && (
                          <p className="font-sans font-normal text-[10px] text-[#475569] truncate max-w-[120px]">
                            {p.service_title}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#172033]">{p.customer_name || '—'}</p>
                        <p className="text-[10px] text-[#475569]">{p.provider_name || '—'}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#172033]">{fmt(p.total_amount)}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {fmt(p.advance_amount)}
                        {p.advance_transaction_id && (
                          <p className="font-mono text-[9px] text-emerald-600 truncate max-w-[100px]">
                            {p.advance_transaction_id}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {fmt(p.balance_amount)}
                        {p.balance_transaction_id && (
                          <p className="font-mono text-[9px] text-emerald-600 truncate max-w-[100px]">
                            {p.balance_transaction_id}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-700">{fmt(p.amount_paid)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.bg}`}>
                          {style.label}
                        </span>
                        {p.payment_status === 'refunded' && p.refund_reason && (
                          <p className="text-[9px] text-[#475569] mt-0.5 truncate max-w-[100px]" title={p.refund_reason}>
                            {p.refund_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canRefund && (
                          <button
                            onClick={() => openRefund(p)}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-[10px] inline-flex items-center space-x-1 cursor-pointer transition"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Refund</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#e2e8f0] text-xs text-[#475569]">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-blue-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center space-x-2 text-blue-700">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-sm font-black text-[#172033]">Process Refund</h3>
              </div>
              <button
                onClick={() => setRefundTarget(null)}
                className="p-1.5 rounded-lg text-[#475569] hover:text-[#172033] hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-[#e2e8f0] text-[11px] space-y-1">
                <p><span className="text-[#475569]">Booking:</span> <span className="font-bold">#{refundTarget.booking_id}</span></p>
                <p><span className="text-[#475569]">Customer:</span> <span className="font-bold">{refundTarget.customer_name || '—'}</span></p>
                <p><span className="text-[#475569]">Amount Paid:</span> <span className="font-bold text-blue-700">{fmt(refundTarget.amount_paid)}</span></p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <p>
                  This is a <strong>DEMO refund</strong>. No real money is transferred.
                  This action will be recorded in the Admin Audit Log.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#475569] uppercase mb-1">
                  Refund Reason *
                </label>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter reason for refund…"
                  className="w-full p-2.5 border border-[#e2e8f0] rounded-xl text-xs text-[#172033] placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
              </div>

              {refundError && (
                <div className="flex items-center space-x-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{refundError}</p>
                </div>
              )}

              {refundSuccess && (
                <div className="flex items-center space-x-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p>{refundSuccess}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-1">
                <button
                  onClick={() => setRefundTarget(null)}
                  className="flex-1 py-2.5 btn-secondary rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRefund}
                  disabled={refundLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {refundLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Confirm Refund'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, color }) {
  const colorMap = {
    blue:    'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    green:   'bg-green-50 border-green-200 text-green-700',
    slate:   'bg-slate-50 border-slate-200 text-slate-600',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colorMap[color] || colorMap.slate}`}>
      <div className="text-xl mb-1">{icon}</div>
      <p className="text-lg font-black">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80 mt-0.5">{label}</p>
    </div>
  );
}

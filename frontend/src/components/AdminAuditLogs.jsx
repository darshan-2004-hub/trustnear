import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Clock,
  Eye,
  Filter
} from 'lucide-react';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal for inspection
  const [inspectLog, setInspectLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (targetTypeFilter !== 'all') params.append('target_type', targetTypeFilter);
      if (searchTerm.trim()) params.append('q', searchTerm.trim());

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      if (res.data?.success) {
        setLogs(res.data.audit_logs || []);
        setTotalCount(res.data.total_count || 0);
        setTotalPages(res.data.total_pages || 1);
      } else {
        setError(res.data?.message || 'Failed to fetch audit logs.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, targetTypeFilter, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadge = (action) => {
    if (action.includes('suspend') || action.includes('reject') || action.includes('remove') || action.includes('delete') || action.includes('confirm_no_show')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">{action}</span>;
    }
    if (action.includes('approve') || action.includes('verify') || action.includes('reactivate') || action.includes('restore')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{action}</span>;
  };

  return (
    <div className="space-y-6 text-xs text-[#172033]">
      
      {/* Header Info */}
      <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#172033]">Unified Platform Audit Trail</h3>
            <p className="text-[11px] text-[#475569]">
              Complete, tamper-evident record of all administrative decisions across customer, provider, booking, and moderation domains.
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl border border-[#cbd5e1] hover:bg-slate-50 font-bold flex items-center space-x-1.5 cursor-pointer text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actions, admin, target..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#cbd5e1] text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Target Type Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[#475569] font-medium text-[11px]">Domain:</span>
              <select
                value={targetTypeFilter}
                onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 rounded-xl border border-[#cbd5e1] text-xs bg-white font-medium cursor-pointer"
              >
                <option value="all">All Domains</option>
                <option value="booking">Bookings</option>
                <option value="review">Reviews</option>
                <option value="no_show">No-Shows</option>
                <option value="provider">Providers</option>
                <option value="customer">Customers</option>
              </select>
            </div>

            {/* Action Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[#475569] font-medium text-[11px]">Action:</span>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 rounded-xl border border-[#cbd5e1] text-xs bg-white font-medium cursor-pointer"
              >
                <option value="all">All Actions</option>
                <option value="admin_correct_booking_status">Booking Status Correction</option>
                <option value="remove_review">Remove Review</option>
                <option value="restore_review">Restore Review</option>
                <option value="approve_review">Approve Review</option>
                <option value="confirm_no_show">Confirm No-Show</option>
                <option value="dismiss_no_show">Dismiss No-Show</option>
                <option value="verify_provider">Verify Provider</option>
                <option value="reject_provider">Reject Provider</option>
                <option value="suspend_provider">Suspend Provider</option>
                <option value="reactivate_provider">Reactivate Provider</option>
                <option value="suspend_customer">Suspend Customer</option>
                <option value="reactivate_customer">Reactivate Customer</option>
                <option value="edit_customer_profile">Edit Customer</option>
                <option value="edit_provider_profile">Edit Provider</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl btn-primary font-bold transition cursor-pointer"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#475569] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
            <p className="font-semibold">Loading audit entries...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="font-bold">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-[#475569] space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-[#172033]">No Audit Log Records</p>
            <p className="text-[11px]">No logged administrative events match your filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-[#e2e8f0] text-[#475569] text-[10px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Details / Justification</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {logs.map((l) => {
                  const detailsText = l.details?.reason 
                    ? `Reason: ${l.details.reason}` 
                    : l.details?.previous_status && l.details?.new_status
                      ? `${l.details.previous_status} → ${l.details.new_status} (${l.details.reason || ''})`
                      : l.details ? JSON.stringify(l.details) : '—';

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-[#475569] font-mono text-[11px]">
                        {l.created_at ? new Date(l.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#172033]">
                        {l.admin_name}
                      </td>
                      <td className="py-3 px-4">
                        {getActionBadge(l.action)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#172033]">
                        <span className="capitalize">{l.target_type}</span> #{l.target_id || '—'}
                      </td>
                      <td className="py-3 px-4 text-[#475569] max-w-xs truncate" title={detailsText}>
                        {detailsText}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setInspectLog(l)}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172033] font-semibold text-[11px] transition cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3 text-[#475569]" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#475569]">
            <span>
              Showing {logs.length} of {totalCount} records (Page {page} of {totalPages})
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

      {/* INSPECT LOG MODAL */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="text-base font-bold text-[#172033]">
                Audit Record #{inspectLog.id}
              </h3>
              <button
                onClick={() => setInspectLog(null)}
                className="text-[#475569] hover:text-[#172033] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-[#e2e8f0]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#475569] block">Administrator</span>
                  <p className="font-bold text-[#172033]">{inspectLog.admin_name} (ID: {inspectLog.admin_id})</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#475569] block">Timestamp</span>
                  <p className="font-mono text-[#172033]">{inspectLog.created_at}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#475569] block">Action</span>
                  <p className="mt-0.5">{getActionBadge(inspectLog.action)}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#475569] block">Target</span>
                  <p className="font-bold text-[#172033] capitalize">{inspectLog.target_type} #{inspectLog.target_id || 'N/A'}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#475569] block mb-1">Raw Action Payload & Metadata:</span>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto text-[11px] font-mono">
                  {JSON.stringify(inspectLog.details, null, 2) || '{}'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#e2e8f0]">
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172033] font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminAuditLogs;

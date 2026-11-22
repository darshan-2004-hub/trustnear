import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Briefcase,
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
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Award,
  Star,
  MapPin,
  Image as ImageIcon,
  Check,
  Ban
} from 'lucide-react';

const AdminProviders = () => {
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({
    total_providers: 0,
    verified_providers: 0,
    pending_verifications: 0,
    rejected_providers: 0,
    suspended_providers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [editProvider, setEditProvider] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    service_category: '',
    experience_years: 0,
    hourly_rate: 0,
    bio: '',
    service_address: '',
    is_available: true
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Verification modal
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState('verified');
  const [verifyReason, setVerifyReason] = useState('');
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  // Confirm dialog for Suspend / Reactivate / Delete
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    action: null, // 'suspend', 'reactivate', 'delete'
    provider: null,
    reason: '',
    submitting: false
  });

  const fetchProviders = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (verificationFilter !== 'all') params.append('verification_status', verificationFilter);
      if (accountFilter !== 'all') params.append('account_status', accountFilter);
      params.append('page', page);
      params.append('limit', 15);

      const res = await api.get(`/admin/providers?${params.toString()}`);
      if (res.data?.success) {
        setProviders(res.data.providers || []);
        if (res.data.stats) setStats(res.data.stats);
        setTotalPages(res.data.total_pages || 1);
        setTotalCount(res.data.total_count || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load provider records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [page, verificationFilter, accountFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProviders();
  };

  const handleOpenDetail = async (providerId) => {
    setIsDetailOpen(true);
    setDetailLoading(true);
    setSelectedProvider(null);
    try {
      const res = await api.get(`/admin/providers/${providerId}`);
      if (res.data?.success) {
        setSelectedProvider(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load provider details.');
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenEdit = (prov) => {
    setEditProvider(prov);
    setEditForm({
      full_name: prov.full_name || '',
      phone: prov.phone || '',
      service_category: prov.service_category || '',
      experience_years: prov.experience_years || 0,
      hourly_rate: prov.hourly_rate || 0,
      bio: prov.bio || '',
      service_address: prov.service_address || '',
      is_available: prov.is_available ?? true
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editProvider) return;
    setEditSubmitting(true);
    try {
      const res = await api.patch(`/admin/providers/${editProvider.id}`, editForm);
      if (res.data?.success) {
        setIsEditOpen(false);
        fetchProviders();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update provider profile.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenVerify = (prov, targetStatus) => {
    setVerifyTarget(prov);
    setVerifyStatus(targetStatus);
    setVerifyReason('');
    setIsVerifyOpen(true);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyTarget) return;
    setVerifySubmitting(true);
    try {
      const res = await api.patch(`/admin/providers/${verifyTarget.id}/verify`, {
        status: verifyStatus,
        reason: verifyReason
      });
      if (res.data?.success) {
        setIsVerifyOpen(false);
        fetchProviders();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update verification status.');
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    const { action, provider, reason } = confirmDialog;
    if (!action || !provider) return;

    setConfirmDialog((prev) => ({ ...prev, submitting: true }));
    try {
      if (action === 'suspend') {
        await api.post(`/admin/providers/${provider.id}/suspend`, { reason });
      } else if (action === 'reactivate') {
        await api.post(`/admin/providers/${provider.id}/reactivate`);
      } else if (action === 'delete') {
        await api.delete(`/admin/providers/${provider.id}`);
      }
      setConfirmDialog({ isOpen: false, action: null, provider: null, reason: '', submitting: false });
      fetchProviders();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} provider.`);
      setConfirmDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>TOTAL PROVIDERS</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.total_providers}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Registered contractors</span>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 mb-2">
            <span>VERIFIED KYC</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-700">{stats.verified_providers}</p>
          <span className="text-[11px] text-emerald-600/70 mt-1 block">Approved & active</span>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 mb-2">
            <span>PENDING REVIEW</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-700">{stats.pending_verifications}</p>
          <span className="text-[11px] text-amber-600/70 mt-1 block">Awaiting KYC decision</span>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700 mb-2">
            <span>REJECTED KYC</span>
            <Ban className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-rose-700">{stats.rejected_providers}</p>
          <span className="text-[11px] text-rose-600/70 mt-1 block">Failed documentation</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>SUSPENDED</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-rose-600">{stats.suspended_providers}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Policy violations</span>
        </div>
      </div>

      {/* 2. CONTROLS STRIP (SEARCH & FILTERS) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search provider by name, email, phone, trade category..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
          />
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Verification Status Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <span className="px-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">KYC:</span>
            {['all', 'verified', 'pending', 'rejected'].map((v) => (
              <button
                key={v}
                onClick={() => { setVerificationFilter(v); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                  verificationFilter === v
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Account Status Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <span className="px-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Acct:</span>
            {['all', 'active', 'suspended'].map((a) => (
              <button
                key={a}
                onClick={() => { setAccountFilter(a); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                  accountFilter === a
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          <button
            onClick={fetchProviders}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. PROVIDER LIST TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-semibold">Loading registered provider profiles...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">No Providers Found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Provider Details</th>
                  <th className="py-3 px-4">Trade & Rate</th>
                  <th className="py-3 px-4">KYC Status</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Trust Score</th>
                  <th className="py-3 px-4">Bookings</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providers.map((p) => {
                  const isSuspended = p.account_status === 'suspended';
                  const isDeleted = p.account_status === 'deleted';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                            {p.full_name?.charAt(0)?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{p.full_name}</p>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                              <span>{p.email}</span>
                              {p.phone && (
                                <>
                                  <span>•</span>
                                  <span>{p.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Trade & Rate */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {p.service_category || 'Contractor'}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1">
                          ₹{p.hourly_rate}/hr • {p.experience_years} yrs exp
                        </div>
                      </td>

                      {/* KYC Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.verification_status === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.verification_status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.verification_status === 'verified' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {p.verification_status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {p.verification_status === 'rejected' && <Ban className="w-3 h-3 mr-1" />}
                          {p.verification_status?.toUpperCase()}
                        </span>
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuspended
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isDeleted
                              ? 'bg-slate-100 text-slate-500 border border-slate-300'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {p.account_status?.toUpperCase() || 'ACTIVE'}
                        </span>
                      </td>

                      {/* Trust Score */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <Award className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-black text-slate-800">{p.trust_score?.toFixed(1) || '50.0'}</span>
                          <span className="text-[10px] text-slate-400">/100</span>
                        </div>
                      </td>

                      {/* Bookings */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-bold text-slate-800">{p.completed_bookings || 0}</span>
                        <span className="text-[10px] text-slate-400"> / {p.total_bookings || 0} completed</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1">
                          {/* View Detail */}
                          <button
                            onClick={() => handleOpenDetail(p.id)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View comprehensive details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Profile */}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Edit provider profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Quick Verify / Reject if pending */}
                          {p.verification_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleOpenVerify(p, 'verified')}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Approve KYC verification"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenVerify(p, 'rejected')}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Reject KYC verification"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Suspend or Reactivate */}
                          {!isDeleted && (
                            isSuspended ? (
                              <button
                                onClick={() => setConfirmDialog({
                                  isOpen: true,
                                  action: 'reactivate',
                                  provider: p,
                                  reason: '',
                                  submitting: false
                                })}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Reactivate provider"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmDialog({
                                  isOpen: true,
                                  action: 'suspend',
                                  provider: p,
                                  reason: '',
                                  submitting: false
                                })}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Suspend provider"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )
                          )}

                          {/* Safe Delete */}
                          {!isDeleted && (
                            <button
                              onClick={() => setConfirmDialog({
                                isOpen: true,
                                action: 'delete',
                                provider: p,
                                reason: '',
                                submitting: false
                              })}
                              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="Safely anonymize/delete provider"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. PAGINATION FOOTER */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {providers.length} of {totalCount} providers
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-800">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: PROVIDER FULL DETAIL VIEW */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-black flex items-center justify-center text-sm">
                  {selectedProvider?.provider?.full_name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {selectedProvider?.provider?.full_name || 'Provider Detail'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ID #{selectedProvider?.provider?.id} • Registered {selectedProvider?.provider?.created_at?.slice(0, 10)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {detailLoading ? (
                <div className="py-20 text-center">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="text-slate-500">Loading comprehensive provider file...</p>
                </div>
              ) : selectedProvider ? (
                <>
                  {/* Provider & Profile Specs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Contact & Identity</h4>
                      <p className="text-slate-600 flex items-center"><Mail className="w-3.5 h-3.5 mr-2 text-slate-400" /> {selectedProvider.provider.email}</p>
                      <p className="text-slate-600 flex items-center"><Phone className="w-3.5 h-3.5 mr-2 text-slate-400" /> {selectedProvider.provider.phone || 'No phone provided'}</p>
                      <p className="text-slate-600 flex items-center"><MapPin className="w-3.5 h-3.5 mr-2 text-slate-400" /> {selectedProvider.profile?.service_address || 'Address unlisted'}</p>
                      <div className="pt-2 flex items-center gap-2">
                        <span className="font-bold text-slate-700">Account:</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 capitalize">
                          {selectedProvider.provider.account_status}
                        </span>
                        <span className="font-bold text-slate-700 ml-2">KYC:</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 capitalize">
                          {selectedProvider.profile?.verification_status}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Trade Qualifications</h4>
                      <p className="text-slate-600"><span className="font-bold">Trade:</span> {selectedProvider.profile?.service_category}</p>
                      <p className="text-slate-600"><span className="font-bold">Experience:</span> {selectedProvider.profile?.experience_years} years in field</p>
                      <p className="text-slate-600"><span className="font-bold">Standard Rate:</span> ₹{selectedProvider.profile?.hourly_rate}/hour</p>
                      <p className="text-slate-600"><span className="font-bold">Accepting Bookings:</span> {selectedProvider.profile?.is_available ? 'Yes' : 'No'}</p>
                      {selectedProvider.profile?.bio && (
                        <p className="text-slate-500 italic pt-1 border-t border-slate-200">"{selectedProvider.profile.bio}"</p>
                      )}
                    </div>
                  </div>

                  {/* TWO-COLUMN METRIC BREAKDOWN: RELIABILITY VS ML TRUST ENGINE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Separate Component 1: Genuine Provider Reliability */}
                    <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-emerald-900 flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                          Provider Reliability (Attendance Metric)
                        </h4>
                        <span className="font-black text-emerald-800 text-sm">
                          {selectedProvider.reliability?.reliability_rate !== null ? `${selectedProvider.reliability.reliability_rate}%` : 'N/A'}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800/80 mb-3">
                        {selectedProvider.reliability?.explanation}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="bg-white p-2 rounded-lg border border-emerald-100">
                          <span className="block font-black text-emerald-700 text-xs">{selectedProvider.reliability?.breakdown?.completed_bookings || 0}</span>
                          <span className="text-slate-500">Completed</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-emerald-100">
                          <span className="block font-black text-rose-600 text-xs">{selectedProvider.reliability?.breakdown?.provider_cancellations || 0}</span>
                          <span className="text-slate-500">Provider Cancels</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-emerald-100">
                          <span className="block font-black text-amber-600 text-xs">{selectedProvider.reliability?.breakdown?.confirmed_no_shows || 0}</span>
                          <span className="text-slate-500">No-Shows</span>
                        </div>
                      </div>
                    </div>

                    {/* Separate Component 2: ML Trust Score & Factors */}
                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-blue-900 flex items-center">
                          <Award className="w-4 h-4 mr-1.5 text-blue-600" />
                          ML Trust Score (AI Ranking Engine)
                        </h4>
                        <span className="font-black text-blue-800 text-sm">
                          {selectedProvider.trust_metric?.trust_score?.toFixed(1) || '50.0'} / 100
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-800/80 mb-3">
                        Derived independently via Gradient Boosting & sentiment analysis across customer interactions.
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                          <span className="block font-black text-blue-700 text-xs">{selectedProvider.trust_metric?.avg_response_minutes || 0}m</span>
                          <span className="text-slate-500">Avg Response</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                          <span className="block font-black text-blue-700 text-xs">{selectedProvider.trust_metric?.cancellation_rate || 0}%</span>
                          <span className="text-slate-500">Cancel Rate</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                          <span className="block font-black text-blue-700 text-xs">{(selectedProvider.trust_metric?.review_sentiment_avg || 0).toFixed(2)}</span>
                          <span className="text-slate-500">Sentiment</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Portfolio Gallery */}
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center">
                      <ImageIcon className="w-4 h-4 mr-1.5 text-slate-500" />
                      Portfolio & Previous Work ({selectedProvider.portfolio?.length || 0})
                    </h4>
                    {!selectedProvider.portfolio || selectedProvider.portfolio.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No past work entries submitted yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedProvider.portfolio.map((item) => (
                          <div key={item.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex space-x-3">
                            {item.after_image_url ? (
                              <img src={item.after_image_url} alt={item.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900">{item.title}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-2">{item.description}</p>
                              <p className="text-[10px] text-slate-400 mt-1">Completed {item.completion_date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Booking History Table */}
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center">
                      <Calendar className="w-4 h-4 mr-1.5 text-slate-500" />
                      Booking History ({selectedProvider.bookings?.length || 0})
                    </h4>
                    {!selectedProvider.bookings || selectedProvider.bookings.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No bookings recorded for this provider.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                            <tr>
                              <th className="py-2 px-3">Service</th>
                              <th className="py-2 px-3">Customer</th>
                              <th className="py-2 px-3">Date</th>
                              <th className="py-2 px-3">Agreed Price</th>
                              <th className="py-2 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedProvider.bookings.map((b) => (
                              <tr key={b.id}>
                                <td className="py-2 px-3 font-semibold text-slate-900">{b.service_title}</td>
                                <td className="py-2 px-3 text-slate-600">{b.customer_name}</td>
                                <td className="py-2 px-3 text-slate-500">{b.booking_date}</td>
                                <td className="py-2 px-3 font-bold text-slate-800">₹{b.agreed_price}</td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                    b.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : b.status === 'cancelled'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-blue-50 text-blue-700'
                                  }`}>
                                    {b.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PROVIDER PROFILE */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Edit Provider Profile</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trade Category</label>
                  <input
                    type="text"
                    value={editForm.service_category}
                    onChange={(e) => setEditForm({ ...editForm, service_category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.hourly_rate}
                    onChange={(e) => setEditForm({ ...editForm, hourly_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.experience_years}
                    onChange={(e) => setEditForm({ ...editForm, experience_years: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Service Address / Base</label>
                <input
                  type="text"
                  value={editForm.service_address}
                  onChange={(e) => setEditForm({ ...editForm, service_address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Professional Bio</label>
                <textarea
                  rows="2"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                ></textarea>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={editForm.is_available}
                  onChange={(e) => setEditForm({ ...editForm, is_available: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_available" className="font-bold text-slate-700">Currently Available for Customer Bookings</label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VERIFICATION APPROVE / REJECT */}
      {isVerifyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              {verifyStatus === 'verified' ? 'Approve Provider KYC' : 'Reject Provider KYC'}
            </h3>
            <p className="text-slate-600">
              Provider: <span className="font-bold text-slate-900">{verifyTarget?.full_name}</span> ({verifyTarget?.email})
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {verifyStatus === 'verified' ? 'Approval Note (Optional)' : 'Rejection Reason (Required)'}
              </label>
              <textarea
                rows="3"
                required={verifyStatus === 'rejected'}
                value={verifyReason}
                onChange={(e) => setVerifyReason(e.target.value)}
                placeholder={verifyStatus === 'verified' ? 'e.g. All government IDs and electrical certifications verified.' : 'e.g. Incomplete ID document or invalid trade certification.'}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsVerifyOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifySubmit}
                disabled={verifySubmitting || (verifyStatus === 'rejected' && !verifyReason.trim())}
                className={`px-4 py-2 font-bold rounded-xl text-white transition disabled:opacity-50 ${
                  verifyStatus === 'verified' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {verifySubmitting ? 'Processing...' : verifyStatus === 'verified' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM DIALOG FOR SUSPEND / REACTIVATE / DELETE */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-xs space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm capitalize">
                Confirm {confirmDialog.action} Provider
              </h3>
            </div>

            <p className="text-slate-600">
              Target: <span className="font-bold text-slate-900">{confirmDialog.provider?.full_name}</span> ({confirmDialog.provider?.email})
            </p>

            {confirmDialog.action === 'suspend' && (
              <>
                <p className="text-rose-600 font-semibold text-[11px]">
                  Warning: Suspended providers cannot accept new bookings, complete jobs, send chat messages, or modify availability/portfolio.
                </p>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reason for Suspension</label>
                  <textarea
                    rows="2"
                    required
                    value={confirmDialog.reason}
                    onChange={(e) => setConfirmDialog({ ...confirmDialog, reason: e.target.value })}
                    placeholder="Provide specific administrative reason..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  ></textarea>
                </div>
              </>
            )}

            {confirmDialog.action === 'delete' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] space-y-1">
                <p className="font-bold">Safe Anonymization & Retention Notice:</p>
                <p>Provider PII will be anonymized. Historical booking, review, and payment records remain intact for platform accounting and compliance.</p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: false, action: null, provider: null, reason: '', submitting: false })}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={confirmDialog.submitting || (confirmDialog.action === 'suspend' && !confirmDialog.reason.trim())}
                className="px-4 py-2 font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition disabled:opacity-50"
              >
                {confirmDialog.submitting ? 'Processing...' : `Confirm ${confirmDialog.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProviders;

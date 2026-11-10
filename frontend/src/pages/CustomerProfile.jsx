import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  Clock,
  Sparkles,
  ArrowRight,
  IndianRupee
} from 'lucide-react';

const CustomerProfile = () => {
  const { user: authUser } = useAuth();

  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    email: '',
    role: 'customer',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    totalSpent: 0,
  });

  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const [meRes, bookingsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/bookings').catch(() => ({ data: { bookings: [] } })),
        ]);

        if (meRes.data?.success && meRes.data.user) {
          const u = meRes.data.user;
          setProfileData({
            fullName: u.full_name || '',
            phone: u.phone || '',
            email: u.email || '',
            role: u.role || 'customer',
          });
        }

        if (bookingsRes.data?.bookings && Array.isArray(bookingsRes.data.bookings)) {
          const bList = bookingsRes.data.bookings;
          const total = bList.length;
          const active = bList.filter((b) => ['pending', 'accepted', 'in_progress'].includes(b.status)).length;
          const completedBookings = bList.filter((b) => b.status === 'completed');
          const completed = completedBookings.length;
          const totalSpent = completedBookings.reduce((sum, b) => sum + (Number(b.agreed_price) || 0), 0);

          setStats({ total, active, completed, totalSpent });
        }
      } catch (err) {
        console.warn('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');

    if (!profileData.fullName.trim()) {
      setProfileError('Full name cannot be empty.');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await api.patch('/auth/profile', {
        full_name: profileData.fullName.trim(),
        phone: profileData.phone.trim() || null,
      });

      if (res.data?.success) {
        setProfileSuccess('Profile details updated successfully.');
        if (res.data.user) {
          localStorage.setItem('trustnear_user', JSON.stringify(res.data.user));
        }
        setTimeout(() => setProfileSuccess(''), 4000);
      } else {
        setProfileError(res.data?.message || 'Failed to update profile.');
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Server error while updating profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (!passwordData.currentPassword) {
      setPasswordError('Please provide your current password.');
      return;
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password confirmation does not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await api.patch('/auth/profile', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });

      if (res.data?.success) {
        setPasswordSuccess('Password changed successfully.');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setTimeout(() => setPasswordSuccess(''), 4000);
      } else {
        setPasswordError(res.data?.message || 'Failed to change password.');
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Current password incorrect or server error.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1c2036] text-[#f1f3ff] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="theme-card p-8 h-40" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="theme-card p-4 h-24" />
            ))}
          </div>
          <div className="theme-card p-8 h-64" />
        </div>
      </div>
    );
  }

  const displayName = profileData.fullName || authUser?.full_name || 'Customer';

  return (
    <div className="min-h-screen bg-[#1c2036] text-[#f1f3ff] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header Profile Card */}
        <div className="theme-card p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center space-x-4 sm:space-x-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-0.5 bg-gradient-to-tr from-[#6d5dfc] via-[#d946ef] to-[#2dd4bf] shrink-0">
                <div className="w-full h-full rounded-2xl bg-[#1c2036] flex items-center justify-center text-2xl sm:text-3xl font-black text-white">
                  {displayName.charAt(0)}
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">{displayName}</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#6d5dfc]/15 text-[#6d5dfc] text-xs font-bold border border-[#6d5dfc]/30 uppercase tracking-wide">
                    {profileData.role}
                  </span>
                </div>
                <p className="text-xs text-[#a9b0d0] mt-1 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#2dd4bf]" />
                  <span>{profileData.email}</span>
                </p>
                {profileData.phone && (
                  <p className="text-xs text-[#a9b0d0] mt-0.5 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#2dd4bf]" />
                    <span>{profileData.phone}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 text-[#2dd4bf] text-xs font-semibold self-start sm:self-auto">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Account</span>
            </div>
          </div>
        </div>

        {/* Real Customer Activity Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="theme-card p-4">
            <span className="text-[10px] font-bold text-[#a9b0d0] uppercase tracking-wider block">Total Bookings</span>
            <span className="text-xl sm:text-2xl font-black text-white mt-1 block">{stats.total}</span>
          </div>
          <div className="theme-card p-4">
            <span className="text-[10px] font-bold text-[#a9b0d0] uppercase tracking-wider block">Active Jobs</span>
            <span className="text-xl sm:text-2xl font-black text-[#6d5dfc] mt-1 block">{stats.active}</span>
          </div>
          <div className="theme-card p-4">
            <span className="text-[10px] font-bold text-[#a9b0d0] uppercase tracking-wider block">Completed</span>
            <span className="text-xl sm:text-2xl font-black text-[#2dd4bf] mt-1 block">{stats.completed}</span>
          </div>
          <div className="theme-card p-4">
            <span className="text-[10px] font-bold text-[#a9b0d0] uppercase tracking-wider block">Completed Spend</span>
            <span className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center">
              <IndianRupee className="w-4 h-4 text-[#2dd4bf]" />
              {stats.totalSpent.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="theme-card p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#363d66] pb-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <User className="w-4 h-4 text-[#6d5dfc]" />
              <span>Personal Information</span>
            </h2>
            <p className="text-xs text-[#a9b0d0] mt-0.5">
              Update your customer profile details and contact information.
            </p>
          </div>

          {profileSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#a9b0d0] uppercase mb-1.5">
                  Full Name <span className="text-[#d946ef]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-[#1c2036] border border-[#363d66] rounded-xl text-sm text-white placeholder-[#a9b0d0]/50 focus:outline-none focus:border-[#6d5dfc] transition"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a9b0d0] uppercase mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-[#1c2036] border border-[#363d66] rounded-xl text-sm text-white placeholder-[#a9b0d0]/50 focus:outline-none focus:border-[#6d5dfc] transition"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#a9b0d0] uppercase mb-1.5">
                  Email Address (Login ID)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3" />
                  <input
                    type="email"
                    disabled
                    value={profileData.email}
                    className="w-full pl-9 pr-3 py-2 bg-[#1c2036]/60 border border-[#363d66]/50 rounded-xl text-sm text-[#a9b0d0] cursor-not-allowed"
                  />
                </div>
                <span className="text-[11px] text-[#a9b0d0]/70 mt-1 block">
                  Email cannot be modified directly as it is your authentication identity.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a9b0d0] uppercase mb-1.5">
                  Account Role
                </label>
                <input
                  type="text"
                  disabled
                  value="Verified Customer"
                  className="w-full px-3 py-2 bg-[#1c2036]/60 border border-[#363d66]/50 rounded-xl text-sm text-[#a9b0d0] cursor-not-allowed capitalize"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={profileSaving}
                className="btn-primary px-6 py-2.5 text-xs font-bold inline-flex items-center space-x-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{profileSaving ? 'Saving Changes...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Security & Password Section */}
        <div className="theme-card p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#363d66] pb-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Lock className="w-4 h-4 text-[#2dd4bf]" />
              <span>Security & Password</span>
            </h2>
            <p className="text-xs text-[#a9b0d0] mt-0.5">
              Change your password to keep your account safe and secure.
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#a9b0d0] uppercase mb-1.5">
                Current Password <span className="text-[#d946ef]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-[#1c2036] border border-[#363d66] rounded-xl text-sm text-white placeholder-[#a9b0d0]/50 focus:outline-none focus:border-[#6d5dfc] transition"
                  placeholder="Enter your current password"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#a9b0d0] uppercase mb-1.5">
                  New Password <span className="text-[#d946ef]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-[#1c2036] border border-[#363d66] rounded-xl text-sm text-white placeholder-[#a9b0d0]/50 focus:outline-none focus:border-[#6d5dfc] transition"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a9b0d0] uppercase mb-1.5">
                  Confirm New Password <span className="text-[#d946ef]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-[#1c2036] border border-[#363d66] rounded-xl text-sm text-white placeholder-[#a9b0d0]/50 focus:outline-none focus:border-[#6d5dfc] transition"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordSaving}
                className="btn-primary px-6 py-2.5 text-xs font-bold inline-flex items-center space-x-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{passwordSaving ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default CustomerProfile;

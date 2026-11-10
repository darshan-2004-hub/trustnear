import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const CustomerRegister = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const validateForm = () => {
    const errs = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      errs.fullName = 'Full name must be at least 3 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errs.email = 'Please provide a valid email address.';
    }

    if (phone.trim()) {
      const cleanPhone = phone.replace(/[\s\-\+]/g, '');
      if (cleanPhone.length < 10) {
        errs.phone = 'Mobile number must be at least 10 digits.';
      }
    }

    if (!password || password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const payload = {
        role: 'customer',
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        password: password,
      };

      const res = await register(payload);

      if (res.success) {
        setRegisterSuccess(true);

        const returnToBooking = location.state?.returnToBooking;
        const bookProviderId = location.state?.bookProviderId;

        setTimeout(() => {
          if (returnToBooking && bookProviderId) {
            navigate(`/provider/${bookProviderId}?book=true`, { replace: true });
          } else {
            navigate('/providers', { replace: true });
          }
        }, 900);
      } else {
        setServerError(res.message || 'Failed to create customer account.');
      }
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Server error during registration. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
      <div className="theme-card max-w-4xl w-full overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-xl border border-[#e2e8f0]">

        {/* Left Side: Brand Showcase */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <Link
              to="/auth"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Role Selection</span>
            </Link>

            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shadow-inner">
              <User className="w-6 h-6 text-blue-400" />
            </div>

            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-2 border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Join TrustNear</span>
              </div>
              <h2 className="text-2xl font-black leading-tight text-white">Create Customer Account</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Connect with verified local professionals in Mangaluru with explainable trust scores and fair price estimations.
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-700 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero upfront booking fees</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct in-app messaging with assigned pros</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Authentic, approved community feedback only</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 text-[11px] text-slate-400">
            <span>TrustNear • Mangaluru Local Discovery</span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="md:col-span-7 p-8 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
              <div>
                <h3 className="text-xl font-bold text-[#172033]">Customer Sign Up</h3>
                <p className="text-xs text-[#475569] mt-0.5">Fill in your information to get started</p>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 uppercase">
                Customer
              </span>
            </div>

            {/* Error & Success Alerts */}
            {serverError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{serverError}</span>
              </div>
            )}

            {registerSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Account created successfully! Preparing your account...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alice Hegde"
                    className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                      errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                    }`}
                  />
                </div>
                {errors.fullName && <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>}
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alice@example.com"
                      className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                        errors.email ? 'border-red-500 focus:border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                        errors.phone ? 'border-red-500 focus:border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className={`w-full pl-9 pr-10 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                        errors.password ? 'border-red-500 focus:border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[11px] text-red-600 mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className={`w-full pl-9 pr-10 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                        errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer mt-2"
              >
                <span>{submitting ? 'Creating Customer Account...' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Bottom Switch Link */}
          <div className="pt-5 mt-5 border-t border-[#e2e8f0] text-center text-xs text-[#475569]">
            <p>
              Already have a customer account?{' '}
              <Link
                to="/login/customer"
                state={location.state}
                className="text-[#2563eb] font-bold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerRegister;

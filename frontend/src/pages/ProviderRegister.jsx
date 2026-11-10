import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
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
  Sparkles,
  MapPin,
  IndianRupee,
  Briefcase,
  Info
} from 'lucide-react';

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Cleaning',
  'Appliance Repair',
  'Painting',
];

const ProviderRegister = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Provider specific trade fields
  const [serviceCategory, setServiceCategory] = useState('Plumbing');
  const [experienceYears, setExperienceYears] = useState('4');
  const [hourlyRate, setHourlyRate] = useState('350');
  const [serviceAddress, setServiceAddress] = useState('');
  const [bio, setBio] = useState('');

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
      errs.email = 'Please provide a valid business email address.';
    }

    const cleanPhone = phone.replace(/[\s\-\+]/g, '');
    if (!phone.trim() || cleanPhone.length < 10) {
      errs.phone = 'Please provide a valid 10-digit mobile number.';
    }

    if (!password || password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (!hourlyRate || Number(hourlyRate) < 50) {
      errs.hourlyRate = 'Standard hourly rate must be at least ₹50.';
    }

    if (!serviceAddress.trim()) {
      errs.serviceAddress = 'Service area/address in Mangaluru is required.';
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
        role: 'provider',
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        password: password,
        service_category: serviceCategory,
        experience_years: parseInt(experienceYears, 10) || 0,
        hourly_rate: parseFloat(hourlyRate),
        service_address: serviceAddress.trim(),
        bio: bio.trim() || `${serviceCategory} professional with ${experienceYears} years experience.`,
      };

      const res = await register(payload);

      if (res.success) {
        setRegisterSuccess(true);
        setTimeout(() => {
          navigate('/provider-dashboard', { replace: true });
        }, 900);
      } else {
        setServerError(res.message || 'Failed to register trade provider account.');
      }
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Server error during provider registration.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
      <div className="theme-card max-w-5xl w-full overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-xl border border-[#e2e8f0]">

        {/* Left Side: Provider Brand Showcase */}
        <div className="md:col-span-4 bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <Link
              to="/auth"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Role Selection</span>
            </Link>

            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shadow-inner">
              <Wrench className="w-6 h-6 text-blue-400" />
            </div>

            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-2 border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Trade Network</span>
              </div>
              <h2 className="text-2xl font-black leading-tight text-white">Join TrustNear as a Pro</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Connect directly with residents across Mangaluru, build verified community trust, and track your revenue growth.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-2">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                <Info className="w-4 h-4 shrink-0" />
                <span>Verification Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Newly registered profiles undergo platform verification by our moderation team. Initial trust metrics are calibrated automatically.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dedicated Job Queue for dispatch</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automatic Trust Score & SHAP evaluation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct client messaging & digital invoicing</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 text-[11px] text-slate-400">
            <span>TrustNear • Mangaluru Local Trade Partner</span>
          </div>
        </div>

        {/* Right Side: Provider Registration Form */}
        <div className="md:col-span-8 p-8 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
              <div>
                <h3 className="text-xl font-bold text-[#172033]">Register Trade Business</h3>
                <p className="text-xs text-[#475569] mt-0.5">Fill in your professional details to begin receiving local job requests</p>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 uppercase">
                Provider Sign Up
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
                <span>Registration successful! Opening your Provider Dashboard...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-5">
              
              {/* Row 1: Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                    Full Name / Business Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rajesh Rao"
                      className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                        errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                      }`}
                    />
                  </div>
                  {errors.fullName && <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                    Business Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rajesh.electric@example.com"
                      className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                        errors.email ? 'border-red-500 focus:border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
                </div>
              </div>

              {/* Row 2: Phone & Service Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                    Mobile Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                        errors.phone ? 'border-red-500 focus:border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                    Primary Trade / Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <select
                      value={serviceCategory}
                      onChange={(e) => setServiceCategory(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] focus:outline-none focus:border-[#2563eb] transition cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Experience, Hourly Rate & Service Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                    Experience (Years) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    required
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] focus:outline-none focus:border-[#2563eb] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                    Hourly Rate (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      min="50"
                      step="25"
                      required
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-sm text-[#172033] focus:outline-none transition ${
                        errors.hourlyRate ? 'border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                      }`}
                    />
                  </div>
                  {errors.hourlyRate && <p className="text-[11px] text-red-600 mt-1">{errors.hourlyRate}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                    Base Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={serviceAddress}
                      onChange={(e) => setServiceAddress(e.target.value)}
                      placeholder="e.g. Kadri, Mangaluru"
                      className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                        errors.serviceAddress ? 'border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                      }`}
                    />
                  </div>
                  {errors.serviceAddress && <p className="text-[11px] text-red-600 mt-1">{errors.serviceAddress}</p>}
                </div>
              </div>

              {/* Row 4: Bio / Description */}
              <div>
                <label className="block text-xs font-semibold text-[#475569] uppercase mb-1">
                  Professional Bio / Specialties
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your trade background, certifications, and service coverage..."
                  className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none focus:border-[#2563eb] transition"
                />
              </div>

              {/* Row 5: Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer mt-3"
              >
                <span>{submitting ? 'Creating Trade Account...' : 'Complete Provider Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Bottom Switch Link */}
          <div className="pt-5 mt-5 border-t border-[#e2e8f0] text-center text-xs text-[#475569]">
            <p>
              Already registered as a provider?{' '}
              <Link
                to="/login/provider"
                state={location.state}
                className="text-[#2563eb] font-bold hover:underline"
              >
                Sign In to Provider Portal
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProviderRegister;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Wrench, 
  MapPin, 
  IndianRupee, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Sparkles 
} from 'lucide-react';

const CATEGORIES = ['Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Appliance Repair', 'Painting'];

const Register = () => {
  const [role, setRole] = useState('customer');

  // Common Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Provider-Specific Fields
  const [serviceCategory, setServiceCategory] = useState('Plumbing');
  const [experienceYears, setExperienceYears] = useState('4');
  const [hourlyRate, setHourlyRate] = useState('350');
  const [serviceAddress, setServiceAddress] = useState('');
  const [bio, setBio] = useState('');

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const errs = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      errs.fullName = 'Full name must be at least 3 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errs.email = 'Please provide a valid email address.';
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = phone.replace(/[\s\-\+]/g, '').slice(-10);
    if (!phone.trim() || !phoneRegex.test(cleanPhone)) {
      errs.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (!password || password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (role === 'provider') {
      if (!serviceAddress.trim()) {
        errs.serviceAddress = 'Service address or location in Mangaluru is required.';
      }
      if (!hourlyRate || parseFloat(hourlyRate) < 50) {
        errs.hourlyRate = 'Minimum hourly rate is ₹50.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;

    setSubmitting(true);

    const payload = {
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role,
    };

    if (role === 'provider') {
      payload.service_category = serviceCategory;
      payload.experience_years = parseInt(experienceYears, 10) || 1;
      payload.hourly_rate = parseFloat(hourlyRate) || 350.0;
      payload.service_address = serviceAddress.trim();
      payload.bio = bio.trim() || `Professional ${serviceCategory} service expert in Mangaluru.`;
      payload.latitude = 12.8703;
      payload.longitude = 74.8436;
    }

    try {
      const res = await register(payload);
      if (res.success) {
        navigate('/');
      } else {
        setServerError(res.message || 'Registration failed. Please check inputs.');
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Server error. Ensure the Flask backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#1c2036]">
      <div className="theme-card max-w-4xl w-full overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-2xl">
        
        {/* Left Panel: Brand Showcase */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#6d5dfc] via-[#8b5cf6] to-[#d946ef] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Join the Community</span>
            </div>

            <h3 className="text-2xl font-black mb-3 leading-snug">
              {role === 'provider' ? 'Grow Your Local Trade with Trust' : 'Discover Services You Can Actually Trust'}
            </h3>

            <p className="text-xs text-white/85 leading-relaxed font-medium">
              {role === 'provider'
                ? 'Join as a verified professional. Earn higher Trust Scores through on-time arrival and transparent work.'
                : 'Experience fair pricing, no fake reviews, and verified local pros in Mangaluru.'}
            </p>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/20 text-xs text-white/90">
            <p className="font-bold">Autonomous Discovery Engine</p>
            <p className="text-white/70 text-[11px] mt-0.5"> </p>
          </div>
        </div>

        {/* Right Panel: Registration Form */}
        <div className="md:col-span-7 p-8 sm:p-10 bg-[#262b47] flex flex-col justify-between">
          <div>
            
            {/* Role Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-[#1c2036] border border-[#363d66] mb-6">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  role === 'customer'
                    ? 'bg-[#6d5dfc] text-white shadow'
                    : 'text-[#a9b0d0] hover:text-white'
                }`}
              >
                I Need Services (Customer)
              </button>
              <button
                type="button"
                onClick={() => setRole('provider')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  role === 'provider'
                    ? 'bg-[#d946ef] text-white shadow'
                    : 'text-[#a9b0d0] hover:text-white'
                }`}
              >
                I am a Pro (Provider)
              </button>
            </div>

            <div className="mb-5">
              <h2 className="text-2xl font-extrabold text-white">Create Account</h2>
              <p className="text-xs text-[#a9b0d0] mt-1">
                {role === 'provider' ? 'Register your trade profile' : 'Sign up to book and rate verified pros'}
              </p>
            </div>

            {serverError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              {/* Full Name */}
              <div>
                <label className="block text-[#a9b0d0] font-semibold mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full bg-[#1c2036] border border-[#363d66] focus:border-[#6d5dfc] rounded-xl pl-9 pr-3.5 py-2.5 text-white outline-none"
                  />
                </div>
                {errors.fullName && <p className="text-rose-400 text-[11px] mt-1">{errors.fullName}</p>}
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a9b0d0] font-semibold mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[#1c2036] border border-[#363d66] focus:border-[#6d5dfc] rounded-xl pl-9 pr-3 py-2.5 text-white outline-none"
                    />
                  </div>
                  {errors.email && <p className="text-rose-400 text-[11px] mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-[#a9b0d0] font-semibold mb-1">Mobile Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-[#1c2036] border border-[#363d66] focus:border-[#6d5dfc] rounded-xl pl-9 pr-3 py-2.5 text-white outline-none"
                    />
                  </div>
                  {errors.phone && <p className="text-rose-400 text-[11px] mt-1">{errors.phone}</p>}
                </div>
              </div>

              {/* Provider Specific Profile Fields */}
              {role === 'provider' && (
                <div className="p-3.5 rounded-xl bg-[#1c2036] border border-[#363d66] space-y-3">
                  <div className="flex items-center space-x-1.5 text-[#2dd4bf] font-bold">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Provider Trade Details</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[#a9b0d0] text-[10px] uppercase font-bold mb-1">Trade</label>
                      <select
                        value={serviceCategory}
                        onChange={(e) => setServiceCategory(e.target.value)}
                        className="w-full bg-[#262b47] border border-[#363d66] rounded-lg px-2 py-2 text-white outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#a9b0d0] text-[10px] uppercase font-bold mb-1">Experience</label>
                      <input
                        type="number"
                        min="0"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        placeholder="Yrs"
                        className="w-full bg-[#262b47] border border-[#363d66] rounded-lg px-2 py-2 text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[#a9b0d0] text-[10px] uppercase font-bold mb-1">Rate (₹/hr)</label>
                      <input
                        type="number"
                        min="50"
                        step="50"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        placeholder="350"
                        className="w-full bg-[#262b47] border border-[#363d66] rounded-lg px-2 py-2 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#a9b0d0] text-[10px] uppercase font-bold mb-1">Service Base Address in Mangaluru</label>
                    <input
                      type="text"
                      value={serviceAddress}
                      onChange={(e) => setServiceAddress(e.target.value)}
                      placeholder="e.g. Kankanady Bypass Road, Mangaluru"
                      className="w-full bg-[#262b47] border border-[#363d66] rounded-lg px-2.5 py-2 text-white outline-none"
                    />
                    {errors.serviceAddress && <p className="text-rose-400 text-[11px] mt-1">{errors.serviceAddress}</p>}
                  </div>
                </div>
              )}

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a9b0d0] font-semibold mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full bg-[#1c2036] border border-[#363d66] focus:border-[#6d5dfc] rounded-xl pl-9 pr-3 py-2.5 text-white outline-none"
                    />
                  </div>
                  {errors.password && <p className="text-rose-400 text-[11px] mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-[#a9b0d0] font-semibold mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-[#1c2036] border border-[#363d66] focus:border-[#6d5dfc] rounded-xl pl-9 pr-3 py-2.5 text-white outline-none"
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-rose-400 text-[11px] mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 btn-primary text-xs font-bold tracking-wider uppercase mt-4 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{submitting ? 'Creating Profile...' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="pt-5 mt-5 border-t border-[#363d66]/60 text-center text-xs text-[#a9b0d0]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#2dd4bf] font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
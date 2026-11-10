import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const CustomerLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [roleMismatchError, setRoleMismatchError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const validate = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setRoleMismatchError('');

    if (!validate()) return;

    setSubmitting(true);

    try {
      const verifyRes = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (verifyRes.data?.success) {
        const loggedUser = verifyRes.data.user;

        // Role Boundary Guard: reject non-customers
        if (loggedUser?.role !== 'customer') {
          logout();
          const userRoleLabel =
            loggedUser?.role === 'provider' ? 'Service Provider' : 'Platform Administrator';
          setRoleMismatchError(
            `This account is registered as a ${userRoleLabel}. Please use the dedicated ${
              loggedUser?.role === 'provider' ? 'Provider Sign In' : 'Staff Login'
            } portal.`
          );
          setSubmitting(false);
          return;
        }

        await login(email.trim().toLowerCase(), password);
        setLoginSuccess(true);

        const returnToBooking = location.state?.returnToBooking;
        const bookProviderId = location.state?.bookProviderId;
        const fromPath =
          location.state?.from?.pathname ||
          (typeof location.state?.from === 'string' ? location.state.from : null);

        setTimeout(() => {
          if (returnToBooking && bookProviderId) {
            navigate(`/provider/${bookProviderId}?book=true`, { replace: true });
          } else if (fromPath && fromPath !== '/login' && fromPath !== '/auth') {
            navigate(fromPath, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }, 800);
      } else {
        setServerError(verifyRes.data?.message || 'Invalid email or password.');
      }
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Invalid email or password. Please try again.'
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
                <span>Customer Portal</span>
              </div>
              <h2 className="text-2xl font-black leading-tight text-white">Welcome Back, Homeowner</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Log in to book verified local pros, coordinate repairs in real-time, and download official invoices.
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-700 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Explainable AI trust ratings</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Fair price benchmarks for home repairs</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Secure appointment scheduling</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 text-[11px] text-slate-400">
            <span>TrustNear • Mangaluru Local Discovery</span>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:col-span-7 p-8 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
              <div>
                <h3 className="text-xl font-bold text-[#172033]">Customer Sign In</h3>
                <p className="text-xs text-[#475569] mt-0.5">Enter your registered email and password</p>
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

            {/* Amber Role Boundary Warning */}
            {roleMismatchError && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="leading-relaxed">{roleMismatchError}</p>
                </div>
                <div className="pt-1">
                  <Link
                    to="/login/provider"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 font-bold border border-amber-300 hover:bg-amber-200 transition text-xs"
                  >
                    <span>Switch to Provider Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {loginSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Sign in successful! Redirecting...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-[#475569] uppercase mb-1.5">
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

              {/* Password with Visibility Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#475569] uppercase">
                    Password <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full pl-9 pr-10 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                      errors.password ? 'border-red-500 focus:border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-[11px] text-red-600 mt-1">{errors.password}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer mt-2"
              >
                <span>{submitting ? 'Verifying Credentials...' : 'Sign In as Customer'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Bottom Navigation Switch */}
          <div className="pt-6 mt-6 border-t border-[#e2e8f0] text-center text-xs text-[#475569]">
            <p>
              New customer?{' '}
              <Link
                to="/register/customer"
                state={location.state}
                className="text-[#2563eb] font-bold hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerLogin;

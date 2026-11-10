import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

const AdminLogin = () => {
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
      errs.email = 'Staff email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Please provide a valid email format.';
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

        // Strict role boundary guard: reject non-admins
        if (loggedUser?.role !== 'admin') {
          logout();
          setRoleMismatchError(
            `Access Denied: The account '${email}' does not possess platform administrative privileges.`
          );
          setSubmitting(false);
          return;
        }

        await login(email.trim().toLowerCase(), password);
        setLoginSuccess(true);

        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 800);
      } else {
        setServerError(verifyRes.data?.message || 'Invalid administrator credentials.');
      }
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Invalid administrator credentials or unauthorized.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
      <div className="theme-card max-w-md w-full p-8 shadow-xl border border-[#e2e8f0] bg-white space-y-6">
        
        {/* Top Header */}
        <div>
          <Link
            to="/auth"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#475569] hover:text-[#172033] transition mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Role Selection</span>
          </Link>

          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#172033]">Platform Staff Sign In</h2>
              <p className="text-xs text-[#475569]">Administrative & Moderation Console</p>
            </div>
          </div>
        </div>

        {/* Error / Alert Boxes */}
        {serverError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{serverError}</span>
          </div>
        )}

        {roleMismatchError && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p className="leading-relaxed">{roleMismatchError}</p>
          </div>
        )}

        {loginSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Authorization verified. Opening Admin Console...</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase mb-1.5">
              Staff Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@trustnear.com"
                className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                  errors.email ? 'border-red-500 focus:border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                }`}
              />
            </div>
            {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] uppercase mb-1.5">
              Master Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Staff password"
                className={`w-full pl-9 pr-10 py-2 bg-white border rounded-xl text-sm text-[#172033] placeholder-slate-400 focus:outline-none transition ${
                  errors.password ? 'border-red-500 focus:border-red-500' : 'border-[#e2e8f0] focus:border-[#2563eb]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-[11px] text-red-600 mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer pt-2"
          >
            <span>{submitting ? 'Verifying Staff Access...' : 'Authenticate & Enter Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-[#e2e8f0] text-center text-[11px] text-[#475569]/80">
          <p>Restricted access. Public administrator registration is strictly forbidden.</p>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;

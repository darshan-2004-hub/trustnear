import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

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

    if (!validate()) return;

    setSubmitting(true);

    try {
      const res = await login(email.trim().toLowerCase(), password);
      if (res.success) {
        navigate('/');
      } else {
        setServerError(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Server connection error. Please verify the backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#1c2036]">
      <div className="theme-card max-w-4xl w-full overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-2xl">
        
        {/* Left Panel: Vibrant Gradient Brand Showcase */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#6d5dfc] via-[#8b5cf6] to-[#d946ef] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explainable AI</span>
            </div>

            <h3 className="text-2xl font-black mb-3 leading-snug">Welcome to TrustNear</h3>
            <p className="text-xs text-white/85 leading-relaxed font-medium">
              Access your appointments, chat live with verified professionals, and review transparent ML-calculated Trust Scores.
            </p>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/20 text-xs text-white/90">
            <p className="font-bold">Autonomous Discovery Engine</p>
            <p className="text-white/70 text-[11px] mt-0.5"></p>
          </div>
        </div>

        {/* Right Panel: High-Contrast Dark Form */}
        <div className="md:col-span-7 p-8 sm:p-10 bg-[#262b47] flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-white">Sign In to Account</h2>
              <p className="text-xs text-[#a9b0d0] mt-1">Enter your registered email and password to continue</p>
            </div>

            {serverError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Email */}
              <div>
                <label className="block text-[#a9b0d0] font-semibold mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full bg-[#1c2036] border rounded-xl pl-9 pr-3.5 py-2.5 text-white outline-none transition-all ${
                      errors.email ? 'border-rose-500' : 'border-[#363d66] focus:border-[#6d5dfc]'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-rose-400 text-[11px] mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[#a9b0d0] font-semibold">Password</label>
                  <span className="text-[11px] text-[#6d5dfc] font-medium cursor-pointer hover:underline">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#a9b0d0] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full bg-[#1c2036] border rounded-xl pl-9 pr-3.5 py-2.5 text-white outline-none transition-all ${
                      errors.password ? 'border-rose-500' : 'border-[#363d66] focus:border-[#6d5dfc]'
                    }`}
                  />
                </div>
                {errors.password && <p className="text-rose-400 text-[11px] mt-1">{errors.password}</p>}
              </div>

              {/* Remember Me */}
              <div className="flex items-center text-[11px] pt-1">
                <label className="flex items-center space-x-2 text-[#a9b0d0] cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-3.5 h-3.5 rounded border-[#363d66] accent-[#6d5dfc]"
                  />
                  <span>Keep me signed in on this browser</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 btn-primary text-xs font-bold tracking-wider uppercase mt-3 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{submitting ? 'Verifying...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Footer Link */}
          <div className="pt-6 mt-6 border-t border-[#363d66]/60 text-center text-xs text-[#a9b0d0]">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-[#2dd4bf] font-bold hover:underline">
              Create an account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
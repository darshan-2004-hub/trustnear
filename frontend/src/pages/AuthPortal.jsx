import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Wrench,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  ChevronRight
} from 'lucide-react';

const AuthPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Forward existing state (such as returnToBooking, bookProviderId, and originating route)
  const handleNavigate = (path) => {
    navigate(path, { state: location.state });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8fafc] text-[#172033] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        
        {/* Header Banner */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Secure Access & Identity</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-[#172033] tracking-tight">
            Choose Your TrustNear Experience
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] max-w-xl mx-auto leading-relaxed">
            Select your account type to access verified home services or manage your professional trade business.
          </p>
        </div>

        {/* 2 Main Role Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CARD 1: CUSTOMER */}
          <div className="theme-card bg-white p-6 sm:p-8 flex flex-col justify-between border-[#e2e8f0] hover:border-blue-500 transition-all group relative overflow-hidden shadow-xs hover:shadow-md">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <User className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
                  Homeowner / Client
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#172033] group-hover:text-blue-600 transition-colors">
                  Continue as Customer
                </h2>
                <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">
                  Looking for trusted plumbers, electricians, carpenters, or cleaners with verified community reviews and fair prices.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[#e2e8f0] text-xs text-[#475569]">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Explainable ML trust scores and transparent ratings</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Local radar discovery across Mangaluru</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Real-time booking coordination & 1-click digital invoices</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-6 mt-4 border-t border-[#e2e8f0]">
              <button
                onClick={() => handleNavigate('/login/customer')}
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
              >
                <span>Sign In as Customer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => handleNavigate('/register/customer')}
                className="w-full btn-secondary py-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer hover:border-blue-400"
              >
                <span>New customer? Create an account</span>
              </button>
            </div>
          </div>

          {/* CARD 2: SERVICE PROVIDER */}
          <div className="theme-card bg-white p-6 sm:p-8 flex flex-col justify-between border-[#e2e8f0] hover:border-blue-500 transition-all group relative overflow-hidden shadow-xs hover:shadow-md">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-[#172033] border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Wrench className="w-7 h-7 text-blue-600" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 uppercase tracking-wider">
                  Verified Professional
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#172033] group-hover:text-blue-600 transition-colors">
                  Continue as Service Provider
                </h2>
                <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">
                  Offer your skilled trade, receive verified customer requests, track monthly earnings, and build a trusted local reputation.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[#e2e8f0] text-xs text-[#475569]">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dedicated Provider Analytics & Earnings Dashboard</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Real-time Job Queue to accept or decline incoming jobs</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Direct client chat and automated trust score growth</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-6 mt-4 border-t border-[#e2e8f0]">
              <button
                onClick={() => handleNavigate('/login/provider')}
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
              >
                <span>Sign In as Provider</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleNavigate('/register/provider')}
                className="w-full btn-secondary py-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer hover:border-blue-400"
              >
                <span>Register your trade business</span>
              </button>
            </div>
          </div>

        </div>

        {/* Discrete Admin Access Footer Section */}
        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#475569] shadow-xs">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Platform Administrator or Moderator?</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleNavigate('/login/admin')}
              className="text-purple-700 hover:text-purple-900 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
            >
              <span>Staff Login</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-[#475569]/70 italic hidden md:inline">
              (Public admin registration is strictly restricted)
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPortal;

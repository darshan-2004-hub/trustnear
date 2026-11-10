import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Search, 
  CalendarCheck, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  TrendingUp,
  Briefcase,
  User
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;
  const isUserLoggedIn = Boolean(user || isAuthenticated);
  const isProvider = user?.role === 'provider';
  const isAdmin = user?.role === 'admin';

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e2e8f0] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white p-0.5 shadow-sm flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-extrabold tracking-tight text-[#172033]">
                  Trust<span className="text-blue-600">Near</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-[#475569] font-medium tracking-wide">Smart Service Discovery</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-1.5">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive('/') 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs' 
                  : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
              }`}
            >
              Home
            </Link>

            {/* Provider-Specific Dashboard Link */}
            {isUserLoggedIn && isProvider && (
              <Link
                to="/provider-dashboard"
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive('/provider-dashboard') 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs' 
                    : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Dashboard</span>
              </Link>
            )}

            {/* Job Queue for Providers / My Bookings for Customers */}
            {isUserLoggedIn && (
              <Link
                to={isProvider ? "/job-queue" : "/bookings"}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive('/bookings') || isActive('/job-queue')
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs' 
                    : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-blue-600" />
                <span>{isProvider ? 'Job Queue' : 'My Bookings'}</span>
              </Link>
            )}

            <Link
              to="/providers"
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive('/providers') || isActive('/search')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs' 
                  : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4 text-blue-600" />
              <span>Find Services</span>
            </Link>

            {isUserLoggedIn && !isProvider && !isAdmin && (
              <Link
                to="/profile"
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive('/profile') 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs' 
                    : 'text-[#475569] hover:text-[#172033] hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4 text-blue-600" />
                <span>Profile</span>
              </Link>
            )}

            {isUserLoggedIn && isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive('/admin') 
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs' 
                    : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>

          {/* Right Action / Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isUserLoggedIn ? (
              <div className="flex items-center space-x-2.5">
                <Link
                  to={isProvider ? "/provider-dashboard" : isAdmin ? "/admin" : "/profile"}
                  className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-[#e2e8f0] hover:border-blue-400 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#172033] leading-tight">{user?.full_name?.split(' ')[0]}</p>
                    <span className="text-[10px] uppercase font-bold text-[#475569] tracking-wider">
                      {user?.role}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 text-[#475569] hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <Link
                  to="/auth"
                  className="px-4 py-2 text-sm font-semibold text-[#172033] hover:bg-slate-100 rounded-xl transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  className="px-4 py-2 text-sm font-semibold btn-primary flex items-center space-x-1.5 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Get Started</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#475569] hover:text-[#172033] rounded-xl hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#e2e8f0] px-4 pt-3 pb-5 space-y-2 shadow-md">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-[#172033] hover:bg-slate-50"
          >
            Home
          </Link>
          {isUserLoggedIn && isProvider && (
            <Link
              to="/provider-dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-[#172033] hover:bg-slate-50"
            >
              Provider Dashboard
            </Link>
          )}
          {isUserLoggedIn && (
            <Link
              to={isProvider ? "/job-queue" : "/bookings"}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-[#172033] hover:bg-slate-50"
            >
              {isProvider ? 'Job Queue' : 'My Bookings'}
            </Link>
          )}
          {isUserLoggedIn && !isProvider && !isAdmin && (
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-[#172033] hover:bg-slate-50"
            >
              My Profile
            </Link>
          )}
          <Link
            to="/providers"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-[#172033] hover:bg-slate-50"
          >
            Find Services
          </Link>
          {isUserLoggedIn && isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              Admin Console
            </Link>
          )}

          <div className="pt-3 border-t border-[#e2e8f0]">
            {isUserLoggedIn ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#172033]">{user?.full_name}</p>
                  <p className="text-xs text-[#475569] capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg font-bold"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-sm text-[#172033] bg-slate-100 rounded-xl font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-sm font-semibold btn-primary"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

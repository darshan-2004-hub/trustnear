import React, { useState, useRef, useEffect } from 'react';
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
  User,
  ChevronDown,
  LogIn,
  UserPlus,
  Lock,
  Wrench
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signInDropdownOpen, setSignInDropdownOpen] = useState(false);
  const [registerDropdownOpen, setRegisterDropdownOpen] = useState(false);

  const signInRef = useRef(null);
  const registerRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (signInRef.current && !signInRef.current.contains(e.target)) {
        setSignInDropdownOpen(false);
      }
      if (registerRef.current && !registerRef.current.contains(e.target)) {
        setRegisterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-emerald-200/70 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-sky-600 text-white p-0.5 shadow-md shadow-emerald-600/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-extrabold tracking-tight text-[#172033]">
                  Trust<span className="text-emerald-600">Near</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs' 
                  : 'text-[#475569] hover:text-[#065f46] hover:bg-emerald-50/60'
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
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs' 
                    : 'text-[#475569] hover:text-[#065f46] hover:bg-emerald-50/60'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Dashboard</span>
              </Link>
            )}

            {/* Job Queue for Providers / My Bookings for Customers */}
            {isUserLoggedIn && (
              <Link
                to={isProvider ? "/job-queue" : "/bookings"}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive('/bookings') || isActive('/job-queue')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs' 
                    : 'text-[#475569] hover:text-[#065f46] hover:bg-emerald-50/60'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                <span>{isProvider ? 'Job Queue' : 'My Bookings'}</span>
              </Link>
            )}

            <Link
              to="/providers"
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive('/providers') || isActive('/search')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs' 
                  : 'text-[#475569] hover:text-[#065f46] hover:bg-emerald-50/60'
              }`}
            >
              <Search className="w-4 h-4 text-sky-600" />
              <span>Find Services</span>
            </Link>

            {isUserLoggedIn && !isProvider && !isAdmin && (
              <Link
                to="/profile"
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive('/profile') 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs' 
                    : 'text-[#475569] hover:text-[#065f46] hover:bg-emerald-50/60'
                }`}
              >
                <User className="w-4 h-4 text-emerald-600" />
                <span>Profile</span>
              </Link>
            )}

            {isUserLoggedIn && isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive('/admin') 
                    ? 'bg-teal-50 text-teal-800 border border-teal-300 shadow-2xs' 
                    : 'text-teal-700 hover:text-teal-900 hover:bg-teal-50'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-teal-600" />
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
                  className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-emerald-50/60 border border-emerald-200 hover:border-emerald-400 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#172033] leading-tight">{user?.full_name?.split(' ')[0]}</p>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
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
              <div className="flex items-center space-x-2">
                {/* 1, 3, 5: Separate Sign In Direct Dropdown */}
                <div className="relative" ref={signInRef}>
                  <button
                    onClick={() => {
                      setSignInDropdownOpen(!signInDropdownOpen);
                      setRegisterDropdownOpen(false);
                    }}
                    className="flex items-center space-x-1 px-3.5 py-2 text-xs font-bold text-[#172033] hover:bg-emerald-50 border border-emerald-200/70 rounded-xl transition-all cursor-pointer bg-white/75"
                  >
                    <span>Sign In</span>
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                  </button>

                  {signInDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-emerald-200 py-2 z-50 text-xs">
                      <div className="px-3 py-1 text-[10px] uppercase font-extrabold tracking-wider text-emerald-700">
                        Select Portal
                      </div>
                      <Link
                        to="/login/customer"
                        onClick={() => setSignInDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3.5 py-2 hover:bg-emerald-50 text-[#172033] font-semibold"
                      >
                        <User className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold text-xs">Customer Login</div>
                          <div className="text-[10px] text-[#475569]">Homeowners & Clients</div>
                        </div>
                      </Link>
                      <Link
                        to="/login/provider"
                        onClick={() => setSignInDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3.5 py-2 hover:bg-sky-50 text-[#172033] font-semibold"
                      >
                        <Wrench className="w-4 h-4 text-sky-600 shrink-0" />
                        <div>
                          <div className="font-bold text-xs">Provider Login</div>
                          <div className="text-[10px] text-[#475569]">Trades & Professionals</div>
                        </div>
                      </Link>
                      <div className="border-t border-emerald-100 my-1"></div>
                      <Link
                        to="/login/admin"
                        onClick={() => setSignInDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3.5 py-1.5 hover:bg-teal-50 text-teal-800 font-bold"
                      >
                        <Lock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="text-xs">Admin Staff Login</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* 2 & 4: Separate Register Direct Dropdown */}
                <div className="relative" ref={registerRef}>
                  <button
                    onClick={() => {
                      setRegisterDropdownOpen(!registerDropdownOpen);
                      setSignInDropdownOpen(false);
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold btn-primary rounded-xl shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Register</span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/80" />
                  </button>

                  {registerDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-emerald-200 py-2 z-50 text-xs">
                      <div className="px-3 py-1 text-[10px] uppercase font-extrabold tracking-wider text-emerald-700">
                        Create Account
                      </div>
                      <Link
                        to="/register/customer"
                        onClick={() => setRegisterDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3.5 py-2 hover:bg-emerald-50 text-[#172033] font-semibold"
                      >
                        <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold text-xs">Customer Register</div>
                          <div className="text-[10px] text-[#475569]">New client account</div>
                        </div>
                      </Link>
                      <Link
                        to="/register/provider"
                        onClick={() => setRegisterDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3.5 py-2 hover:bg-sky-50 text-[#172033] font-semibold"
                      >
                        <Wrench className="w-4 h-4 text-sky-600 shrink-0" />
                        <div>
                          <div className="font-bold text-xs">Provider Register</div>
                          <div className="text-[10px] text-[#475569]">Register skilled trade</div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
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
              <div className="space-y-3 pt-2">
                <div className="text-[10px] uppercase font-extrabold tracking-wider text-[#475569]">
                  Sign In to Your Account
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login/customer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 px-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl"
                  >
                    Customer Login
                  </Link>
                  <Link
                    to="/login/provider"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 px-2 text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded-xl"
                  >
                    Provider Login
                  </Link>
                </div>

                <div className="text-[10px] uppercase font-extrabold tracking-wider text-[#475569] pt-1">
                  New to TrustNear? Register
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/register/customer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 px-2 text-xs font-bold btn-secondary rounded-xl"
                  >
                    Customer Register
                  </Link>
                  <Link
                    to="/register/provider"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 px-2 text-xs font-bold btn-primary rounded-xl"
                  >
                    Provider Register
                  </Link>
                </div>

                <div className="pt-2 border-t border-[#e2e8f0] flex justify-center">
                  <Link
                    to="/login/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center space-x-1"
                  >
                    <Lock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Staff / Admin Login →</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

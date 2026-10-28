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
  Sparkles 
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

  return (
    <nav className="sticky top-0 z-40 bg-[#1c2036]/90 backdrop-blur-xl border-b border-[#363d66]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-tr from-[#6d5dfc] to-[#d946ef] p-0.5 shadow-lg shadow-[#6d5dfc]/25 group-hover:shadow-[#6d5dfc]/50 transition-all">
              <div className="w-full h-full bg-[#1c2036] rounded-[12px] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[#2dd4bf]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-extrabold tracking-tight text-white">
                  Trust<span className="text-[#6d5dfc]">Near</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#d946ef]/15 text-[#d946ef] border border-[#d946ef]/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-[#a9b0d0] font-medium tracking-wide">Smart Service Discovery</p>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center space-x-2">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive('/') 
                  ? 'bg-[#6d5dfc]/15 text-[#6d5dfc] border border-[#6d5dfc]/30' 
                  : 'text-[#a9b0d0] hover:text-white hover:bg-[#262b47]'
              }`}
            >
              Home
            </Link>

            <Link
              to="/providers"
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive('/providers') || isActive('/search')
                  ? 'bg-[#6d5dfc]/15 text-[#6d5dfc] border border-[#6d5dfc]/30' 
                  : 'text-[#a9b0d0] hover:text-white hover:bg-[#262b47]'
              }`}
            >
              <Search className="w-4 h-4 text-[#2dd4bf]" />
              <span>Find Services</span>
            </Link>

            {isUserLoggedIn && (
              <Link
                to="/bookings"
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive('/bookings') 
                    ? 'bg-[#6d5dfc]/15 text-[#6d5dfc] border border-[#6d5dfc]/30' 
                    : 'text-[#a9b0d0] hover:text-white hover:bg-[#262b47]'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-[#d946ef]" />
                <span>My Bookings</span>
              </Link>
            )}

            {isUserLoggedIn && user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive('/admin') 
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                    : 'text-purple-300 hover:text-white hover:bg-[#262b47]'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>

          {/* Right Action / Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isUserLoggedIn ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/bookings"
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#262b47] border border-[#363d66] hover:border-[#6d5dfc] transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#6d5dfc] to-[#d946ef] text-white flex items-center justify-center font-bold text-xs">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white leading-tight">{user?.full_name?.split(' ')[0]}</p>
                    <span className="text-[10px] uppercase font-bold text-[#a9b0d0] tracking-wider">
                      {user?.role}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 text-[#a9b0d0] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-[#f1f3ff] hover:bg-[#262b47] rounded-xl transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold btn-primary flex items-center space-x-1.5"
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
              className="p-2 text-[#a9b0d0] hover:text-white rounded-xl hover:bg-[#262b47]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#262b47] border-b border-[#363d66] px-4 pt-3 pb-5 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium text-white hover:bg-[#1c2036]"
          >
            Home
          </Link>
          <Link
            to="/providers"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium text-white hover:bg-[#1c2036]"
          >
            Find Services
          </Link>
          {isUserLoggedIn && (
            <Link
              to="/bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-medium text-white hover:bg-[#1c2036]"
            >
              My Bookings
            </Link>
          )}

          <div className="pt-3 border-t border-[#363d66]">
            {isUserLoggedIn ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{user?.full_name}</p>
                  <p className="text-xs text-[#a9b0d0] capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg font-bold"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-sm text-white bg-[#1c2036] rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-sm font-semibold btn-primary"
                >
                  Register
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
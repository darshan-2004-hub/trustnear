import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SearchProviders from './pages/SearchProviders';
import Bookings from './pages/Bookings';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProviderDetail from './pages/ProviderDetail';
import AuthPortal from './pages/AuthPortal';
import CustomerLogin from './pages/CustomerLogin';
import CustomerRegister from './pages/CustomerRegister';
import ProviderLogin from './pages/ProviderLogin';
import ProviderRegister from './pages/ProviderRegister';
import AdminLogin from './pages/AdminLogin';
import CustomerProfile from './pages/CustomerProfile';
import AIAssistantWidget from './components/AIAssistantWidget';

// Route guard for protected pages
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

// Route guard specifically for providers
const ProviderRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'provider') return <Navigate to="/bookings" replace />;
  return children;
};

// Smart redirect for legacy /dashboard route
const DashboardRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'provider') {
    return <Navigate to="/provider-dashboard" replace />;
  }
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/bookings" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#172033] relative selection:bg-[#2563eb] selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/providers" element={<SearchProviders />} />
              <Route path="/search" element={<SearchProviders />} />
              <Route path="/provider/:id" element={<ProviderDetail />} />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <CustomerProfile />
                  </ProtectedRoute>
                } 
              />
              <Route path="/auth" element={<AuthPortal />} />
              
              {/* Dedicated Customer Authentication Routes */}
              <Route path="/login/customer" element={<CustomerLogin />} />
              <Route path="/register/customer" element={<CustomerRegister />} />

              {/* Dedicated Provider Authentication Routes */}
              <Route path="/login/provider" element={<ProviderLogin />} />
              <Route path="/register/provider" element={<ProviderRegister />} />

              {/* Dedicated Admin Staff Authentication Route */}
              <Route path="/login/admin" element={<AdminLogin />} />

              {/* Redirect legacy /login and /register to role portal */}
              <Route path="/login" element={<Navigate to="/auth" replace />} />
              <Route path="/register" element={<Navigate to="/auth" replace />} />
              
              <Route 
                path="/provider-dashboard" 
                element={
                  <ProviderRoute>
                    <ProviderDashboard />
                  </ProviderRoute>
                } 
              />
              <Route 
                path="/job-queue" 
                element={
                  <ProtectedRoute>
                    <Bookings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bookings" 
                element={
                  <ProtectedRoute>
                    <Bookings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardRedirect />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          {/* Global Floating AI Assistant Widget */}
          <AIAssistantWidget />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

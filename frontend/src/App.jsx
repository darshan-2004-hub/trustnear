import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import SearchProviders from './pages/SearchProviders';
import Bookings from './pages/Bookings';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AIAssistantWidget from './components/AIAssistantWidget';

// Route guard for protected pages
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

// Route guard specifically for providers
const ProviderRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
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
        <div className="min-h-screen flex flex-col bg-[#1c2036] text-[#f1f3ff] relative selection:bg-[#6d5dfc] selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/providers" element={<SearchProviders />} />
              <Route path="/search" element={<SearchProviders />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
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

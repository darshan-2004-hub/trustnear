import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import SearchProviders from './pages/SearchProviders';
import Bookings from './pages/Bookings';
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
                    <Bookings />
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
            </Routes>
          </main>
          
          {/* AI Floating Assistant */}
          <AIAssistantWidget />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
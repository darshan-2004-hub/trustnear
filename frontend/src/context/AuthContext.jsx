import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Read saved token & user immediately from localStorage to prevent auth lag
  const [token, setToken] = useState(() => localStorage.getItem('trustnear_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('trustnear_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const storedToken = localStorage.getItem('trustnear_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        if (response.data?.success && response.data.user) {
          setUser(response.data.user);
          localStorage.setItem('trustnear_user', JSON.stringify(response.data.user));
        }
      } catch (err) {
        console.error('Failed to verify token:', err);
        // Only log out if the backend rejects with 401 Unauthorized
        if (err.response?.status === 401) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [token]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.success) {
      const { token, user } = response.data;
      localStorage.setItem('trustnear_token', token);
      localStorage.setItem('trustnear_user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      return { success: true, user };
    }
    return { success: false, message: response.data?.message || 'Login failed.' };
  };

  const register = async (registrationData) => {
    const response = await api.post('/auth/register', registrationData);
    if (response.data?.success) {
      const { token, user } = response.data;
      localStorage.setItem('trustnear_token', token);
      localStorage.setItem('trustnear_user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      return { success: true, user };
    }
    return { success: false, message: response.data?.message || 'Registration failed.' };
  };

  const logout = () => {
    localStorage.removeItem('trustnear_token');
    localStorage.removeItem('trustnear_user');
    setToken(null);
    setUser(null);
  };

  // Explicitly export boolean isAuthenticated
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
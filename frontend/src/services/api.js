import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Attach JWT Bearer token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trustnear_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: Handle session expiration (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or invalid
      if (localStorage.getItem('trustnear_token')) {
        localStorage.removeItem('trustnear_token');
        localStorage.removeItem('trustnear_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
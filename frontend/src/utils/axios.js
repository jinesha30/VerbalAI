import axios from 'axios';

// Base API URL
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios defaults
axios.defaults.baseURL = API_URL;

/**
 * Initialize axios with JWT token from localStorage
 * Call this when the app starts
 */
export function initializeAxios() {
  const token = localStorage.getItem('token');
  
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  // Request interceptor to add token to all requests
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  
  // Response interceptor to handle token expiration
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        const errorCode = error.response.data?.code;
        
        // Handle token expiration or invalid token
        if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN' || errorCode === 'NO_TOKEN') {
          // Clear stored data
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('userType');
          
          // Remove authorization header
          delete axios.defaults.headers.common['Authorization'];
          
          // Redirect to login if not already there
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
      
      return Promise.reject(error);
    }
  );
}

/**
 * Set JWT token in axios headers and localStorage
 * @param {string} token - JWT token
 */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  }
}

/**
 * Clear authentication data and logout
 */
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userType');
  delete axios.defaults.headers.common['Authorization'];
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!localStorage.getItem('token');
}

/**
 * Get current user from localStorage
 * @returns {Object|null}
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Get current user type
 * @returns {string|null} - 'student' or 'admin'
 */
export function getUserType() {
  return localStorage.getItem('userType');
}

export default axios;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const API_URL = 'http://localhost:5000/api';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    userType: 'student' // 'student', 'school_admin', or 'system_admin'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = (formData.userType === 'school_admin' || formData.userType === 'system_admin') ? '/admin/login' : '/login';
      const response = await axios.post(`${API_URL}${endpoint}`, {
        username: formData.username,
        password: formData.password
      });
      
      // Store JWT token and user data in localStorage
      localStorage.setItem('token', response.data.token);
      
      if (response.data.userType === 'admin') {
        localStorage.setItem('currentUser', JSON.stringify(response.data.admin));
        localStorage.setItem('userType', 'admin');
        
        // Set default Authorization header for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        navigate('/admin-dashboard');
      } else {
        localStorage.setItem('currentUser', JSON.stringify(response.data.student));
        localStorage.setItem('userType', 'student');
        
        // Set default Authorization header for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        navigate('/assessment');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="card-icon">
          <i className="fas fa-book-open"></i>
        </div>
        <h1>
          {formData.userType === 'student' ? 'Student' : 
           formData.userType === 'system_admin' ? 'System Administrator' : 
           'School Admin'} Login
        </h1>
        <p className="subtitle">Learning Ability Assessment System</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="userType">Login As</label>
            <select
              id="userType"
              name="userType"
              value={formData.userType}
              onChange={handleChange}
            >
              <option value="student">Student</option>
              <option value="school_admin">School Admin</option>
              <option value="system_admin">System Administrator</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="register-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;

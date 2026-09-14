import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Registration.css';

const API_URL = 'http://localhost:5000/api';

function Registration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    rollno: '',
    school: '',
    schoolId: '',
    std: '',
    age: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    userType: 'student', // 'student', 'school_admin', 'system_admin'
    role: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  // Fetch schools on component mount
  React.useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoadingSchools(true);
    try {
      const response = await axios.get(`${API_URL}/schools`);
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoadingSchools(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      
      // If school dropdown changed, update both schoolId and school name
      if (name === 'schoolId') {
        const selectedSchool = schools.find(s => s._id === value);
        if (selectedSchool) {
          updated.school = selectedSchool.name;
        }
      }
      
      // If userType changes, set role accordingly
      if (name === 'userType') {
        if (value === 'school_admin') {
          updated.role = 'school_admin';
        } else if (value === 'system_admin') {
          updated.role = 'system_admin';
        } else {
          updated.role = '';
        }
      }
      
      return updated;
    });
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Student-specific validations
    if (formData.userType === 'student') {
      if (!formData.rollno.trim()) newErrors.rollno = 'Roll number is required';
      if (!formData.schoolId) newErrors.schoolId = 'Please select a school';
      if (!formData.std) newErrors.std = 'Standard is required';
      if (!formData.age) newErrors.age = 'Age is required';
    }

    // Admin-specific validations
    if (formData.userType === 'school_admin') {
      if (!formData.schoolId) newErrors.schoolId = 'Please select a school';
      if (!formData.email.trim()) newErrors.email = 'Email is required for admin';
    }

    if (formData.userType === 'system_admin') {
      if (!formData.email.trim()) newErrors.email = 'Email is required for admin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      let response;
      
      if (formData.userType === 'student') {
        // Student registration
        response = await axios.post(`${API_URL}/register`, formData);
        
        // Store JWT token
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('currentUser', JSON.stringify(response.data.student));
        localStorage.setItem('userType', 'student');
        
        // Set default Authorization header for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        alert('Registration successful!');
        navigate('/assessment');
      } else {
        // Admin registration
        response = await axios.post(`${API_URL}/admin/register`, {
          name: formData.name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          schoolId: formData.schoolId || null
        });
        
        // Store JWT token
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('currentUser', JSON.stringify(response.data.admin));
        localStorage.setItem('userType', 'admin');
        
        // Set default Authorization header for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        alert('Admin registration successful!');
        navigate('/admin-dashboard');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Registration failed. Please try again.';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        <div className="card-icon">
          <i className="fas fa-user-plus"></i>
        </div>
        <h1>{formData.userType === 'student' ? 'Student' : 'Admin'} Registration</h1>
        <p className="subtitle">Learning Ability Assessment System</p>

        <form onSubmit={handleSubmit}>
          {/* User Type Selection */}
          <div className="form-group">
            <label htmlFor="userType">Register As <span className="required">*</span></label>
            <select id="userType" name="userType" value={formData.userType} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="school_admin">School Admin</option>
              <option value="system_admin">System Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name <span className="required">*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
            />
            {errors.name && <span className="error">{errors.name}</span>}
          </div>

          {/* Student-specific fields */}
          {formData.userType === 'student' && (
            <>
              <div className="form-group">
                <label htmlFor="rollno">Roll Number <span className="required">*</span></label>
                <input
                  type="text"
                  id="rollno"
                  name="rollno"
                  value={formData.rollno}
                  onChange={handleChange}
                  placeholder="Enter your roll number"
                />
                {errors.rollno && <span className="error">{errors.rollno}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="schoolId">School <span className="required">*</span></label>
                <select id="schoolId" name="schoolId" value={formData.schoolId} onChange={handleChange}>
                  <option value="">Select School</option>
                  {loadingSchools ? (
                    <option disabled>Loading schools...</option>
                  ) : (
                    schools.map(school => (
                      <option key={school._id} value={school._id}>{school.name}</option>
                    ))
                  )}
                </select>
                {errors.schoolId && <span className="error">{errors.schoolId}</span>}
              </div>
            </>
          )}

          {/* School selection for school admins */}
          {formData.userType === 'school_admin' && (
            <div className="form-group">
              <label htmlFor="schoolId">School <span className="required">*</span></label>
              <select id="schoolId" name="schoolId" value={formData.schoolId} onChange={handleChange}>
                <option value="">Select School</option>
                {loadingSchools ? (
                  <option disabled>Loading schools...</option>
                ) : (
                  schools.map(school => (
                    <option key={school._id} value={school._id}>{school.name}</option>
                  ))
                )}
              </select>
              {errors.schoolId && <span className="error">{errors.schoolId}</span>}
            </div>
          )}

          {formData.userType === 'student' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="std">Standard/Class <span className="required">*</span></label>
                  <select id="std" name="std" value={formData.std} onChange={handleChange}>
                    <option value="">Select Standard</option>
                    {[1, 2, 3, 4, 5, 6, 7].map(num => (
                      <option key={num} value={num}>{num}{num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Standard</option>
                    ))}
                  </select>
                  {errors.std && <span className="error">{errors.std}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="age">Age <span className="required">*</span></label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="Age"
                    min="5"
                    max="20"
                  />
                  {errors.age && <span className="error">{errors.age}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email (optional)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number (optional)"
                />
              </div>
            </>
          )}

          {/* Admin-specific fields */}
          {(formData.userType === 'school_admin' || formData.userType === 'system_admin') && (
            <div className="form-group">
              <label htmlFor="email">Email <span className="required">*</span></label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
              />
              {errors.email && <span className="error">{errors.email}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username <span className="required">*</span></label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Create a username"
            />
            {errors.username && <span className="error">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password <span className="required">*</span></label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
            />
            {errors.password && <span className="error">{errors.password}</span>}
            <small>Password must be at least 6 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password <span className="required">*</span></label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
            />
            {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="login-link">
          Already have an account? <Link to="/login">Login here</Link>
        </div>
      </div>
    </div>
  );
}

export default Registration;

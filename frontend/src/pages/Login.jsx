import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await api.login(formData);
      login(response);
      navigate('/home');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <img src="img/coffee-hero-section.png" alt="Coffee" className="auth-image" />
          <div className="auth-overlay">
            <h2>Welcome Back!</h2>
            <p>Login to explore our amazing coffee collection</p>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-container">
            <div className="auth-header">
              <img src="img/logo.png" alt="Bharadwaj's Cafe" className="auth-logo" />
              <h1>Login to Your Account</h1>
              <p>Enter your credentials to continue</p>
            </div>

            {successMessage && (
              <div className="success-message">
                <i className="fa-solid fa-circle-check"></i>
                {successMessage}
              </div>
            )}

            {error && (
              <div className="error-message">
                <i className="fa-solid fa-circle-exclamation"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">
                  <i className="fa-solid fa-envelope"></i>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <i className="fa-solid fa-lock"></i>
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-footer">
                <Link to="/forgot-password" className="forgot-link">
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <div className="auth-redirect">
              <p>New user? <Link to="/register" className="redirect-link">Register here</Link></p>
            </div>

            <div className="back-home">
              <Link to="/" className="back-link">
                <i className="fa-solid fa-arrow-left"></i> Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

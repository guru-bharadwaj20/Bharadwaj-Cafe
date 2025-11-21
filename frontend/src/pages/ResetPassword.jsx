import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match!' });
      return;
    }

    if (formData.password.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters!' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await api.resetPassword(token, formData.password);
      setStatus({
        type: 'success',
        message: response.message || 'Password reset successful!',
      });
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Failed to reset password. Link may be expired.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container reset-password-container">
        <div className="auth-right center-form">
          <div className="auth-form-container">
            <div className="auth-header">
              <img src="/img/logo.png" alt="Bharadwaj's Cafe" className="auth-logo" />
              <h1>Reset Password</h1>
              <p>Enter your new password</p>
            </div>

            {status.message && (
              <div className={`${status.type === 'success' ? 'success-message' : 'error-message'}`}>
                <i className={`fa-solid ${status.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
                {status.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="password">
                  <i className="fa-solid fa-lock"></i>
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  required
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <i className="fa-solid fa-lock"></i>
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  required
                  minLength="6"
                />
              </div>

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                Remember your password? <Link to="/login">Login here</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

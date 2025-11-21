import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await api.forgotPassword(email);
      setStatus({
        type: 'success',
        message: response.message || 'Password reset link has been sent to your email address!',
      });
      setEmail('');
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Failed to send reset email. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container forgot-password-container">
        <div className="auth-right center-form">
          <div className="auth-form-container">
            <div className="auth-header">
              <img src="img/logo.png" alt="Bharadwaj's Cafe" className="auth-logo" />
              <h1>Forgot Password?</h1>
              <p>Enter your email to receive a password reset link</p>
            </div>

            {status.message && (
              <div className={`${status.type === 'success' ? 'success-message' : 'error-message'}`}>
                <i className={`fa-solid ${status.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
                {status.message}
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
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <div className="auth-redirect">
              <p>Remember your password? <Link to="/login" className="redirect-link">Login here</Link></p>
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

export default ForgotPassword;

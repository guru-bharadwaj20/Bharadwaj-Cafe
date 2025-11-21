import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ type: 'loading', message: 'Verifying your email...' });

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await api.verifyEmail(token);
      setStatus({
        type: 'success',
        message: response.message || 'Email verified successfully!',
      });
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Verification failed. Link may be invalid or expired.',
      });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container verify-email-container">
        <div className="auth-right center-form">
          <div className="auth-form-container">
            <div className="auth-header">
              <img src="/img/logo.png" alt="Bharadwaj's Cafe" className="auth-logo" />
              <h1>Email Verification</h1>
            </div>

            <div className="verification-status">
              {status.type === 'loading' && (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>{status.message}</p>
                </div>
              )}

              {status.type === 'success' && (
                <div className="success-box">
                  <i className="fa-solid fa-circle-check"></i>
                  <h2>Success!</h2>
                  <p>{status.message}</p>
                  <p className="redirect-info">Redirecting to login page...</p>
                </div>
              )}

              {status.type === 'error' && (
                <div className="error-box">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <h2>Verification Failed</h2>
                  <p>{status.message}</p>
                  <div className="action-buttons">
                    <Link to="/register" className="btn-primary">Register Again</Link>
                    <Link to="/login" className="btn-secondary">Go to Login</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

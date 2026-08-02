import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { formGroup, formLabel, formLabelIcon, formInput } from '../styles/forms';
import { IMG } from '../assets/cloudinary';
import { errorMessage, successMessage } from '../styles/messages';
import {
  authPage,
  authContainer,
  authRightCentered,
  authFormContainer,
  authHeader,
  authLogo,
  authTitle,
  authSubtitle,
  authForm,
  authBtn,
  authRedirect,
  authRedirectText,
  redirectLink,
} from '../styles/auth';

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
    <div className={authPage} id="main-content">
      <div className={authContainer}>
        <div className={authRightCentered}>
          <div className={authFormContainer}>
            <div className={authHeader}>
              <img src={IMG.logo} alt="Bharadwaj's Cafe" className={authLogo} />
              <h1 className={authTitle}>Reset Password</h1>
              <p className={authSubtitle}>Enter your new password</p>
            </div>

            {status.message && (
              <div className={status.type === 'success' ? successMessage : errorMessage}>
                <i
                  className={`fa-solid ${status.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}
                ></i>
                {status.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className={authForm}>
              <div className={formGroup}>
                <label htmlFor="password" className={formLabel}>
                  <i className={`fa-solid fa-lock ${formLabelIcon}`} aria-hidden="true"></i>
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  className={formInput}
                  required
                  minLength="6"
                />
              </div>

              <div className={formGroup}>
                <label htmlFor="confirmPassword" className={formLabel}>
                  <i className={`fa-solid fa-lock ${formLabelIcon}`} aria-hidden="true"></i>
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  className={formInput}
                  required
                  minLength="6"
                />
              </div>

              {/* Was `.submit-button`, and before that nothing at all: no
                  stylesheet in the project declared that class, so the one
                  button on this page rendered as a bare browser button while
                  the other four auth pages showed the amber one. */}
              <button type="submit" className={authBtn} disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            {/* Likewise `.auth-footer`, with an unclassed link inside it, so
                "Login here" came out as default browser blue. This is the same
                markup the other four pages use. */}
            <div className={authRedirect}>
              <p className={authRedirectText}>
                Remember your password?{' '}
                <Link to="/login" className={redirectLink}>
                  Login here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

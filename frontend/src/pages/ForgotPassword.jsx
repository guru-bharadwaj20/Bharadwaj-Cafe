import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  authDivider,
  authDividerLabel,
  authRedirect,
  authRedirectText,
  redirectLink,
  backHome,
  backLink,
  backLinkIcon,
} from '../styles/auth';

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
    <div className={authPage} id="main-content">
      {/* No image panel on this page, so the form half is centred rather than
          taking half the width. `.forgot-password-container` used to sit here
          too; no stylesheet ever declared it. */}
      <div className={authContainer}>
        <div className={authRightCentered}>
          <div className={authFormContainer}>
            <div className={authHeader}>
              <img src={IMG.logo} alt="Bharadwaj's Cafe" className={authLogo} />
              <h1 className={authTitle}>Forgot Password?</h1>
              <p className={authSubtitle}>Enter your email to receive a password reset link</p>
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
                <label htmlFor="email" className={formLabel}>
                  <i className={`fa-solid fa-envelope ${formLabelIcon}`} aria-hidden="true"></i>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={formInput}
                  required
                />
              </div>

              <button type="submit" className={authBtn} disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className={authDivider}>
              <span className={authDividerLabel}>OR</span>
            </div>

            <div className={authRedirect}>
              <p className={authRedirectText}>
                Remember your password?{' '}
                <Link to="/login" className={redirectLink}>
                  Login here
                </Link>
              </p>
            </div>

            <div className={backHome}>
              <Link to="/" className={backLink}>
                <i className={`fa-solid fa-arrow-left ${backLinkIcon}`} aria-hidden="true"></i> Back
                to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { formGroup, formLabel, formLabelIcon, formInput } from '../styles/forms';
import { IMG } from '../assets/cloudinary';
// Aliased: this component already has a `successMessage` state holding the
// text, and an unaliased import is shadowed by it inside the component --
// which silently made the banner's className the message string.
import { errorMessage, successMessage as successBanner } from '../styles/messages';
import {
  authPage,
  authContainer,
  authLeft,
  authImage,
  authOverlay,
  authOverlayTitle,
  authOverlayText,
  authRight,
  authFormContainer,
  authHeader,
  authLogo,
  authTitle,
  authSubtitle,
  authForm,
  authBtn,
  formFooter,
  forgotLink,
  authDivider,
  authDividerLabel,
  authRedirect,
  authRedirectText,
  redirectLink,
  backHome,
  backLink,
  backLinkIcon,
  resendLink,
} from '../styles/auth';

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
  const [needsVerification, setNeedsVerification] = useState(false);
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
    setNeedsVerification(false);
    setLoading(true);

    try {
      const response = await api.login(formData);
      login(response);
      navigate('/home');
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        // Distinct from bad credentials: the password was right, the account
        // just has not been confirmed yet.
        setNeedsVerification(true);
        setError(err.message);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const response = await api.resendVerification(formData.email);
      setNeedsVerification(false);
      setError('');
      setSuccessMessage(response.message);
    } catch (err) {
      setError(err.message || 'Could not resend the verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={authPage} id="main-content">
      <div className={authContainer}>
        <div className={authLeft}>
          <img src={IMG.coffeeHeroSection} alt="Coffee" className={authImage} />
          <div className={authOverlay}>
            <h2 className={authOverlayTitle}>Welcome Back!</h2>
            <p className={authOverlayText}>Login to explore our amazing coffee collection</p>
          </div>
        </div>

        <div className={authRight}>
          <div className={authFormContainer}>
            <div className={authHeader}>
              <img src={IMG.logo} alt="Bharadwaj's Cafe" className={authLogo} />
              <h1 className={authTitle}>Login to Your Account</h1>
              <p className={authSubtitle}>Enter your credentials to continue</p>
            </div>

            {successMessage && (
              <div className={successBanner}>
                <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
                {successMessage}
              </div>
            )}

            {error && (
              <div className={errorMessage}>
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                {error}
                {needsVerification && (
                  <button
                    type="button"
                    className={resendLink}
                    onClick={handleResendVerification}
                    disabled={loading}
                  >
                    Resend verification email
                  </button>
                )}
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
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className={formInput}
                  required
                />
              </div>

              <div className={formGroup}>
                <label htmlFor="password" className={formLabel}>
                  <i className={`fa-solid fa-lock ${formLabelIcon}`} aria-hidden="true"></i>
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className={formInput}
                  required
                />
              </div>

              <div className={formFooter}>
                <Link to="/forgot-password" className={forgotLink}>
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" className={authBtn} disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className={authDivider}>
              <span className={authDividerLabel}>OR</span>
            </div>

            <GoogleSignInButton
              onSuccess={(session) => {
                login(session);
                navigate('/home');
              }}
              onError={(message) => {
                setNeedsVerification(false);
                setError(message);
              }}
            />

            <div className={authRedirect}>
              <p className={authRedirectText}>
                New user?{' '}
                <Link to="/register" className={redirectLink}>
                  Register here
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

export default Login;

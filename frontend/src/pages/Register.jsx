import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { formGroup, formLabel, formLabelIcon, formInput } from '../styles/forms';
import { IMG } from '../assets/cloudinary';
import { errorMessage, fieldError, successMessage } from '../styles/messages';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error for this field when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await api.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      // Show success message
      setSuccess(true);

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Registration successful! Please login to continue.',
            email: formData.email,
          },
        });
      }, 2000);
    } catch (err) {
      setErrors({
        general: err.message || 'Registration failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" id="main-content">
      <div className="auth-container">
        <div className="auth-left">
          <img src={IMG.coffeeHeroSection} alt="Coffee" className="auth-image" />
          <div className="auth-overlay">
            <h2>Join Our Community!</h2>
            <p>Create an account to start your coffee journey</p>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-container">
            <div className="auth-header">
              <img src={IMG.logo} alt="Bharadwaj's Cafe" className="auth-logo" />
              <h1>Create New Account</h1>
              <p>Fill in the details to get started</p>
            </div>

            {errors.general && (
              <div className={errorMessage}>
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                {errors.general}
              </div>
            )}

            {success && (
              <div className={successMessage}>
                <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
                Successfully registered! Redirecting to login page...
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className={formGroup}>
                <label htmlFor="name" className={formLabel}>
                  <i className={`fa-solid fa-user ${formLabelIcon}`} aria-hidden="true"></i>
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  className={formInput}
                  required
                />
                {errors.name && <span className={fieldError}>{errors.name}</span>}
              </div>

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
                {errors.email && <span className={fieldError}>{errors.email}</span>}
              </div>

              <div className={formGroup}>
                <label htmlFor="password" className={formLabel}>
                  <i className={`fa-solid fa-lock ${formLabelIcon}`} aria-hidden="true"></i>
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Create a password (min. 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  className={formInput}
                  required
                />
                {errors.password && <span className={fieldError}>{errors.password}</span>}
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
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={formInput}
                  required
                />
                {errors.confirmPassword && (
                  <span className={fieldError}>{errors.confirmPassword}</span>
                )}
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Creating Account...' : 'Register'}
              </button>
            </form>

            <div className="auth-divider">
              <span>OR</span>
            </div>

            {/* Signing up with Google needs no email confirmation step, so it
                lands straight on /home rather than bouncing through /login. */}
            <GoogleSignInButton
              text="signup_with"
              onSuccess={(session) => {
                login(session);
                navigate('/home');
              }}
              onError={(message) => setErrors({ general: message })}
            />

            <div className="auth-redirect">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="redirect-link">
                  Login here
                </Link>
              </p>
            </div>

            <div className="back-home">
              <Link to="/" className="back-link">
                <i className="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

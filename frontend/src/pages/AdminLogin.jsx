import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formGroup, formLabel, formLabelIcon, formInput } from '../styles/forms';
import { IMG } from '../assets/cloudinary';

/**
 * Staff sign-in, separate from the customer form.
 *
 * The endpoint is the same one customers use -- there is no separate staff
 * credential store -- so this checks the role that comes back and refuses to
 * continue if it is not an admin, rather than dropping a customer into a
 * console they cannot use. The API would reject their requests anyway; this
 * just says so up front instead of rendering a dashboard full of errors.
 */
const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(formData);

      if (response.role !== 'admin') {
        // Do not keep the session: they signed in at the staff door.
        logout();
        setError('That account is not a staff account. Use the customer login instead.');
        return;
      }

      login(response);
      navigate('/admin');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-5 py-10">
      <div className="w-full max-w-[440px] rounded-[16px] bg-white p-10 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-8 text-center">
          {/* On a maroon chip: the logo is cream lettering drawn for dark
              backgrounds and all but disappears against the white card. */}
          <span className="mx-auto mb-4 inline-flex items-center justify-center rounded-[14px] bg-primary px-5 py-3">
            <img src={IMG.logo} alt="Bharadwaj's Cafe" className="h-[48px] w-auto" />
          </span>
          <span className="inline-block rounded-s bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-secondary">
            Staff Access
          </span>
          <h1 className="mb-2 mt-4 text-xl text-primary">Admin Console</h1>
          <p className="text-s text-[#666]">Sign in with your staff account</p>
        </div>

        {error && (
          <div className="error-message">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={formGroup}>
            <label htmlFor="email" className={formLabel}>
              <i className={`fa-solid fa-envelope ${formLabelIcon}`} aria-hidden="true"></i>
              Staff Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your staff email"
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

          <button
            type="submit"
            className="w-full cursor-pointer rounded-s border-none bg-primary px-6 py-3 text-n font-bold text-white transition-all duration-300 hover:bg-[#54202a] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in to console'}
          </button>
        </form>

        <div className="mt-8 border-x-0 border-b-0 border-t border-solid border-[#eee] pt-5 text-center text-s">
          <p className="text-[#666]">
            Not staff?{' '}
            <Link to="/login" className="font-semibold text-primary">
              Customer login
            </Link>
          </p>
          <Link to="/" className="mt-2 inline-block text-[#999]">
            <i className="fa-solid fa-arrow-left mr-2" aria-hidden="true"></i>Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

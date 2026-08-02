import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import NotificationToggle from '../components/NotificationToggle';

/*
 * Migrated from profile.css.
 *
 * Two notes carried over from that file, and one new one:
 *
 * - `.form-actions` was declared bare in profile.css, address.css and
 *   reviews.css at once, so the gap and the top margin were decided by import
 *   order rather than by this page. The other two files are gone, so the 15px
 *   this page always asked for is finally what it gets.
 *
 * - `.tab-btn` was declared bare here too, and the admin dashboard's tabs were
 *   quietly picking up four of its declarations. Those now live in
 *   styles/admin.js; nothing outside this page depends on these any more.
 *
 * - The mobile top padding was 90px, left over from clearing the fixed header
 *   that the navigation rebuild removed. Every other page came down to 40px at
 *   that time and this one was missed, so it opened with 90px of empty pink.
 *   It matches the rest now.
 *
 * Where a base and a state set the same property they are separate strings, not
 * concatenated: Tailwind resolves two utilities for one property by emission
 * order, not by the order they appear in a className.
 */

const page = 'min-h-screen bg-light-pink pb-[50px] pt-10 to-900:pb-[30px]';
const container = 'mx-auto max-w-[900px]';

const profileHeader =
  'mb-[30px] flex items-center gap-[30px] rounded-[15px] bg-white p-10 shadow-[0_5px_15px_rgba(0,0,0,0.1)] to-900:flex-col to-900:px-5 to-900:py-[30px] to-900:text-center';

const avatar =
  'flex h-[120px] w-[120px] items-center justify-center rounded-circle bg-light-pink text-[80px] text-secondary to-900:h-[100px] to-900:w-[100px] to-900:text-[60px]';

const profileName = 'mb-2 text-xxl font-bold text-primary to-900:text-xl';
const profileEmail = 'mb-2.5 text-m text-[#666]';
const userRole =
  'inline-block rounded-[20px] bg-secondary px-[15px] py-[5px] text-s font-semibold capitalize text-primary';

const tabs = 'mb-[30px] flex flex-wrap gap-[15px] to-900:flex-col';

const tabBox =
  'flex min-w-[200px] flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border-2 border-solid px-[25px] py-[15px] text-m font-medium transition-all duration-300 to-900:min-w-0';

const tabIdle = `${tabBox} border-transparent bg-white text-dark hover:border-secondary hover:bg-light-pink`;
const tabActive = `${tabBox} border-primary bg-primary text-white`;
const tabIcon = 'text-l';

const messageBox = 'mb-[25px] flex items-center gap-3 rounded-[10px] px-5 py-[15px] text-n';
const messageSuccess = `${messageBox} border border-solid border-[#c3e6cb] bg-[#d4edda] text-[#155724]`;
const messageError = `${messageBox} border border-solid border-[#f5c6cb] bg-[#f8d7da] text-[#721c24]`;

const content =
  'rounded-[15px] bg-white p-10 shadow-[0_5px_15px_rgba(0,0,0,0.1)] to-900:px-5 to-900:py-[25px]';

/* A single bottom rule; the three zeroed sides are what stop `border-solid`
   drawing a full box while Preflight is off. */
const sectionHeader =
  'mb-[30px] flex items-center justify-between border-x-0 border-t-0 border-b-2 border-solid border-light-pink pb-5 to-900:flex-col to-900:items-start to-900:gap-[15px]';

const sectionTitle = 'text-xl font-bold text-primary';
const sectionDescription = 'mb-[30px] text-n text-[#666]';

const editBtn =
  'flex cursor-pointer items-center gap-2 rounded-m border-none bg-secondary px-5 py-2.5 text-n font-semibold text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-[0_5px_15px_rgba(59,20,28,0.3)] to-900:w-full to-900:justify-center';

const detailsView = 'grid gap-[25px]';
const detailItem = 'flex flex-col gap-2';
const detailLabel = 'text-s font-semibold uppercase tracking-[0.5px] text-[#666]';
const detailValue = 'text-m font-medium text-dark';

/* The edit form and the password form were two identical rule blocks. */
const fieldGroup = 'mb-[25px]';
const fieldLabel = 'mb-2 flex items-center gap-2 text-n font-semibold text-dark';
const fieldLabelIcon = 'text-secondary';
const fieldInput =
  'w-full rounded-s border-2 border-solid border-[#e0e0e0] bg-[#fafafa] px-[15px] py-3 text-n transition-all duration-300 focus:border-secondary focus:bg-white focus:shadow-[0_0_0_3px_rgba(243,150,28,0.1)] focus:outline-none';

const formActions = 'mt-5 flex gap-[15px] to-900:flex-col';

const saveBtn =
  'flex-1 cursor-pointer rounded-m border-none bg-primary px-[30px] py-[14px] text-m font-bold text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 enabled:hover:-translate-y-0.5 enabled:hover:bg-secondary enabled:hover:text-primary enabled:hover:shadow-[0_5px_15px_rgba(243,150,28,0.3)]';

const cancelBtn =
  'flex-1 cursor-pointer rounded-m border-2 border-solid border-medium-gray bg-transparent px-[30px] py-[14px] text-m font-bold text-dark transition-all duration-300 hover:border-primary hover:bg-light-pink';

const warningBox =
  'mb-[30px] flex items-start gap-[15px] rounded-[10px] border-2 border-solid border-[#ffc107] bg-[#fff3cd] p-5 to-900:flex-col';

const warningIcon = 'shrink-0 text-[2rem] text-[#ff9800]';
const warningTitle = 'mb-2 text-l font-bold text-[#856404]';
const warningText = 'text-n leading-[1.6] text-[#856404]';

const deleteInfo = 'mb-[30px] rounded-[10px] bg-light-pink p-[25px]';
const deleteInfoTitle = 'mb-[15px] text-m font-bold text-primary';
const deleteInfoItem = 'mb-2.5 flex items-center gap-2.5 text-n text-dark';
const deleteInfoIcon = 'text-secondary';

const deleteBtn =
  'flex cursor-pointer items-center gap-2.5 rounded-m border-none bg-[#dc3545] px-[30px] py-[14px] text-m font-bold text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 enabled:hover:-translate-y-0.5 enabled:hover:bg-[#c82333] enabled:hover:shadow-[0_5px_15px_rgba(220,53,69,0.4)] to-900:w-full to-900:justify-center';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = user?.token;
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required' });
        return;
      }

      const response = await api.updateProfile(formData, token);

      // Update user info in localStorage
      const updatedUser = {
        ...response,
        token: response.token || token,
      };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);

      // Reload page to reflect changes
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = user?.token;
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required' });
        return;
      }

      await api.changePassword(
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        token
      );

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );

    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      'This will permanently delete all your data. Are you absolutely sure?'
    );

    if (!doubleConfirmed) return;

    setLoading(true);
    try {
      const token = user?.token;
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required' });
        setLoading(false);
        return;
      }

      await api.deleteAccount(token);
      logout();
      navigate('/');
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete account' });
      setLoading(false);
    }
  };

  return (
    <div className={page} id="main-content">
      <div className={`${container} section-content`}>
        <NotificationToggle />
        <div className={profileHeader}>
          <div className={avatar}>
            <i className="fa-solid fa-user-circle" aria-hidden="true"></i>
          </div>
          <div>
            <h1 className={profileName}>{user?.name}</h1>
            <p className={profileEmail}>{user?.email}</p>
            <span className={userRole}>{user?.role || 'Customer'}</span>
          </div>
        </div>

        <div className={tabs}>
          <button
            className={activeTab === 'details' ? tabActive : tabIdle}
            onClick={() => setActiveTab('details')}
          >
            <i className={`fa-solid fa-user ${tabIcon}`} aria-hidden="true"></i> Profile Details
          </button>
          <button
            className={activeTab === 'password' ? tabActive : tabIdle}
            onClick={() => setActiveTab('password')}
          >
            <i className={`fa-solid fa-lock ${tabIcon}`} aria-hidden="true"></i> Change Password
          </button>
          <button
            className={activeTab === 'delete' ? tabActive : tabIdle}
            onClick={() => setActiveTab('delete')}
          >
            <i className={`fa-solid fa-trash ${tabIcon}`} aria-hidden="true"></i> Delete Account
          </button>
        </div>

        {message.text && (
          <div className={message.type === 'success' ? messageSuccess : messageError}>
            <i
              className={`fa-solid fa-circle-${message.type === 'success' ? 'check' : 'exclamation'}`}
            ></i>
            {message.text}
          </div>
        )}

        <div className={content}>
          {activeTab === 'details' && (
            <div>
              <div className={sectionHeader}>
                <h2 className={sectionTitle}>Profile Information</h2>
                {!isEditing && (
                  <button className={editBtn} onClick={() => setIsEditing(true)}>
                    <i className="fa-solid fa-edit" aria-hidden="true"></i> Edit Profile
                  </button>
                )}
              </div>

              {!isEditing ? (
                <div className={detailsView}>
                  <div className={detailItem}>
                    <label className={detailLabel}>Full Name</label>
                    <p className={detailValue}>{user?.name}</p>
                  </div>
                  <div className={detailItem}>
                    <label className={detailLabel}>Email Address</label>
                    <p className={detailValue}>{user?.email}</p>
                  </div>
                  <div className={detailItem}>
                    <label className={detailLabel}>Account Type</label>
                    <p className={`${detailValue} capitalize`}>{user?.role || 'Customer'}</p>
                  </div>
                  <div className={detailItem}>
                    <label className={detailLabel}>Member Since</label>
                    <p className={detailValue}>
                      {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile}>
                  <div className={fieldGroup}>
                    <label htmlFor="name" className={fieldLabel}>
                      <i className={`fa-solid fa-user ${fieldLabelIcon}`} aria-hidden="true"></i>{' '}
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className={fieldInput}
                    />
                  </div>

                  <div className={fieldGroup}>
                    <label htmlFor="email" className={fieldLabel}>
                      <i
                        className={`fa-solid fa-envelope ${fieldLabelIcon}`}
                        aria-hidden="true"
                      ></i>{' '}
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={fieldInput}
                    />
                  </div>

                  <div className={formActions}>
                    <button type="submit" className={saveBtn} disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className={cancelBtn}
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({ name: user?.name || '', email: user?.email || '' });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'password' && (
            <div>
              <h2 className={`${sectionTitle} mb-2.5`}>Change Password</h2>
              <p className={sectionDescription}>
                Ensure your account is using a strong password to stay secure.
              </p>

              <form onSubmit={handleChangePassword}>
                <div className={fieldGroup}>
                  <label htmlFor="currentPassword" className={fieldLabel}>
                    <i className={`fa-solid fa-lock ${fieldLabelIcon}`} aria-hidden="true"></i>{' '}
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    className={fieldInput}
                  />
                </div>

                <div className={fieldGroup}>
                  <label htmlFor="newPassword" className={fieldLabel}>
                    <i className={`fa-solid fa-key ${fieldLabelIcon}`} aria-hidden="true"></i> New
                    Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    minLength="6"
                    required
                    className={fieldInput}
                  />
                </div>

                <div className={fieldGroup}>
                  <label htmlFor="confirmPassword" className={fieldLabel}>
                    <i
                      className={`fa-solid fa-check-circle ${fieldLabelIcon}`}
                      aria-hidden="true"
                    ></i>{' '}
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    minLength="6"
                    required
                    className={fieldInput}
                  />
                </div>

                <button type="submit" className={saveBtn} disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'delete' && (
            <div>
              <h2 className={`${sectionTitle} mb-[25px]`}>Delete Account</h2>
              <div className={warningBox}>
                <i
                  className={`fa-solid fa-triangle-exclamation ${warningIcon}`}
                  aria-hidden="true"
                ></i>
                <div>
                  <h3 className={warningTitle}>Warning: This action is permanent!</h3>
                  <p className={warningText}>
                    Once you delete your account, there is no going back. All your data, including
                    order history and saved preferences, will be permanently deleted.
                  </p>
                </div>
              </div>

              <div className={deleteInfo}>
                <h4 className={deleteInfoTitle}>What will be deleted:</h4>
                <ul className="list-none p-0">
                  <li className={deleteInfoItem}>
                    <i className={`fa-solid fa-check ${deleteInfoIcon}`} aria-hidden="true"></i>{' '}
                    Your profile information
                  </li>
                  <li className={deleteInfoItem}>
                    <i className={`fa-solid fa-check ${deleteInfoIcon}`} aria-hidden="true"></i>{' '}
                    Order history
                  </li>
                  <li className={deleteInfoItem}>
                    <i className={`fa-solid fa-check ${deleteInfoIcon}`} aria-hidden="true"></i>{' '}
                    Saved preferences
                  </li>
                  <li className={deleteInfoItem}>
                    <i className={`fa-solid fa-check ${deleteInfoIcon}`} aria-hidden="true"></i> All
                    personal data
                  </li>
                </ul>
              </div>

              <button className={deleteBtn} onClick={handleDeleteAccount} disabled={loading}>
                <i className="fa-solid fa-trash" aria-hidden="true"></i>
                {loading ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

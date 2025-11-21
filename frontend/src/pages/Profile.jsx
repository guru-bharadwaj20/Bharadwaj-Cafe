import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

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
        token: response.token || token
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

      await api.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, token);
      
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
    <div className="profile-page">
      <div className="profile-container section-content">
        <div className="profile-header">
          <div className="profile-avatar">
            <i className="fa-solid fa-user-circle"></i>
          </div>
          <div className="profile-info">
            <h1>{user?.name}</h1>
            <p>{user?.email}</p>
            <span className="user-role">{user?.role || 'Customer'}</span>
          </div>
        </div>

        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <i className="fa-solid fa-user"></i> Profile Details
          </button>
          <button
            className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <i className="fa-solid fa-lock"></i> Change Password
          </button>
          <button
            className={`tab-btn ${activeTab === 'delete' ? 'active' : ''}`}
            onClick={() => setActiveTab('delete')}
          >
            <i className="fa-solid fa-trash"></i> Delete Account
          </button>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            <i className={`fa-solid fa-circle-${message.type === 'success' ? 'check' : 'exclamation'}`}></i>
            {message.text}
          </div>
        )}

        <div className="profile-content">
          {activeTab === 'details' && (
            <div className="profile-details">
              <div className="section-header">
                <h2>Profile Information</h2>
                {!isEditing && (
                  <button className="edit-btn" onClick={() => setIsEditing(true)}>
                    <i className="fa-solid fa-edit"></i> Edit Profile
                  </button>
                )}
              </div>

              {!isEditing ? (
                <div className="details-view">
                  <div className="detail-item">
                    <label>Full Name</label>
                    <p>{user?.name}</p>
                  </div>
                  <div className="detail-item">
                    <label>Email Address</label>
                    <p>{user?.email}</p>
                  </div>
                  <div className="detail-item">
                    <label>Account Type</label>
                    <p className="capitalize">{user?.role || 'Customer'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Member Since</label>
                    <p>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="edit-form">
                  <div className="form-group">
                    <label htmlFor="name">
                      <i className="fa-solid fa-user"></i> Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">
                      <i className="fa-solid fa-envelope"></i> Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="save-btn" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className="cancel-btn"
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
            <div className="password-section">
              <h2>Change Password</h2>
              <p className="section-description">
                Ensure your account is using a strong password to stay secure.
              </p>

              <form onSubmit={handleChangePassword} className="password-form">
                <div className="form-group">
                  <label htmlFor="currentPassword">
                    <i className="fa-solid fa-lock"></i> Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">
                    <i className="fa-solid fa-key"></i> New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    minLength="6"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    <i className="fa-solid fa-check-circle"></i> Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    minLength="6"
                    required
                  />
                </div>

                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'delete' && (
            <div className="delete-section">
              <h2>Delete Account</h2>
              <div className="warning-box">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <div>
                  <h3>Warning: This action is permanent!</h3>
                  <p>
                    Once you delete your account, there is no going back. All your data,
                    including order history and saved preferences, will be permanently deleted.
                  </p>
                </div>
              </div>

              <div className="delete-info">
                <h4>What will be deleted:</h4>
                <ul>
                  <li><i className="fa-solid fa-check"></i> Your profile information</li>
                  <li><i className="fa-solid fa-check"></i> Order history</li>
                  <li><i className="fa-solid fa-check"></i> Saved preferences</li>
                  <li><i className="fa-solid fa-check"></i> All personal data</li>
                </ul>
              </div>

              <button
                className="delete-btn"
                onClick={handleDeleteAccount}
                disabled={loading}
              >
                <i className="fa-solid fa-trash"></i>
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

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const AddressManagement = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    label: 'Home',
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    isDefault: false
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const data = await api.getAddresses(user?.token);
      setAddresses(data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await api.updateAddress(editingAddress._id, formData, user?.token);
      } else {
        await api.createAddress(formData, user?.token);
      }
      
      resetForm();
      fetchAddresses();
      alert(editingAddress ? 'Address updated!' : 'Address added!');
    } catch (error) {
      alert('Failed to save address');
    }
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setFormData(address);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await api.deleteAddress(id, user?.token);
      fetchAddresses();
    } catch (error) {
      alert('Failed to delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.setDefaultAddress(id, user?.token);
      fetchAddresses();
    } catch (error) {
      alert('Failed to set default address');
    }
  };

  const resetForm = () => {
    setFormData({
      label: 'Home',
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
      isDefault: false
    });
    setEditingAddress(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="address-management">
      <div className="address-header">
        <h2>My Addresses</h2>
        {!showForm && (
          <button className="btn-add-address" onClick={() => setShowForm(true)}>
            <i className="fas fa-plus"></i> Add New Address
          </button>
        )}
      </div>

      {showForm && (
        <div className="address-form-container">
          <h3>{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
          <form onSubmit={handleSubmit} className="address-form">
            <div className="form-row">
              <div className="form-group">
                <label>Label *</label>
                <select name="label" value={formData.label} onChange={handleChange} required>
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Pincode *</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address Line 1 *</label>
              <input
                type="text"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                placeholder="House no., Building name"
                required
              />
            </div>

            <div className="form-group">
              <label>Address Line 2</label>
              <input
                type="text"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                placeholder="Road name, Area, Colony"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>State *</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Landmark</label>
              <input
                type="text"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
                placeholder="Nearby landmark (optional)"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleChange}
                />
                Set as default address
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save">
                {editingAddress ? 'Update' : 'Save'} Address
              </button>
              <button type="button" className="btn-cancel" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="addresses-list">
        {addresses.length === 0 ? (
          <p className="no-addresses">No saved addresses yet.</p>
        ) : (
          addresses.map(address => (
            <div key={address._id} className={`address-card ${address.isDefault ? 'default' : ''}`}>
              {address.isDefault && <span className="default-badge">Default</span>}
              
              <div className="address-label">
                <i className={`fas fa-${address.label === 'Home' ? 'home' : address.label === 'Work' ? 'briefcase' : 'map-marker-alt'}`}></i>
                {address.label}
              </div>

              <h4>{address.fullName}</h4>
              <p>{address.addressLine1}</p>
              {address.addressLine2 && <p>{address.addressLine2}</p>}
              <p>{address.city}, {address.state} - {address.pincode}</p>
              {address.landmark && <p className="landmark">Landmark: {address.landmark}</p>}
              <p className="phone">Phone: {address.phone}</p>

              <div className="address-actions">
                {!address.isDefault && (
                  <button onClick={() => handleSetDefault(address._id)}>
                    <i className="fas fa-check"></i> Set as Default
                  </button>
                )}
                <button onClick={() => handleEdit(address)}>
                  <i className="fas fa-edit"></i> Edit
                </button>
                <button onClick={() => handleDelete(address._id)}>
                  <i className="fas fa-trash"></i> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AddressManagement;

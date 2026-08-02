import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';

/**
 * Saved delivery addresses.
 *
 * Migrated from address.css, with three deliberate departures from what the
 * page used to render. Each is a fix, and each is why the diff for this route
 * is not 0.00%:
 *
 * 1. The page had no top offset and no background. The site header is fixed
 *    and 90px tall, so "My Addresses" and the "Add New Address" button sat
 *    underneath it -- the heading was also white text on the default white
 *    page, and the button could not be clicked at all. It now clears the
 *    header and takes the same dark page treatment as the wishlist and
 *    loyalty routes.
 *
 * 2. The three card actions were coloured by `button:nth-child()`. On the
 *    default address the "Set as Default" button is not rendered, so every
 *    button shifted one position and Delete came out blue instead of red.
 *    The colour now belongs to the action.
 *
 * 3. `.btn-cancel` and `.form-actions` were declared bare here *and* in
 *    reviews.css, which is imported later and therefore won -- so Cancel took
 *    its padding and radius from a stylesheet whose component
 *    (components/Reviews.jsx) is never mounted. The values below are what the
 *    browser actually resolved to, so Cancel does not move.
 */

const label = 'mb-[5px] block cursor-pointer text-n font-medium text-white';

const field =
  'w-full rounded-[5px] border border-solid border-[#3a3a3a] bg-[#1a1a1a] p-2.5 text-n text-white focus:border-secondary focus:outline-none';

const group = 'mb-[15px]';
const row = `grid grid-cols-2 gap-[15px] ${group} max-[768px]:grid-cols-1`;

const amberLift =
  'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(243,150,28,0.3)]';

// Cancel keeps reviews.css's 10px/25px box and 5px radius, which is what it
// has always rendered, alongside the bold weight address.css gave it.
const cancelButton =
  'cursor-pointer rounded-[5px] border-none bg-[#666] px-[25px] py-2.5 font-bold text-white transition-all duration-300 hover:bg-[#555]';

const saveButton = `cursor-pointer rounded-s border-none bg-secondary px-[30px] py-3 font-bold text-black ${amberLift}`;

const cardAction =
  'flex flex-1 cursor-pointer items-center justify-center gap-[5px] rounded-[5px] border-none p-2 text-[12px] text-white transition-all duration-300 hover:-translate-y-0.5';

const AddressManagement = () => {
  const { toast } = useToast();
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
    isDefault: false,
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
      toast.success(editingAddress ? 'Address updated!' : 'Address added!');
    } catch {
      toast.error('Failed to save address');
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
    } catch {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.setDefaultAddress(id, user?.token);
      fetchAddresses();
    } catch {
      toast.error('Failed to set default address');
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
      isDefault: false,
    });
    setEditingAddress(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="min-h-screen bg-dark pb-[50px] pt-10" id="main-content">
      <div className="mx-auto max-w-[1000px] px-5">
        <div className="mb-[30px] flex items-center justify-between">
          <h2 className="text-xl text-white">My Addresses</h2>
          {!showForm && (
            <button
              className={`flex cursor-pointer items-center gap-2 rounded-s border-none bg-secondary px-6 py-3 font-bold text-black ${amberLift}`}
              onClick={() => setShowForm(true)}
            >
              <i className="fas fa-plus" aria-hidden="true"></i> Add New Address
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-[30px] rounded-[12px] bg-[#2a2a2a] p-[30px]">
            <h3 className="mb-5 text-secondary">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className={row}>
                <div className={group}>
                  <label className={label}>Label *</label>
                  <select
                    name="label"
                    value={formData.label}
                    onChange={handleChange}
                    className={field}
                    required
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className={group}>
                  <label className={label}>Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={field}
                    required
                  />
                </div>
              </div>

              <div className={row}>
                <div className={group}>
                  <label className={label}>Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={field}
                    required
                  />
                </div>
                <div className={group}>
                  <label className={label}>Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    className={field}
                    required
                  />
                </div>
              </div>

              <div className={group}>
                <label className={label}>Address Line 1 *</label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  placeholder="House no., Building name"
                  className={field}
                  required
                />
              </div>

              <div className={group}>
                <label className={label}>Address Line 2</label>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  placeholder="Road name, Area, Colony"
                  className={field}
                />
              </div>

              <div className={row}>
                <div className={group}>
                  <label className={label}>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={field}
                    required
                  />
                </div>
                <div className={group}>
                  <label className={label}>State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className={field}
                    required
                  />
                </div>
              </div>

              <div className={group}>
                <label className={label}>Landmark</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  placeholder="Nearby landmark (optional)"
                  className={field}
                />
              </div>

              <div className={group}>
                {/* Not a flex row: `.address-form label` outranked
                    `.checkbox-label`, so this has always rendered as a block
                    with the box butted against the text. */}
                <label className={label}>
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleChange}
                    className="h-[18px] w-[18px]"
                  />
                  Set as default address
                </label>
              </div>

              <div className="mt-5 flex gap-2.5">
                <button type="submit" className={saveButton}>
                  {editingAddress ? 'Update' : 'Save'} Address
                </button>
                <button type="button" className={cancelButton} onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 max-[768px]:grid-cols-1">
          {addresses.length === 0 ? (
            <p className="p-10 text-center text-[#999]">No saved addresses yet.</p>
          ) : (
            addresses.map((address) => (
              <div
                key={address._id}
                className={`relative rounded-[12px] border-2 border-solid bg-[#2a2a2a] p-5 transition-all duration-300 hover:border-secondary ${
                  address.isDefault ? 'border-secondary' : 'border-transparent'
                }`}
              >
                {address.isDefault && (
                  <span className="absolute right-2.5 top-2.5 rounded-[12px] bg-secondary px-2.5 py-1 text-[12px] font-bold text-black">
                    Default
                  </span>
                )}

                <div className="mb-2.5 flex items-center gap-2 text-m font-bold text-secondary">
                  <i
                    className={`fas fa-${address.label === 'Home' ? 'home' : address.label === 'Work' ? 'briefcase' : 'map-marker-alt'}`}
                  ></i>
                  {address.label}
                </div>

                <h4 className="mb-2 text-white">{address.fullName}</h4>
                <p className="my-[5px] text-s text-[#ccc]">{address.addressLine1}</p>
                {address.addressLine2 && (
                  <p className="my-[5px] text-s text-[#ccc]">{address.addressLine2}</p>
                )}
                <p className="my-[5px] text-s text-[#ccc]">
                  {address.city}, {address.state} - {address.pincode}
                </p>
                {address.landmark && (
                  <p className="my-[5px] text-s italic text-[#999]">Landmark: {address.landmark}</p>
                )}
                <p className="my-[5px] text-s font-bold text-secondary">Phone: {address.phone}</p>

                <div className="mt-[15px] flex gap-2.5">
                  {!address.isDefault && (
                    <button
                      className={`${cardAction} bg-[#4caf50]`}
                      onClick={() => handleSetDefault(address._id)}
                    >
                      <i className="fas fa-check" aria-hidden="true"></i> Set as Default
                    </button>
                  )}
                  <button
                    className={`${cardAction} bg-[#2196f3]`}
                    onClick={() => handleEdit(address)}
                  >
                    <i className="fas fa-edit" aria-hidden="true"></i> Edit
                  </button>
                  <button
                    className={`${cardAction} bg-[#f44336]`}
                    onClick={() => handleDelete(address._id)}
                  >
                    <i className="fas fa-trash" aria-hidden="true"></i> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AddressManagement;

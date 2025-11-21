const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = {
  // Menu APIs
  getMenu: async () => {
    const response = await fetch(`${API_URL}/menu`);
    if (!response.ok) throw new Error('Failed to fetch menu');
    return response.json();
  },

  // Order APIs
  createOrder: async (orderData) => {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to create order');
    return response.json();
  },

  getOrderById: async (orderId) => {
    const response = await fetch(`${API_URL}/orders/${orderId}`);
    if (!response.ok) throw new Error('Failed to fetch order');
    return response.json();
  },

  getOrdersByEmail: async (email) => {
    const response = await fetch(`${API_URL}/orders/customer/${email}`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  },

  // Contact API
  submitContact: async (contactData) => {
    const response = await fetch(`${API_URL}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });
    if (!response.ok) throw new Error('Failed to submit contact form');
    return response.json();
  },

  // Auth APIs
  register: async (userData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to register');
    }
    return response.json();
  },

  login: async (credentials) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to login');
    }
    return response.json();
  },

  getProfile: async (token) => {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },

  updateProfile: async (userData, token) => {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }
    return response.json();
  },

  changePassword: async (passwordData, token) => {
    const response = await fetch(`${API_URL}/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to change password');
    }
    return response.json();
  },

  deleteAccount: async (token) => {
    const response = await fetch(`${API_URL}/auth/account`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete account');
    }
    return response.json();
  },

  // Admin APIs
  getAdminStats: async (token) => {
    const response = await fetch(`${API_URL}/admin/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch admin stats');
    return response.json();
  },

  getAllUsers: async (token) => {
    const response = await fetch(`${API_URL}/admin/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  deleteUser: async (userId, token) => {
    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },

  getAllOrders: async (token) => {
    const response = await fetch(`${API_URL}/admin/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  },

  updateOrderStatus: async (orderId, status, token) => {
    const response = await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Failed to update order status');
    return response.json();
  },

  deleteMenuItem: async (itemId, token) => {
    const response = await fetch(`${API_URL}/admin/menu/${itemId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete menu item');
    return response.json();
  },

  // Order History APIs
  getMyOrders: async (token) => {
    const response = await fetch(`${API_URL}/orders/myorders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch your orders');
    return response.json();
  },

  // Password Reset APIs
  forgotPassword: async (email) => {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send reset email');
    }
    return response.json();
  },

  resetPassword: async (token, password) => {
    const response = await fetch(`${API_URL}/auth/reset-password/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to reset password');
    }
    return response.json();
  },

  verifyEmail: async (token) => {
    const response = await fetch(`${API_URL}/auth/verify/${token}`, {
      method: 'GET',
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to verify email');
    }
    return response.json();
  },
};

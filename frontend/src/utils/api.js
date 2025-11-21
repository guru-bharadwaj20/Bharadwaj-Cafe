const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = {
  // Menu APIs
  getMenu: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.dietary && filters.dietary.length > 0) params.append('dietary', filters.dietary.join(','));
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    
    const url = params.toString() ? `${API_URL}/menu?${params}` : `${API_URL}/menu`;
    const response = await fetch(url);
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

  // Review APIs
  getMenuItemReviews: async (menuItemId) => {
    const response = await fetch(`${API_URL}/reviews/menu/${menuItemId}`);
    if (!response.ok) throw new Error('Failed to fetch reviews');
    return response.json();
  },

  createReview: async (reviewData, token) => {
    const response = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(reviewData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create review');
    }
    return response.json();
  },

  updateReview: async (reviewId, reviewData, token) => {
    const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(reviewData),
    });
    if (!response.ok) throw new Error('Failed to update review');
    return response.json();
  },

  deleteReview: async (reviewId, token) => {
    const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete review');
    return response.json();
  },

  markReviewHelpful: async (reviewId, token) => {
    const response = await fetch(`${API_URL}/reviews/${reviewId}/helpful`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to mark review as helpful');
    return response.json();
  },

  // Address APIs
  getAddresses: async (token) => {
    const response = await fetch(`${API_URL}/addresses`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch addresses');
    return response.json();
  },

  createAddress: async (addressData, token) => {
    const response = await fetch(`${API_URL}/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(addressData),
    });
    if (!response.ok) throw new Error('Failed to create address');
    return response.json();
  },

  updateAddress: async (addressId, addressData, token) => {
    const response = await fetch(`${API_URL}/addresses/${addressId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(addressData),
    });
    if (!response.ok) throw new Error('Failed to update address');
    return response.json();
  },

  deleteAddress: async (addressId, token) => {
    const response = await fetch(`${API_URL}/addresses/${addressId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete address');
    return response.json();
  },

  setDefaultAddress: async (addressId, token) => {
    const response = await fetch(`${API_URL}/addresses/${addressId}/default`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to set default address');
    return response.json();
  },

  // Wishlist APIs
  getWishlist: async (token) => {
    const response = await fetch(`${API_URL}/wishlist`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch wishlist');
    return response.json();
  },

  addToWishlist: async (menuItemId, token) => {
    const response = await fetch(`${API_URL}/wishlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ menuItemId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add to wishlist');
    }
    return response.json();
  },

  removeFromWishlist: async (itemId, token) => {
    const response = await fetch(`${API_URL}/wishlist/${itemId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to remove from wishlist');
    return response.json();
  },

  clearWishlist: async (token) => {
    const response = await fetch(`${API_URL}/wishlist`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to clear wishlist');
    return response.json();
  },

  // Loyalty APIs
  getLoyaltyInfo: async (token) => {
    const response = await fetch(`${API_URL}/loyalty`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch loyalty info');
    return response.json();
  },

  redeemPoints: async (pointsData, token) => {
    const response = await fetch(`${API_URL}/loyalty/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(pointsData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to redeem points');
    }
    return response.json();
  },

  getRewards: async (token) => {
    const response = await fetch(`${API_URL}/loyalty/rewards`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch rewards');
    return response.json();
  },

  // Blog APIs
  getBlogs: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/blogs?${params}`);
    if (!response.ok) throw new Error('Failed to fetch blogs');
    return response.json();
  },

  getBlogBySlug: async (slug) => {
    const response = await fetch(`${API_URL}/blogs/${slug}`);
    if (!response.ok) throw new Error('Failed to fetch blog');
    return response.json();
  },

  createBlog: async (blogData, token) => {
    const response = await fetch(`${API_URL}/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(blogData),
    });
    if (!response.ok) throw new Error('Failed to create blog');
    return response.json();
  },

  updateBlog: async (blogId, blogData, token) => {
    const response = await fetch(`${API_URL}/blogs/${blogId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(blogData),
    });
    if (!response.ok) throw new Error('Failed to update blog');
    return response.json();
  },

  deleteBlog: async (blogId, token) => {
    const response = await fetch(`${API_URL}/blogs/${blogId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete blog');
    return response.json();
  },

  likeBlog: async (blogId, token) => {
    const response = await fetch(`${API_URL}/blogs/${blogId}/like`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to like blog');
    return response.json();
  },

  // Chat APIs
  getUserChat: async (token) => {
    const response = await fetch(`${API_URL}/chat`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch chat');
    return response.json();
  },

  sendChatMessage: async (messageData, token) => {
    const response = await fetch(`${API_URL}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(messageData),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },

  getAllChats: async (token) => {
    const response = await fetch(`${API_URL}/chat/admin`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch chats');
    return response.json();
  },

  sendAdminMessage: async (chatId, messageData, token) => {
    const response = await fetch(`${API_URL}/chat/${chatId}/admin-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(messageData),
    });
    if (!response.ok) throw new Error('Failed to send admin message');
    return response.json();
  },
};

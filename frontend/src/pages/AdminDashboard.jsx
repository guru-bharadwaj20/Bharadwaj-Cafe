import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/home');
      return;
    }
    fetchDashboardStats();
  }, [user, navigate]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminStats(user?.token);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1><i className="fas fa-dashboard"></i> Admin Dashboard</h1>
        <p>Welcome back, {user?.name}!</p>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="fas fa-chart-line"></i> Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <i className="fas fa-shopping-bag"></i> Orders
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <i className="fas fa-users"></i> Users
        </button>
        <button
          className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          <i className="fas fa-utensils"></i> Menu
        </button>
      </div>

      {activeTab === 'overview' && stats && (
        <div className="overview-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon revenue">
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="stat-info">
                <h3>₹{stats.totalRevenue?.toLocaleString()}</h3>
                <p>Total Revenue</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon orders">
                <i className="fas fa-shopping-cart"></i>
              </div>
              <div className="stat-info">
                <h3>{stats.totalOrders}</h3>
                <p>Total Orders</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon users">
                <i className="fas fa-user"></i>
              </div>
              <div className="stat-info">
                <h3>{stats.totalUsers}</h3>
                <p>Total Users</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon menu">
                <i className="fas fa-coffee"></i>
              </div>
              <div className="stat-info">
                <h3>{stats.totalMenuItems}</h3>
                <p>Menu Items</p>
              </div>
            </div>
          </div>

          <div className="recent-orders">
            <h2>Recent Orders</h2>
            <div className="orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders?.map(order => (
                    <tr key={order._id}>
                      <td>#{order._id.slice(-6)}</td>
                      <td>{order.user?.name || order.customerName}</td>
                      <td>{order.items.length}</td>
                      <td>₹{order.totalAmount}</td>
                      <td>
                        <span className={`status-badge ${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && <OrdersManagement token={user?.token} />}
      {activeTab === 'users' && <UsersManagement token={user?.token} />}
      {activeTab === 'menu' && <MenuManagement token={user?.token} />}
    </div>
  );
};

// Orders Management Component
const OrdersManagement = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await api.getAllOrders(token);
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus, token);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    }
  };

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <div className="management-section">
      <h2><i className="fas fa-shopping-bag"></i> All Orders ({orders.length})</h2>
      <div className="orders-table">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order._id}>
                <td>#{order._id.slice(-6)}</td>
                <td>{order.user?.name || order.customerName}</td>
                <td>{order.customerEmail}</td>
                <td>{order.items.length}</td>
                <td>₹{order.totalAmount}</td>
                <td>{order.orderType}</td>
                <td>
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                    className={`status-select ${order.status}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn-view" onClick={() => alert(`Order Details: ${order._id}`)}>
                    <i className="fas fa-eye"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Users Management Component
const UsersManagement = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.getAllUsers(token);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.deleteUser(userId, token);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="management-section">
      <h2><i className="fas fa-users"></i> All Users ({users.length})</h2>
      <div className="orders-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Registered</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  {user.isVerified ? (
                    <span className="verified"><i className="fas fa-check-circle"></i> Yes</span>
                  ) : (
                    <span className="not-verified"><i className="fas fa-times-circle"></i> No</span>
                  )}
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  {user.role !== 'admin' && (
                    <button className="btn-delete" onClick={() => deleteUser(user._id)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Menu Management Component
const MenuManagement = ({ token }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const data = await api.getMenu();
      setMenuItems(data);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMenuItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;

    try {
      await api.deleteMenuItem(itemId, token);
      fetchMenu();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete menu item');
    }
  };

  if (loading) return <div className="loading">Loading menu...</div>;

  return (
    <div className="management-section">
      <div className="section-header">
        <h2><i className="fas fa-utensils"></i> Menu Items ({menuItems.length})</h2>
        <button className="btn-add">
          <i className="fas fa-plus"></i> Add New Item
        </button>
      </div>
      <div className="menu-grid">
        {menuItems.map(item => (
          <div key={item._id} className="menu-card">
            <img src={item.image} alt={item.name} />
            <div className="menu-card-content">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <div className="menu-card-footer">
                <span className="price">₹{item.price}</span>
                <div className="menu-actions">
                  <button className="btn-edit">
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="btn-delete" onClick={() => deleteMenuItem(item._id)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;

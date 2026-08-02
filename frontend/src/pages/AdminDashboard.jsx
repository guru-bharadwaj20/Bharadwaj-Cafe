import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { resolveImage } from '../assets/cloudinary';
import { loadingContainer, spinner } from '../styles/feedback';
import {
  adminPage,
  adminHeader,
  adminHeaderTitle,
  adminHeaderText,
  adminTabs,
  adminTabIdle,
  adminTabActive,
  adminTabIcon,
  statsGrid,
  statCard,
  statIcon,
  statValue,
  statLabel,
  adminSection,
  adminSectionTitle,
  sectionHeader,
  tableWrap,
  table,
  th,
  td,
  tr,
  statusBadge,
  statusSelect,
  roleBadge,
  verified,
  notVerified,
  btnView,
  btnEdit,
  btnDelete,
  btnAdd,
  menuGrid,
  menuCard,
  menuCardImage,
  menuCardContent,
  menuCardTitle,
  menuCardText,
  menuCardFooter,
  menuCardPrice,
  menuActions,
} from '../styles/admin';

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
      <div className={adminPage}>
        <div className={loadingContainer}>
          <div className={spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={adminPage} id="main-content">
      <div className={adminHeader}>
        <h1 className={adminHeaderTitle}>
          <i className="fas fa-dashboard" aria-hidden="true"></i> Admin Dashboard
        </h1>
        <p className={adminHeaderText}>Welcome back, {user?.name}!</p>
      </div>

      <div className={adminTabs}>
        <button
          className={activeTab === 'overview' ? adminTabActive : adminTabIdle}
          onClick={() => setActiveTab('overview')}
        >
          <i className={`fas fa-chart-line ${adminTabIcon}`} aria-hidden="true"></i> Overview
        </button>
        <button
          className={activeTab === 'orders' ? adminTabActive : adminTabIdle}
          onClick={() => setActiveTab('orders')}
        >
          <i className={`fas fa-shopping-bag ${adminTabIcon}`} aria-hidden="true"></i> Orders
        </button>
        <button
          className={activeTab === 'users' ? adminTabActive : adminTabIdle}
          onClick={() => setActiveTab('users')}
        >
          <i className={`fas fa-users ${adminTabIcon}`} aria-hidden="true"></i> Users
        </button>
        <button
          className={activeTab === 'menu' ? adminTabActive : adminTabIdle}
          onClick={() => setActiveTab('menu')}
        >
          <i className={`fas fa-utensils ${adminTabIcon}`} aria-hidden="true"></i> Menu
        </button>
      </div>

      {activeTab === 'overview' && stats && (
        <div className={adminSection}>
          <div className={statsGrid}>
            <div className={statCard}>
              <div className={statIcon.revenue}>
                <i className="fas fa-dollar-sign" aria-hidden="true"></i>
              </div>
              <div>
                <h3 className={statValue}>₹{stats.totalRevenue?.toLocaleString()}</h3>
                <p className={statLabel}>Total Revenue</p>
              </div>
            </div>

            <div className={statCard}>
              <div className={statIcon.orders}>
                <i className="fas fa-shopping-cart" aria-hidden="true"></i>
              </div>
              <div>
                <h3 className={statValue}>{stats.totalOrders}</h3>
                <p className={statLabel}>Total Orders</p>
              </div>
            </div>

            <div className={statCard}>
              <div className={statIcon.users}>
                <i className="fas fa-user" aria-hidden="true"></i>
              </div>
              <div>
                <h3 className={statValue}>{stats.totalUsers}</h3>
                <p className={statLabel}>Total Users</p>
              </div>
            </div>

            <div className={statCard}>
              <div className={statIcon.menu}>
                <i className="fas fa-coffee" aria-hidden="true"></i>
              </div>
              <div>
                <h3 className={statValue}>{stats.totalMenuItems}</h3>
                <p className={statLabel}>Menu Items</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className={adminSectionTitle}>Recent Orders</h2>
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={th}>Order ID</th>
                    <th className={th}>Customer</th>
                    <th className={th}>Items</th>
                    <th className={th}>Amount</th>
                    <th className={th}>Status</th>
                    <th className={th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders?.map((order) => (
                    <tr key={order._id} className={tr}>
                      <td className={td}>#{order._id.slice(-6)}</td>
                      <td className={td}>{order.user?.name || order.customerName}</td>
                      <td className={td}>{order.items.length}</td>
                      <td className={td}>₹{order.totalAmount}</td>
                      <td className={td}>
                        <span className={statusBadge(order.status)}>{order.status}</span>
                      </td>
                      <td className={td}>{new Date(order.createdAt).toLocaleDateString()}</td>
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
  const { toast } = useToast();
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
      toast.error('Failed to update order status');
    }
  };

  if (loading) return <div className={loadingContainer}>Loading orders...</div>;

  return (
    <div className={adminSection}>
      <h2>
        <i className="fas fa-shopping-bag" aria-hidden="true"></i> All Orders ({orders.length})
      </h2>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>Order ID</th>
              <th className={th}>Customer</th>
              <th className={th}>Email</th>
              <th className={th}>Items</th>
              <th className={th}>Amount</th>
              <th className={th}>Type</th>
              <th className={th}>Status</th>
              <th className={th}>Date</th>
              <th className={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className={tr}>
                <td className={td}>#{order._id.slice(-6)}</td>
                <td className={td}>{order.user?.name || order.customerName}</td>
                <td className={td}>{order.customerEmail}</td>
                <td className={td}>{order.items.length}</td>
                <td className={td}>₹{order.totalAmount}</td>
                <td className={td}>{order.orderType}</td>
                <td className={td}>
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                    className={statusSelect(order.status)}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td className={td}>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className={td}>
                  <button className={btnView} onClick={() => toast.info(`Order ${order._id}`)}>
                    <i className="fas fa-eye" aria-hidden="true"></i>
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
  const { toast } = useToast();
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
      toast.error('Failed to delete user');
    }
  };

  if (loading) return <div className={loadingContainer}>Loading users...</div>;

  return (
    <div className={adminSection}>
      <h2>
        <i className="fas fa-users" aria-hidden="true"></i> All Users ({users.length})
      </h2>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Email</th>
              <th className={th}>Role</th>
              <th className={th}>Verified</th>
              <th className={th}>Registered</th>
              <th className={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className={tr}>
                <td className={td}>{user.name}</td>
                <td className={td}>{user.email}</td>
                <td className={td}>
                  <span className={roleBadge(user.role)}>{user.role}</span>
                </td>
                <td className={td}>
                  {user.isVerified ? (
                    <span className={verified}>
                      <i className="fas fa-check-circle" aria-hidden="true"></i> Yes
                    </span>
                  ) : (
                    <span className={notVerified}>
                      <i className="fas fa-times-circle" aria-hidden="true"></i> No
                    </span>
                  )}
                </td>
                <td className={td}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className={td}>
                  {user.role !== 'admin' && (
                    <button className={btnDelete} onClick={() => deleteUser(user._id)}>
                      <i className="fas fa-trash" aria-hidden="true"></i>
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
  const { toast } = useToast();
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
      toast.error('Failed to delete menu item');
    }
  };

  if (loading) return <div className={loadingContainer}>Loading menu...</div>;

  return (
    <div className={adminSection}>
      <div className={sectionHeader}>
        <h2>
          <i className="fas fa-utensils" aria-hidden="true"></i> Menu Items ({menuItems.length})
        </h2>
        <button className={btnAdd}>
          <i className="fas fa-plus" aria-hidden="true"></i> Add New Item
        </button>
      </div>
      <div className={menuGrid}>
        {menuItems.map((item) => (
          <div key={item._id} className={menuCard}>
            <img src={resolveImage(item.image)} alt={item.name} className={menuCardImage} />
            <div className={menuCardContent}>
              <h3 className={menuCardTitle}>{item.name}</h3>
              <p className={menuCardText}>{item.description}</p>
              <div className={menuCardFooter}>
                <span className={menuCardPrice}>₹{item.price}</span>
                <div className={menuActions}>
                  <button className={btnEdit}>
                    <i className="fas fa-edit" aria-hidden="true"></i>
                  </button>
                  <button className={btnDelete} onClick={() => deleteMenuItem(item._id)}>
                    <i className="fas fa-trash" aria-hidden="true"></i>
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

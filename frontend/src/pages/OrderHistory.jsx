import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const OrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await api.getMyOrders(user?.token);
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffa500',
      confirmed: '#2196f3',
      preparing: '#9c27b0',
      ready: '#ff9800',
      delivered: '#4caf50',
      cancelled: '#f44336'
    };
    return colors[status] || '#666';
  };

  if (loading) {
    return (
      <div className="order-history-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-history-page">
      <div className="order-history-container section-content">
        <h1><i className="fas fa-history"></i> Order History</h1>
        
        {orders.length === 0 ? (
          <div className="no-orders">
            <i className="fas fa-shopping-bag"></i>
            <h2>No Orders Yet</h2>
            <p>Start exploring our menu and place your first order!</p>
            <a href="/order" className="btn-primary">Browse Menu</a>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-id">
                    <h3>Order #{order._id.slice(-8).toUpperCase()}</h3>
                    <span className="order-date">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="order-status-badge" style={{ backgroundColor: getStatusColor(order.status) }}>
                    {order.status.toUpperCase()}
                  </div>
                </div>

                <div className="order-body">
                  <div className="order-items">
                    <h4>Items ({order.items.length})</h4>
                    {order.items.map((item, index) => (
                      <div key={index} className="order-item">
                        <div className="item-info">
                          <span className="item-name">{item.name}</span>
                          <span className="item-quantity">x{item.quantity}</span>
                        </div>
                        <span className="item-price">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-details">
                    <div className="detail-row">
                      <span><i className="fas fa-shopping-bag"></i> Order Type:</span>
                      <span className="detail-value">{order.orderType}</span>
                    </div>
                    {order.deliveryAddress && (
                      <div className="detail-row">
                        <span><i className="fas fa-location-dot"></i> Delivery Address:</span>
                        <span className="detail-value">{order.deliveryAddress}</span>
                      </div>
                    )}
                    {order.specialInstructions && (
                      <div className="detail-row">
                        <span><i className="fas fa-note-sticky"></i> Instructions:</span>
                        <span className="detail-value">{order.specialInstructions}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="order-footer">
                  <div className="order-total">
                    <span>Total Amount:</span>
                    <span className="total-price">₹{order.totalAmount}</span>
                  </div>
                  <button 
                    className="btn-view-details"
                    onClick={() => setSelectedOrder(order)}
                  >
                    View Details
                  </button>
                </div>

                <div className="order-tracking">
                  <div className={`tracking-step ${['pending', 'confirmed', 'preparing', 'ready', 'delivered'].indexOf(order.status) >= 0 ? 'completed' : ''}`}>
                    <div className="tracking-icon"><i className="fas fa-check"></i></div>
                    <span>Placed</span>
                  </div>
                  <div className={`tracking-step ${['confirmed', 'preparing', 'ready', 'delivered'].indexOf(order.status) >= 0 ? 'completed' : ''}`}>
                    <div className="tracking-icon"><i className="fas fa-check-double"></i></div>
                    <span>Confirmed</span>
                  </div>
                  <div className={`tracking-step ${['preparing', 'ready', 'delivered'].indexOf(order.status) >= 0 ? 'completed' : ''}`}>
                    <div className="tracking-icon"><i className="fas fa-fire"></i></div>
                    <span>Preparing</span>
                  </div>
                  <div className={`tracking-step ${['ready', 'delivered'].indexOf(order.status) >= 0 ? 'completed' : ''}`}>
                    <div className="tracking-icon"><i className="fas fa-box"></i></div>
                    <span>Ready</span>
                  </div>
                  <div className={`tracking-step ${order.status === 'delivered' ? 'completed' : ''}`}>
                    <div className="tracking-icon"><i className="fas fa-truck"></i></div>
                    <span>Delivered</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details</h2>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <h3>Order Information</h3>
                <p><strong>Order ID:</strong> {selectedOrder._id}</p>
                <p><strong>Status:</strong> <span style={{ color: getStatusColor(selectedOrder.status) }}>{selectedOrder.status.toUpperCase()}</span></p>
                <p><strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                <p><strong>Order Type:</strong> {selectedOrder.orderType}</p>
              </div>

              <div className="modal-section">
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> {selectedOrder.customerName}</p>
                <p><strong>Email:</strong> {selectedOrder.customerEmail}</p>
                <p><strong>Phone:</strong> {selectedOrder.customerPhone}</p>
                {selectedOrder.deliveryAddress && (
                  <p><strong>Address:</strong> {selectedOrder.deliveryAddress}</p>
                )}
              </div>

              <div className="modal-section">
                <h3>Order Items</h3>
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="modal-item">
                    <span>{item.name} x {item.quantity}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="modal-total">
                  <strong>Total:</strong>
                  <strong>₹{selectedOrder.totalAmount}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;

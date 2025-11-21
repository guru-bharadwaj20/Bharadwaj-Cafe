import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const Order = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const data = await api.getMenu();
      setMenuItems(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setError('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="order-section" id="order">
        <h2 className="section-title">Our Menu</h2>
        <div className="section-content">
          <p style={{ textAlign: 'center', color: '#fff' }}>Loading menu...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="order-section" id="order">
        <h2 className="section-title">Our Menu</h2>
        <div className="section-content">
          <p style={{ textAlign: 'center', color: '#f3961c' }}>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="order-section" id="order">
      <h2 className="section-title">Our Menu</h2>
      <div className="section-content">
        <ul className="menu-list">
          {menuItems.map((item) => (
            <li className="menu-item" key={item._id}>
              <img src={item.image} alt={item.name} className="menu-image" />
              <div className="menu-details">
                <h3 className="name">{item.name}</h3>
                <p className="text">{item.description}</p>
                <p className="text" style={{ fontWeight: 'bold', color: '#f3961c', marginTop: '10px' }}>
                  ₹{item.price}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Order;

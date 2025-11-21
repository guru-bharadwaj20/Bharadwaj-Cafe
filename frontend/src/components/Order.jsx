import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useCart } from '../context/CartContext';

const Order = () => {
  const { addToCart } = useCart();
  const [addedItems, setAddedItems] = useState({});

  const handleAddToCart = (item) => {
    addToCart(item);
    setAddedItems(prev => ({ ...prev, [item._id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [item._id]: false }));
    }, 1500);
  };

  const defaultMenuItems = [
    {
      _id: '1',
      name: 'Cappuccino',
      description: 'Espresso with steamed milk foam and a touch of cocoa',
      price: 150,
      image: 'img/cappuccino.png'
    },
    {
      _id: '2',
      name: 'Caffe Latte',
      description: 'Smooth espresso with steamed milk and light foam',
      price: 160,
      image: 'img/latte.png'
    },
    {
      _id: '3',
      name: 'Mocha',
      description: 'Rich chocolate and espresso blend with whipped cream',
      price: 170,
      image: 'img/mocha.png'
    },
    {
      _id: '4',
      name: 'Americano',
      description: 'Espresso diluted with hot water for a smooth taste',
      price: 130,
      image: 'img/americano.png'
    },
    {
      _id: '5',
      name: 'Flat White',
      description: 'Velvety microfoam with a double shot of espresso',
      price: 155,
      image: 'img/flat.png'
    },
    {
      _id: '6',
      name: 'Filter Coffee',
      description: 'Traditional South Indian filter coffee with milk and sugar',
      price: 100,
      image: 'img/filter.png'
    }
  ];

  const [menuItems, setMenuItems] = useState(defaultMenuItems);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const data = await api.getMenu();
      // If database has items, use them; otherwise use default
      if (data && data.length > 0) {
        setMenuItems(data);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching menu:', err);
      // Use default menu items if fetch fails
      setMenuItems(defaultMenuItems);
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
                <div className="menu-footer">
                  <p className="price">₹{item.price}</p>
                  <button 
                    className={`add-to-cart-btn ${addedItems[item._id] ? 'added' : ''}`}
                    onClick={() => handleAddToCart(item)}
                  >
                    {addedItems[item._id] ? (
                      <><i className="fas fa-check"></i> Added</>
                    ) : (
                      <><i className="fas fa-cart-plus"></i> Add to Cart</>
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Order;

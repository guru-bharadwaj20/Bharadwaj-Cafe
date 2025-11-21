import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

const Merchandise = () => {
  const { addToCart } = useCart();
  const [addedItems, setAddedItems] = useState({});

  const handleAddToCart = (item) => {
    addToCart(item);
    setAddedItems(prev => ({ ...prev, [item._id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [item._id]: false }));
    }, 1500);
  };

  const merchandiseItems = [
    {
      _id: 'merch-1',
      name: 'Bharadwaj\'s Cafe T-Shirt',
      description: 'Premium quality cotton t-shirt with our iconic logo',
      price: 599,
      image: 'img/coffee-hero-section.png',
      category: 'Apparel'
    },
    {
      _id: 'merch-2',
      name: 'Coffee Mug - Classic',
      description: 'Ceramic coffee mug with heat-resistant design',
      price: 299,
      image: 'img/cappuccino.png',
      category: 'Drinkware'
    },
    {
      _id: 'merch-3',
      name: 'Hoodie - Black',
      description: 'Warm and cozy hoodie perfect for coffee lovers',
      price: 1299,
      image: 'img/coffee-hero-section.png',
      category: 'Apparel'
    },
    {
      _id: 'merch-4',
      name: 'Travel Tumbler',
      description: 'Insulated stainless steel tumbler, keeps drinks hot for 6 hours',
      price: 799,
      image: 'img/americano.png',
      category: 'Drinkware'
    },
    {
      _id: 'merch-5',
      name: 'Cap - Embroidered Logo',
      description: 'Adjustable baseball cap with embroidered cafe logo',
      price: 399,
      image: 'img/coffee-hero-section.png',
      category: 'Accessories'
    },
    {
      _id: 'merch-6',
      name: 'Tote Bag',
      description: 'Eco-friendly canvas tote bag for your daily essentials',
      price: 449,
      image: 'img/coffee-hero-section.png',
      category: 'Accessories'
    },
    {
      _id: 'merch-7',
      name: 'Coffee Beans - Premium Blend',
      description: 'Our signature coffee beans, 250g pack',
      price: 499,
      image: 'img/filter.png',
      category: 'Food & Beverage'
    },
    {
      _id: 'merch-8',
      name: 'Keychain',
      description: 'Metal keychain with mini coffee cup design',
      price: 149,
      image: 'img/latte.png',
      category: 'Accessories'
    },
    {
      _id: 'merch-9',
      name: 'Notebook - Coffee Lover',
      description: 'A5 ruled notebook with coffee-themed cover',
      price: 249,
      image: 'img/coffee-hero-section.png',
      category: 'Stationery'
    },
    {
      _id: 'merch-10',
      name: 'Coaster Set',
      description: 'Set of 4 wooden coasters with cafe branding',
      price: 199,
      image: 'img/mocha.png',
      category: 'Home Decor'
    },
    {
      _id: 'merch-11',
      name: 'Water Bottle',
      description: 'BPA-free water bottle with cafe logo, 1L capacity',
      price: 549,
      image: 'img/flat.png',
      category: 'Drinkware'
    },
    {
      _id: 'merch-12',
      name: 'Sweatshirt - Grey',
      description: 'Comfortable sweatshirt with vintage cafe print',
      price: 999,
      image: 'img/coffee-hero-section.png',
      category: 'Apparel'
    }
  ];

  return (
    <section className="merchandise-section" id="merchandise">
      <h2 className="section-title">Our Merchandise</h2>
      <div className="section-content">
        <ul className="merchandise-list">
          {merchandiseItems.map((item) => (
            <li className="merchandise-item" key={item._id}>
              <div className="merchandise-badge">{item.category}</div>
              <img src={item.image} alt={item.name} className="merchandise-image" />
              <div className="merchandise-details">
                <h3 className="name">{item.name}</h3>
                <p className="text">{item.description}</p>
                <div className="merchandise-footer">
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

export default Merchandise;

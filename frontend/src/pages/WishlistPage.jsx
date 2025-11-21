import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const WishlistPage = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const data = await api.getWishlist(user?.token);
      setWishlist(data);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (itemId) => {
    try {
      const data = await api.removeFromWishlist(itemId, user?.token);
      setWishlist(data);
    } catch (error) {
      alert('Failed to remove item');
    }
  };

  const handleAddToCart = (item) => {
    addToCart(item);
    alert('Added to cart!');
  };

  const handleClearWishlist = async () => {
    if (!window.confirm('Clear entire wishlist?')) return;
    try {
      await api.clearWishlist(user?.token);
      fetchWishlist();
    } catch (error) {
      alert('Failed to clear wishlist');
    }
  };

  if (loading) {
    return (
      <div className="wishlist-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="wishlist-header">
        <h1>My Wishlist</h1>
        <p>Save your favorite items for later</p>
      </div>

      {!wishlist || wishlist.items.length === 0 ? (
        <div className="empty-wishlist">
          <i className="fas fa-heart"></i>
          <h2>Your wishlist is empty</h2>
          <p>Start adding items you love!</p>
          <button className="btn-browse" onClick={() => navigate('/home')}>
            <i className="fas fa-utensils"></i> Browse Menu
          </button>
        </div>
      ) : (
        <>
          <div className="wishlist-actions">
            <span>{wishlist.items.length} items</span>
            <button className="btn-clear" onClick={handleClearWishlist}>
              <i className="fas fa-trash"></i> Clear All
            </button>
          </div>

          <div className="wishlist-grid">
            {wishlist.items.map(item => (
              <div key={item._id} className="wishlist-card">
                <button 
                  className="btn-remove"
                  onClick={() => handleRemove(item.menuItem._id)}
                >
                  <i className="fas fa-times"></i>
                </button>
                
                <img src={item.menuItem.image} alt={item.menuItem.name} />
                
                <div className="wishlist-card-content">
                  <h3>{item.menuItem.name}</h3>
                  <p>{item.menuItem.description}</p>
                  
                  {item.menuItem.rating > 0 && (
                    <div className="rating">
                      <i className="fas fa-star"></i>
                      {item.menuItem.rating.toFixed(1)} 
                      <span>({item.menuItem.reviewCount} reviews)</span>
                    </div>
                  )}
                  
                  <div className="wishlist-card-footer">
                    <span className="price">₹{item.menuItem.price}</span>
                    <button 
                      className="btn-add-cart"
                      onClick={() => handleAddToCart(item.menuItem)}
                    >
                      <i className="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default WishlistPage;

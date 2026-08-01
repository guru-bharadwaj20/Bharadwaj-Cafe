import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import SearchFilters from './SearchFilters';

const Order = () => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [addedItems, setAddedItems] = useState({});

  const handleAddToCart = (item) => {
    addToCart(item);
    setAddedItems((prev) => ({ ...prev, [item._id]: true }));
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [item._id]: false }));
    }, 1500);
  };

  // No hardcoded fallback menu. There used to be one, with ids "1" through
  // "6", shown whenever the request failed *or* returned nothing. Those ids
  // exist in no database, so anything added to the cart from it was rejected
  // at checkout — and an ordinary search matching zero items was enough to
  // put the whole fake menu on screen.
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMenu = async (filterParams = {}) => {
    try {
      setLoading(true);
      setMenuItems(await api.getMenu(filterParams));
      setError(null);
    } catch (err) {
      setMenuItems([]);
      setError('We could not load the menu just now. Please try again in a moment.');
      console.error('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleFilterChange = (newFilters) => {
    fetchMenu(newFilters);
  };

  const handleAddToWishlist = async (itemId) => {
    if (!user) {
      alert('Please login to add to wishlist');
      return;
    }
    try {
      await api.addToWishlist(itemId, user.token);
      alert('Added to wishlist!');
    } catch (error) {
      alert(error.message);
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
      <SearchFilters onFilterChange={handleFilterChange} />
      <div className="section-content">
        {menuItems.length === 0 ? (
          <p className="menu-empty">
            No items match those filters. Try widening your search.
          </p>
        ) : (
        <ul className="menu-list">
          {menuItems.map((item) => (
            <li className="menu-item" key={item._id}>
              <button
                className="btn-wishlist"
                onClick={() => handleAddToWishlist(item._id)}
                title="Add to Wishlist"
              >
                <i className="fas fa-heart" aria-hidden="true"></i>
              </button>
              <img src={item.image} alt={item.name} className="menu-image" />
              <div className="menu-details">
                <h3 className="name">{item.name}</h3>
                <p className="text">{item.description}</p>
                {item.dietary && item.dietary.length > 0 && (
                  <div className="dietary-tags">
                    {item.dietary.map((tag) => (
                      <span key={tag} className="dietary-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {item.rating > 0 && (
                  <div className="rating">
                    <i className="fas fa-star" aria-hidden="true"></i> {item.rating.toFixed(1)}
                    <span>({item.reviewCount} reviews)</span>
                  </div>
                )}
                <div className="menu-footer">
                  <p className="price">₹{item.price}</p>
                  <button
                    className={`add-to-cart-btn ${addedItems[item._id] ? 'added' : ''}`}
                    onClick={() => handleAddToCart(item)}
                  >
                    {addedItems[item._id] ? (
                      <>
                        <i className="fas fa-check" aria-hidden="true"></i> Added
                      </>
                    ) : (
                      <>
                        <i className="fas fa-cart-plus" aria-hidden="true"></i> Add to Cart
                      </>
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        )}
      </div>
    </section>
  );
};

export default Order;

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useCart } from '../context/CartContext';

/** 'home-decor' reads badly on a badge; the rest just need capitalising. */
const categoryLabel = (category = '') =>
  category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const Merchandise = () => {
  const { addToCart } = useCart();
  const [addedItems, setAddedItems] = useState({});
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Merchandise used to be a hardcoded array right here, with ids like
  // "merch-1". Nothing on the server had ever heard of those ids, so every
  // basket containing one was rejected at checkout. These are real products
  // now, with real ids the server can price.
  useEffect(() => {
    let cancelled = false;

    api
      .getMerchandise()
      .then((data) => {
        if (!cancelled) {
          setItems(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          setError('We could not load the shop just now. Please try again in a moment.');
          console.error('Error fetching merchandise:', err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddToCart = (item) => {
    addToCart(item);
    setAddedItems((prev) => ({ ...prev, [item._id]: true }));
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [item._id]: false }));
    }, 1500);
  };

  return (
    <section className="merchandise-section" id="merchandise">
      <h2 className="section-title">Our Merchandise</h2>
      <div className="section-content">
        {loading && <p className="merchandise-status">Loading the shop...</p>}
        {error && <p className="merchandise-status merchandise-error">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="merchandise-status">Nothing in the shop right now — check back soon.</p>
        )}

        {items.length > 0 && (
          <ul className="merchandise-list">
            {items.map((item) => (
              <li className="merchandise-item" key={item._id}>
                <div className="merchandise-badge">{categoryLabel(item.category)}</div>
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

export default Merchandise;

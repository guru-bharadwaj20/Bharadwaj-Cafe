import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useCart } from '../context/CartContext';
import { resolveImage } from '../assets/cloudinary';
import {
  addToCartBtn,
  addToCartBtnAdded,
  merchBadge,
  shopCard,
  shopDetails,
  shopFooter,
  shopGrid,
  shopImage,
  shopName,
  shopPrice,
  shopSection,
  shopStatus,
  shopText,
  shopTitle,
} from '../styles/shop';

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
    <section className={shopSection} id="merchandise">
      <h2 className={shopTitle}>Our Merchandise</h2>
      <div className="mx-auto max-w-site px-5">
        {loading && <p className={shopStatus}>Loading the shop...</p>}
        {error && <p className={`${shopStatus} text-secondary`}>{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className={shopStatus}>Nothing in the shop right now — check back soon.</p>
        )}

        {items.length > 0 && (
          <ul className={shopGrid}>
            {items.map((item) => (
              <li className={shopCard} key={item._id}>
                <div className={merchBadge}>{categoryLabel(item.category)}</div>
                <img src={resolveImage(item.image)} alt={item.name} className={shopImage} />
                <div className={shopDetails}>
                  <h3 className={shopName}>{item.name}</h3>
                  <p className={shopText}>{item.description}</p>
                  <div className={shopFooter}>
                    <p className={shopPrice}>₹{item.price}</p>
                    <button
                      className={addedItems[item._id] ? addToCartBtnAdded : addToCartBtn}
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

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import SearchFilters from './SearchFilters';
import { useToast } from '../context/ToastContext';
import {
  addToCartBtn,
  addToCartBtnAdded,
  dietaryTag,
  dietaryTags,
  ratingCount,
  ratingRow,
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
  wishlistBtn,
} from '../styles/shop';

const Order = () => {
  const { toast } = useToast();
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
      toast.error('Please login to add to wishlist');
      return;
    }
    try {
      await api.addToWishlist(itemId, user.token);
      toast.success('Added to wishlist!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  /*
   * The filter bar stays mounted through loading and error states, and that is
   * a bug fix rather than a tidy-up. Changing any filter sets `loading`, and
   * while this component returned early for that the whole subtree came down
   * with it — including `SearchFilters`, whose selections live in its own
   * state. Every one of them was wiped on the way to the results: you could
   * never hold two dietary filters at once, and the search box emptied itself
   * mid-search.
   */
  return (
    <section className={shopSection} id="order">
      <h2 className={shopTitle}>Our Menu</h2>
      <SearchFilters onFilterChange={handleFilterChange} />
      <div className="mx-auto max-w-site px-5">
        {loading ? (
          <p className={shopStatus}>Loading menu...</p>
        ) : error ? (
          <p className={`${shopStatus} text-secondary`}>{error}</p>
        ) : menuItems.length === 0 ? (
          <p className={shopStatus}>No items match those filters. Try widening your search.</p>
        ) : (
          <ul className={shopGrid}>
            {menuItems.map((item) => (
              <li className={shopCard} key={item._id}>
                <button
                  className={wishlistBtn}
                  onClick={() => handleAddToWishlist(item._id)}
                  title="Add to Wishlist"
                >
                  <i className="fas fa-heart" aria-hidden="true"></i>
                </button>
                <img src={item.image} alt={item.name} className={shopImage} />
                <div className={shopDetails}>
                  <h3 className={shopName}>{item.name}</h3>
                  <p className={shopText}>{item.description}</p>
                  {item.dietary && item.dietary.length > 0 && (
                    <div className={dietaryTags}>
                      {item.dietary.map((tag) => (
                        <span key={tag} className={dietaryTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.rating > 0 && (
                    <div className={ratingRow}>
                      <i className="fas fa-star" aria-hidden="true"></i> {item.rating.toFixed(1)}
                      <span className={ratingCount}>({item.reviewCount} reviews)</span>
                    </div>
                  )}
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

export default Order;

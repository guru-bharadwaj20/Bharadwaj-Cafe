import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';

/**
 * Wishlist.
 *
 * Migrated from wishlist.css. The loading state still uses `.loading-container`
 * and `.spinner`, which live in another stylesheet and are shared with the
 * account pages — they move when that file does.
 */

// Both amber call-to-action buttons lift on hover in exactly the same way.
const amberLift =
  'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(243,150,28,0.3)]';

const gutter = 'mx-auto max-w-[1200px] px-5';

const WishlistPage = () => {
  const { toast } = useToast();
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
    } catch {
      toast.error('Failed to remove item');
    }
  };

  // No notification here: `CartToast` already confirms every add, with the
  // item's name and a way to the basket. A second one would double up.
  const handleAddToCart = (item) => {
    addToCart(item);
  };

  const handleClearWishlist = async () => {
    if (!window.confirm('Clear entire wishlist?')) return;
    try {
      await api.clearWishlist(user?.token);
      fetchWishlist();
    } catch {
      toast.error('Failed to clear wishlist');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark pb-[50px] pt-10">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark pb-[50px] pt-10" id="main-content">
      <div className="mb-10 text-center text-white">
        <h1 className="mb-2.5 text-xxl text-secondary">My Wishlist</h1>
        <p>Save your favorite items for later</p>
      </div>

      {!wishlist || wishlist.items.length === 0 ? (
        <div className="px-5 py-[100px] text-center text-white">
          <i
            className="fas fa-heart mb-5 text-[80px] text-secondary opacity-50"
            aria-hidden="true"
          ></i>
          <h2 className="mb-2.5 text-xl">Your wishlist is empty</h2>
          <p className="mb-[30px] text-[#999]">Start adding items you love!</p>
          <button
            className={`inline-flex cursor-pointer items-center gap-2.5 rounded-s border-none bg-secondary px-[30px] py-3 text-m font-bold text-black ${amberLift}`}
            onClick={() => navigate('/home')}
          >
            <i className="fas fa-utensils" aria-hidden="true"></i> Browse Menu
          </button>
        </div>
      ) : (
        <>
          <div className={`${gutter} mb-[30px] flex items-center justify-between text-white`}>
            <span>{wishlist.items.length} items</span>
            <button
              className="flex cursor-pointer items-center gap-2 rounded-s border-none bg-[#f44336] px-5 py-2.5 text-white transition-all duration-300 hover:bg-[#d32f2f]"
              onClick={handleClearWishlist}
            >
              <i className="fas fa-trash" aria-hidden="true"></i> Clear All
            </button>
          </div>

          <div
            className={`${gutter} grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[25px] max-[768px]:grid-cols-1`}
          >
            {wishlist.items.map((item) => (
              <div
                key={item._id}
                className="relative overflow-hidden rounded-[12px] bg-[#2a2a2a] transition-transform duration-300 hover:-translate-y-[5px]"
              >
                <button
                  className="absolute right-2.5 top-2.5 z-10 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-circle border-none bg-[rgba(244,67,54,0.9)] text-white transition-all duration-300 hover:scale-110 hover:bg-[#f44336]"
                  onClick={() => handleRemove(item.menuItem._id)}
                >
                  <i className="fas fa-times" aria-hidden="true"></i>
                </button>

                <img
                  src={item.menuItem.image}
                  alt={item.menuItem.name}
                  className="h-[200px] w-full object-cover"
                />

                <div className="p-[15px]">
                  <h3 className="mb-2 text-l text-secondary">{item.menuItem.name}</h3>
                  <p className="mb-2.5 text-s text-[#ccc]">{item.menuItem.description}</p>

                  {item.menuItem.rating > 0 && (
                    <div className="mb-2.5 flex items-center gap-[5px] text-s text-secondary">
                      <i className="fas fa-star" aria-hidden="true"></i>
                      {item.menuItem.rating.toFixed(1)}
                      <span>({item.menuItem.reviewCount} reviews)</span>
                    </div>
                  )}

                  <div className="mt-[15px] flex items-center justify-between">
                    <span className="text-l font-bold text-secondary">₹{item.menuItem.price}</span>
                    <button
                      className={`flex cursor-pointer items-center gap-[5px] rounded-[5px] border-none bg-secondary px-[15px] py-2 font-bold text-black ${amberLift}`}
                      onClick={() => handleAddToCart(item.menuItem)}
                    >
                      <i className="fas fa-shopping-cart" aria-hidden="true"></i> Add to Cart
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

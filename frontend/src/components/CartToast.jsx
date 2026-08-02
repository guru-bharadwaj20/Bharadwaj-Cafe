import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { glassMenu, textOnGlass, textOnGlassSoft, borderOnGlass } from '../styles/glass';

/**
 * Confirmation that something reached the basket, with a way to go there.
 *
 * Adding an item used to change nothing on screen. The count lived in a cart
 * button that style.css hides above 768px, so on a desktop the only feedback
 * was no feedback -- which is why it looked as though the cart was not
 * working. This is the pattern the big shops use: confirm the item, show the
 * running total, and offer the basket without forcing anyone to it.
 *
 * It sits above the floating nav rather than over the page content, so it
 * never covers what was just clicked.
 */
const AUTO_DISMISS_MS = 4000;

const CartToast = () => {
  const navigate = useNavigate();
  const { lastAdded, dismissLastAdded, getTotalItems } = useCart();

  useEffect(() => {
    if (!lastAdded) return;
    const timer = setTimeout(dismissLastAdded, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // `at` changes on every add, so re-adding the same item restarts the clock.
  }, [lastAdded, dismissLastAdded]);

  if (!lastAdded) return null;

  const { item } = lastAdded;
  const count = getTotalItems();

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'fixed bottom-[104px] left-1/2 z-40 w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2',
        'flex items-center gap-3 rounded-[14px] p-3',
        glassMenu,
      ].join(' ')}
    >
      {item.image && (
        <img
          src={item.image}
          alt=""
          className="h-12 w-12 shrink-0 rounded-s object-cover"
          aria-hidden="true"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-s font-bold text-secondary">
          <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
          Added to cart
        </p>
        <p className="truncate text-s text-white">{item.name}</p>
        <p className={`text-[11px] ${textOnGlassSoft}`}>
          {count} item{count === 1 ? '' : 's'} in your cart
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        <button
          onClick={() => {
            dismissLastAdded();
            navigate('/cart');
          }}
          className="cursor-pointer rounded-s border-none bg-secondary px-3 py-1.5 text-[12px] font-bold text-primary transition-transform duration-200 hover:-translate-y-0.5"
        >
          View cart
        </button>
        <button
          onClick={dismissLastAdded}
          className={`cursor-pointer rounded-s border border-solid bg-transparent px-3 py-1.5 text-[12px] transition-colors duration-200 hover:bg-[rgba(255,255,255,0.1)] ${borderOnGlass} ${textOnGlass}`}
        >
          Keep shopping
        </button>
      </div>
    </div>
  );
};

export default CartToast;

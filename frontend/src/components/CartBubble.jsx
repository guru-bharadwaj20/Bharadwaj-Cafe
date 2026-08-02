import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { glassPanel } from '../styles/glass';

/**
 * The basket, as a floating bubble in the top-right corner.
 *
 * Kept out of the bottom bar so it reads as a persistent status rather than
 * one destination among five, and placed opposite the chat launcher in the
 * bottom-right so the two never collide.
 *
 * The count is announced through the accessible name rather than left to the
 * badge alone, which a screen reader would otherwise read as a bare number.
 */
const CartBubble = () => {
  const navigate = useNavigate();
  const { getTotalItems } = useCart();
  const count = getTotalItems();

  return (
    <button
      type="button"
      onClick={() => navigate('/cart')}
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
      className={[
        'fixed right-4 top-4 z-30 flex h-12 w-12 cursor-pointer items-center justify-center',
        'rounded-circle text-white transition-transform duration-200 hover:-translate-y-0.5',
        glassPanel,
      ].join(' ')}
    >
      <i className="fas fa-shopping-cart text-[18px]" aria-hidden="true"></i>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-circle bg-secondary px-1 text-[11px] font-bold text-primary">
          {count}
        </span>
      )}
    </button>
  );
};

export default CartBubble;

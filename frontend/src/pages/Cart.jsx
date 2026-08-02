import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { openCheckout } from '../utils/razorpay';
import { useNavigate } from 'react-router-dom';
import { btnPrimary, btnSecondary } from '../styles/buttons';
import { useToast } from '../context/ToastContext';
import { resolveImage } from '../assets/cloudinary';
import { errorMessage } from '../styles/messages';

/*
 * Migrated from cart.css.
 *
 * Two of these rules were reaching past this page and one of them was losing a
 * fight it did not know it was in; both are described where they are used and
 * in docs/tailwind-migration.md.
 */

const cartSection = 'min-h-screen bg-[#1a1a1a] py-10';

/** The dark panel both the cart summary and the two checkout columns sit on. */
const panel = 'rounded-[10px] bg-[#2a2a2a] p-[30px]';
const panelTitle = 'mb-5 text-[24px] text-secondary';

/*
 * A row of label-and-amount with a hairline under it. Preflight is off, so
 * `border-b border-solid` would put the CSS initial `medium` width — about 3px
 * — on the three sides it does not name. The zeroes are load-bearing.
 */
const summaryRow =
  'flex justify-between border-x-0 border-t-0 border-b border-solid border-[#444] py-3 text-white';

/** The last row: rule above rather than below, amber, and larger. */
const summaryTotal =
  'mt-2.5 flex justify-between border-x-0 border-b-0 border-t-2 border-solid border-secondary pb-3 pt-5 text-[22px] text-secondary';

const cartItem =
  'flex items-center gap-5 rounded-[10px] bg-[#2a2a2a] p-5 to-768:flex-col to-768:items-start';

const cartItemImage =
  'h-[120px] w-[120px] rounded-s object-cover to-768:h-[200px] to-768:w-full';

const cartItemActions =
  'flex flex-col items-end gap-[15px] to-768:w-full to-768:flex-row to-768:items-center to-768:justify-between';

const quantityControls =
  'flex items-center gap-2.5 rounded-[25px] bg-[#1a1a1a] px-[15px] py-[5px]';

const quantityButton =
  'cursor-pointer border-none bg-transparent px-2.5 py-[5px] text-[16px] text-secondary transition-transform duration-200 hover:scale-[1.2]';

const removeBtn =
  'cursor-pointer rounded-[5px] border-none bg-[#d32f2f] px-[15px] py-2.5 text-white transition-colors duration-300 hover:bg-[#b71c1c]';

/*
 * `transition: background-color 0.3s, transform 0.2s` — two properties on two
 * different durations, which no combination of `transition-*` utilities can
 * express, so it stays a single arbitrary declaration rather than being rounded
 * to one shared duration.
 */
const btnProceed =
  'mt-5 w-full cursor-pointer rounded-s border-none bg-secondary p-[15px] text-[18px] font-bold text-black [transition:background-color_0.3s,transform_0.2s] hover:-translate-y-0.5 hover:bg-[#d67e0e]';

/* ------------------------------------------------------------ checkout -- */

const checkoutGrid = 'mt-[30px] grid grid-cols-2 gap-10 to-768:grid-cols-1';

const fieldGroup = 'mb-5';
const fieldLabel = 'mb-2 block font-medium text-white';

/** Text inputs, and the select and textarea, which cart.css styled separately
    on a slightly different palette. Both are kept as they render today. */
const textInput =
  'w-full rounded-[5px] border border-solid border-[#444] bg-[#1a1a1a] p-3 text-[16px] text-white focus:border-secondary focus:outline-none';

const selectInput =
  'w-full resize-y rounded-md border border-solid border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.06)] p-3 font-sans text-n text-white focus:border-secondary focus:outline-none';

const note = 'mt-3 text-[0.85rem] leading-[1.5] text-[#cfc3bd]';

const paymentNote = `${note} rounded-[4px] border-y-0 border-r-0 border-l-[3px] border-solid border-secondary bg-[rgba(243,150,28,0.1)] px-3 py-2.5`;

const paymentMethod =
  'my-4 rounded-md border border-solid border-[rgba(255,255,255,0.2)] px-[14px] py-3';

/*
 * The legend was inheriting its colour, and nothing on the chain from <body>
 * down sets one — so "Payment" rendered in the UA default black on this panel's
 * #2a2a2a, around 1.3:1. `.payment-form label` gave the two option labels below
 * it white; the legend is not a label, so it was missed. Only visible when the
 * server reports payments as configured, which is why it survived.
 */
const paymentLegend = 'px-1.5 text-[0.9rem] font-semibold text-white';

/*
 * cart.css asked for `display: flex` here, and never got it: `.payment-form
 * label` is (0,1,1) against this rule's (0,1,0), so every option rendered as a
 * block and the `gap` and `align-items` beside it did nothing. Written on the
 * element, the layout the file asked for is the layout that applies.
 */
const paymentOption = 'flex cursor-pointer items-center gap-2.5 py-1.5';

const checkoutButtons = 'mt-[30px] flex gap-[15px] to-768:flex-col';

const Cart = () => {
  const { toast } = useToast();
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCheckout, setShowCheckout] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState('takeaway');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [payOnline, setPayOnline] = useState(false);
  const [paymentsAvailable, setPaymentsAvailable] = useState(false);

  // The server decides whether online payment is offered at all — it depends
  // on whether provider keys are configured, which the client cannot know.
  useEffect(() => {
    let cancelled = false;
    api
      .getPaymentConfig()
      .then((config) => {
        if (!cancelled) setPaymentsAvailable(Boolean(config.enabled));
      })
      .catch(() => {
        if (!cancelled) setPaymentsAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleProceedToPay = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }
    setOrderError('');
    setShowCheckout(true);
  };

  const goToHistory = (order, message) => {
    clearCart();
    setShowCheckout(false);
    navigate('/order-history', {
      state: { message: `Order #${order._id.slice(-8).toUpperCase()} ${message}` },
    });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setOrderError('');
    setPlacing(true);

    try {
      // Only ids and quantities go to the server. It looks up the current
      // price of each item and calculates the total itself, so the amounts
      // shown below are a preview, not the source of truth.
      const order = await api.createOrder(
        {
          items: cartItems.map((item) => ({
            menuItem: item._id,
            quantity: item.quantity,
          })),
          customerPhone,
          orderType,
          deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
          specialInstructions,
          paymentMethod: payOnline && paymentsAvailable ? 'card' : 'cod',
        },
        user?.token
      );

      if (!payOnline || !paymentsAvailable) {
        goToHistory(order, 'placed successfully!');
        return;
      }

      // The order exists and is priced; now open a payment against it. The
      // amount comes from the server's response to this call, not from here.
      const payment = await api.createPayment(order._id, user?.token);
      const result = await openCheckout({
        keyId: payment.keyId,
        providerOrderId: payment.providerOrderId,
        amount: payment.amount,
        currency: payment.currency,
        orderId: order._id,
        user,
      });

      // The provider's response is only a claim until the server checks its
      // signature. The webhook is the real backstop if this call never lands.
      await api.verifyPayment(
        {
          providerOrderId: result.razorpay_order_id,
          paymentId: result.razorpay_payment_id,
          signature: result.razorpay_signature,
        },
        user?.token
      );

      goToHistory(order, 'paid and confirmed!');
    } catch (err) {
      // The order may already exist even if payment failed, so the cart is
      // deliberately left intact only when order creation itself failed.
      setOrderError(err.message || 'Could not complete your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (showCheckout) {
    return (
      <section className={cartSection}>
        <div className="section-content">
          {/* `.section-title` is maroon, which is right on the light About and
              Contact sections and invisible here -- 1.08:1 against this page's
              #1a1a1a. White matches how the other dark sections render it. */}
          <h2 className="section-title text-white">Checkout</h2>
          <div className={checkoutGrid}>
            <div className={panel}>
              <h3 className={panelTitle}>Order Summary</h3>
              {cartItems.map((item) => (
                <div key={item._id} className={summaryRow}>
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className={summaryRow}>
                <span>Tax (5%):</span>
                <span>₹{Math.round(getTotalPrice() * 0.05)}</span>
              </div>
              <div className={summaryTotal}>
                <strong>Total:</strong>
                <strong>₹{Math.round(getTotalPrice() * 1.05)}</strong>
              </div>
              <p className={note}>
                Final amount is confirmed by the cafe when your order is placed.
              </p>
            </div>
            <div className={panel}>
              <h3 className={panelTitle}>Order Details</h3>

              {orderError && (
                <div className={errorMessage}>
                  <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {orderError}
                </div>
              )}

              <form onSubmit={handlePlaceOrder}>
                <div className={fieldGroup}>
                  <label htmlFor="customerPhone" className={fieldLabel}>
                    Contact Number
                  </label>
                  <input
                    id="customerPhone"
                    type="tel"
                    className={textInput}
                    placeholder="Phone number for order updates"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>

                <div className={fieldGroup}>
                  <label htmlFor="orderType" className={fieldLabel}>
                    Order Type
                  </label>
                  {/* The options are painted dark-on-white: a native dropdown
                      list is drawn by the OS on its own background, so the
                      white text this control carries would vanish in it. */}
                  <select
                    id="orderType"
                    className={selectInput}
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                  >
                    <option value="takeaway" className="bg-white text-primary">
                      Takeaway
                    </option>
                    <option value="dine-in" className="bg-white text-primary">
                      Dine-in
                    </option>
                    <option value="delivery" className="bg-white text-primary">
                      Delivery
                    </option>
                  </select>
                </div>

                {orderType === 'delivery' && (
                  <div className={fieldGroup}>
                    <label htmlFor="deliveryAddress" className={fieldLabel}>
                      Delivery Address
                    </label>
                    <textarea
                      id="deliveryAddress"
                      rows="3"
                      className={selectInput}
                      placeholder="Flat / street / landmark"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className={fieldGroup}>
                  <label htmlFor="specialInstructions" className={fieldLabel}>
                    Special Instructions (optional)
                  </label>
                  <textarea
                    id="specialInstructions"
                    rows="2"
                    className={selectInput}
                    placeholder="Less sugar, extra hot, etc."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                  />
                </div>

                {/* Card details are never collected by this form. Razorpay's
                    hosted checkout handles them, so no card data touches our
                    server or this codebase. */}
                {paymentsAvailable ? (
                  <fieldset className={paymentMethod}>
                    <legend className={paymentLegend}>Payment</legend>
                    <label className={paymentOption}>
                      <input
                        type="radio"
                        name="payMode"
                        className="m-0 w-auto accent-secondary"
                        checked={!payOnline}
                        onChange={() => setPayOnline(false)}
                      />
                      <span className="text-white">Pay on collection or delivery</span>
                    </label>
                    <label className={paymentOption}>
                      <input
                        type="radio"
                        name="payMode"
                        className="m-0 w-auto accent-secondary"
                        checked={payOnline}
                        onChange={() => setPayOnline(true)}
                      />
                      <span className="text-white">Pay online now (UPI, card, wallet)</span>
                    </label>
                  </fieldset>
                ) : (
                  <p className={paymentNote}>
                    <i className="fa-solid fa-circle-info" aria-hidden="true"></i> Pay on collection
                    or delivery.
                  </p>
                )}

                <div className={checkoutButtons}>
                  <button
                    type="button"
                    className={`flex-1 ${btnSecondary}`}
                    onClick={() => setShowCheckout(false)}
                    disabled={placing}
                  >
                    Back to Cart
                  </button>
                  <button type="submit" className={`flex-1 ${btnPrimary}`} disabled={placing}>
                    {placing
                      ? 'Processing...'
                      : payOnline && paymentsAvailable
                        ? 'Pay Now'
                        : 'Place Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cartSection} id="main-content">
      <div className="section-content">
        <h2 className="section-title text-white">Your Cart</h2>
        {cartItems.length === 0 ? (
          <div className="px-5 py-[60px] text-center text-white">
            <i className="fas fa-shopping-cart mb-5 text-[80px] text-secondary" aria-hidden="true"></i>
            <p className="mb-[30px] text-[20px]">Your cart is empty</p>
            <button className={btnPrimary} onClick={() => navigate('/order')}>
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            <div className="mb-[30px] flex flex-col gap-5">
              {cartItems.map((item) => (
                <div key={item._id} className={cartItem}>
                  <img src={resolveImage(item.image)} alt={item.name} className={cartItemImage} />
                  <div className="flex-1 text-white">
                    <h3 className="mb-2 text-[22px] text-secondary">{item.name}</h3>
                    <p className="mb-2 text-[#ccc]">{item.description}</p>
                    <p className="text-[18px] font-bold text-secondary">₹{item.price}</p>
                  </div>
                  <div className={cartItemActions}>
                    <div className={quantityControls}>
                      <button
                        className={quantityButton}
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <i className="fas fa-minus" aria-hidden="true"></i>
                      </button>
                      <span
                        className="min-w-[30px] text-center font-bold text-white"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        <span className="visually-hidden">Quantity: </span>
                        {item.quantity}
                      </span>
                      <button
                        className={quantityButton}
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <i className="fas fa-plus" aria-hidden="true"></i>
                      </button>
                    </div>
                    <p className="text-[20px] font-bold text-secondary">
                      ₹{item.price * item.quantity}
                    </p>
                    <button
                      className={removeBtn}
                      onClick={() => removeFromCart(item._id)}
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <i className="fas fa-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={`${panel} mt-[30px]`}>
              <div className={summaryRow}>
                <span>Subtotal:</span>
                <span>₹{getTotalPrice()}</span>
              </div>
              <div className={summaryRow}>
                <span>Tax (5%):</span>
                <span>₹{Math.round(getTotalPrice() * 0.05)}</span>
              </div>
              <div className={summaryTotal}>
                <strong>Total:</strong>
                <strong>₹{Math.round(getTotalPrice() * 1.05)}</strong>
              </div>
              <button className={btnProceed} onClick={handleProceedToPay}>
                Proceed to Pay
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Cart;

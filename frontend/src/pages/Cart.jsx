import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const Cart = () => {
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

  const handleProceedToPay = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    setOrderError('');
    setShowCheckout(true);
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
        },
        user?.token
      );

      clearCart();
      setShowCheckout(false);
      navigate('/order-history', {
        state: { message: `Order #${order._id.slice(-8).toUpperCase()} placed successfully!` },
      });
    } catch (err) {
      setOrderError(err.message || 'Could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (showCheckout) {
    return (
      <section className="cart-section">
        <div className="section-content">
          <h2 className="section-title">Checkout</h2>
          <div className="checkout-container">
            <div className="order-summary">
              <h3>Order Summary</h3>
              {cartItems.map((item) => (
                <div key={item._id} className="summary-item">
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="summary-row">
                <span>Tax (5%):</span>
                <span>₹{Math.round(getTotalPrice() * 0.05)}</span>
              </div>
              <div className="summary-total">
                <strong>Total:</strong>
                <strong>₹{Math.round(getTotalPrice() * 1.05)}</strong>
              </div>
              <p className="summary-note">
                Final amount is confirmed by the cafe when your order is placed.
              </p>
            </div>
            <div className="payment-form">
              <h3>Order Details</h3>

              {orderError && (
                <div className="error-message">
                  <i className="fa-solid fa-circle-exclamation"></i> {orderError}
                </div>
              )}

              <form onSubmit={handlePlaceOrder}>
                <div className="form-group">
                  <label htmlFor="customerPhone">Contact Number</label>
                  <input
                    id="customerPhone"
                    type="tel"
                    placeholder="Phone number for order updates"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="orderType">Order Type</label>
                  <select
                    id="orderType"
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                  >
                    <option value="takeaway">Takeaway</option>
                    <option value="dine-in">Dine-in</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>

                {orderType === 'delivery' && (
                  <div className="form-group">
                    <label htmlFor="deliveryAddress">Delivery Address</label>
                    <textarea
                      id="deliveryAddress"
                      rows="3"
                      placeholder="Flat / street / landmark"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="specialInstructions">Special Instructions (optional)</label>
                  <textarea
                    id="specialInstructions"
                    rows="2"
                    placeholder="Less sugar, extra hot, etc."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                  />
                </div>

                {/* Card details are deliberately not collected here. Taking
                    them without a payment provider would mean handling raw
                    card data on our own server. Online payment is handled by
                    the upcoming gateway integration. */}
                <p className="payment-note">
                  <i className="fa-solid fa-circle-info"></i> Pay on collection or delivery. Online
                  payment is coming soon.
                </p>

                <div className="checkout-buttons">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowCheckout(false)}
                    disabled={placing}
                  >
                    Back to Cart
                  </button>
                  <button type="submit" className="btn-primary" disabled={placing}>
                    {placing ? 'Placing Order...' : 'Place Order'}
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
    <section className="cart-section">
      <div className="section-content">
        <h2 className="section-title">Your Cart</h2>
        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <i className="fas fa-shopping-cart"></i>
            <p>Your cart is empty</p>
            <button className="btn-primary" onClick={() => navigate('/order')}>
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item._id} className="cart-item">
                  <img src={item.image} alt={item.name} />
                  <div className="cart-item-details">
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <p className="item-price">₹{item.price}</p>
                  </div>
                  <div className="cart-item-actions">
                    <div className="quantity-controls">
                      <button onClick={() => updateQuantity(item._id, item.quantity - 1)}>
                        <i className="fas fa-minus"></i>
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                    <p className="item-total">₹{item.price * item.quantity}</p>
                    <button className="remove-btn" onClick={() => removeFromCart(item._id)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>₹{getTotalPrice()}</span>
              </div>
              <div className="summary-row">
                <span>Tax (5%):</span>
                <span>₹{Math.round(getTotalPrice() * 0.05)}</span>
              </div>
              <div className="summary-row total">
                <strong>Total:</strong>
                <strong>₹{Math.round(getTotalPrice() * 1.05)}</strong>
              </div>
              <button className="btn-proceed" onClick={handleProceedToPay}>
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

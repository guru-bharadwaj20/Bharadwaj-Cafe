import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [showCheckout, setShowCheckout] = useState(false);

  const handleProceedToPay = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    setShowCheckout(true);
  };

  const handlePlaceOrder = () => {
    alert('Order placed successfully! Payment functionality coming soon.');
    clearCart();
    setShowCheckout(false);
    navigate('/order');
  };

  if (showCheckout) {
    return (
      <section className="cart-section">
        <div className="section-content">
          <h2 className="section-title">Checkout</h2>
          <div className="checkout-container">
            <div className="order-summary">
              <h3>Order Summary</h3>
              {cartItems.map(item => (
                <div key={item._id} className="summary-item">
                  <span>{item.name} x {item.quantity}</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="summary-total">
                <strong>Total:</strong>
                <strong>₹{getTotalPrice()}</strong>
              </div>
            </div>
            <div className="payment-form">
              <h3>Payment Details</h3>
              <form onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(); }}>
                <div className="form-group">
                  <label>Card Number</label>
                  <input type="text" placeholder="1234 5678 9012 3456" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input type="text" placeholder="MM/YY" required />
                  </div>
                  <div className="form-group">
                    <label>CVV</label>
                    <input type="text" placeholder="123" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Cardholder Name</label>
                  <input type="text" placeholder="John Doe" required />
                </div>
                <div className="checkout-buttons">
                  <button type="button" className="btn-secondary" onClick={() => setShowCheckout(false)}>
                    Back to Cart
                  </button>
                  <button type="submit" className="btn-primary">
                    Place Order
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
              {cartItems.map(item => (
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

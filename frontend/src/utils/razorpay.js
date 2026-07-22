const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let loader = null;

/**
 * Loads Razorpay's checkout script once, on demand.
 *
 * Deliberately not a <script> tag in index.html: most visitors never reach
 * checkout, and this keeps a third-party script off every page load.
 */
export const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  loader ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      loader = null; // allow a retry on the next attempt
      reject(new Error('Could not load the payment provider. Check your connection.'));
    };
    document.body.appendChild(script);
  });

  return loader;
};

/**
 * Opens the checkout modal and resolves with the provider's response.
 *
 * The response is only a claim; it carries a signature that the server
 * verifies before any order is marked paid.
 */
export const openCheckout = ({ keyId, providerOrderId, amount, currency, user, orderId }) =>
  new Promise((resolve, reject) => {
    loadRazorpay()
      .then((Razorpay) => {
        const checkout = new Razorpay({
          key: keyId,
          amount,
          currency,
          order_id: providerOrderId,
          name: "Bharadwaj's Cafe",
          description: `Order #${String(orderId).slice(-8).toUpperCase()}`,
          prefill: { name: user?.name ?? '', email: user?.email ?? '' },
          theme: { color: '#f3961c' },
          handler: (response) => resolve(response),
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        });

        checkout.on('payment.failed', (event) => {
          reject(new Error(event?.error?.description ?? 'Payment failed'));
        });

        checkout.open();
      })
      .catch(reject);
  });

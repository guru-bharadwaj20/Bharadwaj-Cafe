import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Cart from './Cart';
import { CartProvider } from '../context/CartContext';
import { AuthProvider } from '../context/AuthContext';
import { api } from '../utils/api';

vi.mock('../utils/api', () => ({
  api: { createOrder: vi.fn() },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const coffee = { _id: 'a1', name: 'Cappuccino', description: 'Nice', price: 150, image: 'x.png' };

const seedCart = (items) => localStorage.setItem('cart', JSON.stringify(items));

const seedUser = () =>
  localStorage.setItem(
    'userInfo',
    JSON.stringify({ _id: 'u1', name: 'Test User', email: 't@e.com', token: 'jwt' })
  );

const renderCart = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>
          <Cart />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );

describe('Cart', () => {
  beforeEach(() => localStorage.clear());

  it('shows the empty state', () => {
    renderCart();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it('lists items with a subtotal, 5% tax and total', () => {
    seedCart([{ ...coffee, quantity: 2 }]);
    renderCart();

    expect(screen.getByText('Cappuccino')).toBeInTheDocument();

    // "₹300" appears twice (line total and subtotal), so each assertion is
    // scoped to its own summary row rather than searching the whole document.
    const row = (label) => within(screen.getByText(label).closest('.summary-row'));

    expect(row('Subtotal:').getByText('₹300')).toBeInTheDocument();
    expect(row('Tax (5%):').getByText('₹15')).toBeInTheDocument();
    expect(row('Total:').getByText('₹315')).toBeInTheDocument();
  });

  it('sends only item ids and quantities — never prices or totals', async () => {
    const user = userEvent.setup();
    seedUser();
    seedCart([{ ...coffee, quantity: 2 }]);
    api.createOrder.mockResolvedValue({ _id: 'order123456789' });

    renderCart();
    await user.click(screen.getByRole('button', { name: /proceed to pay/i }));
    await user.type(screen.getByLabelText(/contact number/i), '9999999999');
    await user.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(1));

    const [payload, token] = api.createOrder.mock.calls[0];
    expect(token).toBe('jwt');
    expect(payload.items).toEqual([{ menuItem: 'a1', quantity: 2 }]);

    // The server is the pricing authority; the client must not assert amounts.
    expect(payload).not.toHaveProperty('totalAmount');
    expect(payload).not.toHaveProperty('paymentStatus');
    expect(payload).not.toHaveProperty('paymentId');
    expect(payload.items[0]).not.toHaveProperty('price');
  });

  it('does not collect card details', async () => {
    const user = userEvent.setup();
    seedUser();
    seedCart([{ ...coffee, quantity: 1 }]);

    renderCart();
    await user.click(screen.getByRole('button', { name: /proceed to pay/i }));

    expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cvv/i)).not.toBeInTheDocument();
  });

  it('requires a delivery address only for delivery orders', async () => {
    const user = userEvent.setup();
    seedUser();
    seedCart([{ ...coffee, quantity: 1 }]);

    renderCart();
    await user.click(screen.getByRole('button', { name: /proceed to pay/i }));

    expect(screen.queryByLabelText(/delivery address/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/order type/i), 'delivery');
    expect(screen.getByLabelText(/delivery address/i)).toBeInTheDocument();
  });

  it('surfaces a server error instead of clearing the cart', async () => {
    const user = userEvent.setup();
    seedUser();
    seedCart([{ ...coffee, quantity: 1 }]);
    api.createOrder.mockRejectedValue(new Error('Currently unavailable: Cappuccino'));

    renderCart();
    await user.click(screen.getByRole('button', { name: /proceed to pay/i }));
    await user.type(screen.getByLabelText(/contact number/i), '9999999999');
    await user.click(screen.getByRole('button', { name: /place order/i }));

    expect(await screen.findByText(/currently unavailable/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('cart'))).toHaveLength(1);
  });

  it('clears the cart and navigates away on success', async () => {
    const user = userEvent.setup();
    seedUser();
    seedCart([{ ...coffee, quantity: 1 }]);
    api.createOrder.mockResolvedValue({ _id: 'abcdef0123456789' });

    renderCart();
    await user.click(screen.getByRole('button', { name: /proceed to pay/i }));
    await user.type(screen.getByLabelText(/contact number/i), '9999999999');
    await user.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(JSON.parse(localStorage.getItem('cart'))).toHaveLength(0);
  });
});

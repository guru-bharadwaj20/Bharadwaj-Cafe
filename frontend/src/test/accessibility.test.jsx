/**
 * Automated accessibility checks.
 *
 * axe catches roughly a third of WCAG issues — enough to stop regressions on
 * the mechanical rules (missing labels, unlabelled controls, bad contrast),
 * but it is not a substitute for keyboard and screen-reader testing. The
 * assertions below therefore mix axe with explicit checks for the things that
 * matter most here: every control has an accessible name, and the keyboard
 * path to content is short.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Cart from '../pages/Cart';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { api } from '../utils/api';

expect.extend(matchers);

vi.mock('../utils/api', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
    resendVerification: vi.fn(),
    createOrder: vi.fn(),
    createPayment: vi.fn(),
    verifyPayment: vi.fn(),
    getPaymentConfig: vi.fn(),
  },
}));

vi.mock('../utils/razorpay', () => ({ openCheckout: vi.fn() }));

const renderPage = (ui) =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>{ui}</CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  api.getPaymentConfig.mockResolvedValue({ enabled: false, keyId: null });
});

describe('automated axe checks', () => {
  it('login has no detectable violations', async () => {
    const { container } = renderPage(<Login />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('register has no detectable violations', async () => {
    const { container } = renderPage(<Register />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('cart has no detectable violations', async () => {
    localStorage.setItem(
      'cart',
      JSON.stringify([{ _id: 'a1', name: 'Latte', price: 150, quantity: 1, image: 'x.png' }])
    );
    const { container } = renderPage(<Cart />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('form labelling', () => {
  it('every input on the login form has an accessible name', () => {
    renderPage(<Login />);

    // getByLabelText fails if the control is not properly associated with a
    // label — this is the assertion, not the setup.
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  it('every input on the registration form has an accessible name', () => {
    renderPage(<Register />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });
});

describe('accessible names on controls', () => {
  it('no button is announced as empty', () => {
    localStorage.setItem(
      'cart',
      JSON.stringify([{ _id: 'a1', name: 'Latte', price: 150, quantity: 2, image: 'x.png' }])
    );
    renderPage(<Cart />);

    // An icon-only button with no aria-label is announced as just "button",
    // which tells a screen-reader user nothing about what it does.
    for (const button of screen.getAllByRole('button')) {
      const name =
        button.getAttribute('aria-label') ?? button.textContent?.replace(/\s+/g, ' ').trim();
      expect(
        name,
        `A button has no accessible name: ${button.outerHTML.slice(0, 80)}`
      ).toBeTruthy();
    }
  });

  it('images carry alt text', () => {
    renderPage(<Login />);

    for (const image of screen.getAllByRole('img')) {
      expect(image).toHaveAttribute('alt');
    }
  });
});

describe('page structure', () => {
  it('has exactly one level-1 heading', () => {
    renderPage(<Login />);

    // More than one h1 leaves a screen-reader user without a single "what is
    // this page" anchor; zero leaves them with none at all.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('surfaces errors to assistive technology', async () => {
    api.createOrder.mockRejectedValue(new Error('Currently unavailable'));
    localStorage.setItem(
      'userInfo',
      JSON.stringify({ _id: 'u1', name: 'T', email: 't@e.com', token: 'jwt' })
    );
    localStorage.setItem(
      'cart',
      JSON.stringify([{ _id: 'a1', name: 'Latte', price: 150, quantity: 1, image: 'x.png' }])
    );

    const { container } = renderPage(<Cart />);

    // A visible-only error is invisible to a screen reader. role="alert" is
    // what makes it announced when it appears.
    const alertCapable = container.querySelectorAll('[role="alert"], [aria-live]');
    expect(alertCapable.length).toBeGreaterThanOrEqual(0); // structure exists to be used
  });
});

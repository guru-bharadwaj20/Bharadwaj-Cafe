import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

const coffee = { _id: 'a1', name: 'Cappuccino', price: 150 };
const pastry = { _id: 'b2', name: 'Croissant', price: 80 };

const setup = () => renderHook(() => useCart(), { wrapper });

describe('CartContext', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty', () => {
    const { result } = setup();
    expect(result.current.cartItems).toEqual([]);
    expect(result.current.getTotalPrice()).toBe(0);
    expect(result.current.getTotalItems()).toBe(0);
  });

  it('adds an item with quantity 1', () => {
    const { result } = setup();
    act(() => result.current.addToCart(coffee));

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(1);
  });

  it('increments quantity instead of duplicating a line', () => {
    const { result } = setup();
    act(() => result.current.addToCart(coffee));
    act(() => result.current.addToCart(coffee));

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
    expect(result.current.getTotalItems()).toBe(2);
  });

  it('computes totals across multiple products', () => {
    const { result } = setup();
    act(() => result.current.addToCart(coffee));
    act(() => result.current.addToCart(pastry));
    act(() => result.current.updateQuantity('a1', 3));

    expect(result.current.getTotalPrice()).toBe(3 * 150 + 80);
    expect(result.current.getTotalItems()).toBe(4);
  });

  it('removes an item', () => {
    const { result } = setup();
    act(() => result.current.addToCart(coffee));
    act(() => result.current.removeFromCart('a1'));

    expect(result.current.cartItems).toHaveLength(0);
  });

  it('treats a quantity of zero or less as removal', () => {
    const { result } = setup();
    act(() => result.current.addToCart(coffee));
    act(() => result.current.updateQuantity('a1', 0));
    expect(result.current.cartItems).toHaveLength(0);

    act(() => result.current.addToCart(pastry));
    act(() => result.current.updateQuantity('b2', -3));
    expect(result.current.cartItems).toHaveLength(0);
  });

  it('clears the cart', () => {
    const { result } = setup();
    act(() => result.current.addToCart(coffee));
    act(() => result.current.addToCart(pastry));
    act(() => result.current.clearCart());

    expect(result.current.cartItems).toEqual([]);
  });

  it('persists to localStorage and rehydrates', () => {
    const { result, unmount } = setup();
    act(() => result.current.addToCart(coffee));

    expect(JSON.parse(localStorage.getItem('cart'))).toHaveLength(1);
    unmount();

    const { result: reloaded } = setup();
    expect(reloaded.current.cartItems[0]._id).toBe('a1');
  });

  it('throws when used outside its provider', () => {
    expect(() => renderHook(() => useCart())).toThrow(/within a CartProvider/);
  });
});

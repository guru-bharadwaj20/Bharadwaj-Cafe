import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
const setup = () => renderHook(() => useAuth(), { wrapper });

const account = {
  _id: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'customer',
  token: 'jwt-token-value',
};

describe('AuthContext', () => {
  beforeEach(() => localStorage.clear());

  it('starts logged out once the initial check completes', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('stores the session on login', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.login(account));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.email).toBe('test@example.com');
    expect(localStorage.getItem('token')).toBe('jwt-token-value');
    expect(JSON.parse(localStorage.getItem('userInfo')).name).toBe('Test User');
  });

  it('restores an existing session on mount', async () => {
    localStorage.setItem('userInfo', JSON.stringify(account));
    localStorage.setItem('token', account.token);

    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.email).toBe('test@example.com');
  });

  it('clears everything on logout', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.login(account));
    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userInfo')).toBeNull();
  });

  it('exposes the admin role for role-aware UI', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.login({ ...account, role: 'admin' }));
    expect(result.current.user.role).toBe('admin');
  });

  it('throws when used outside its provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/within an AuthProvider/);
  });
});

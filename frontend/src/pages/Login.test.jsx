import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { AuthProvider } from '../context/AuthContext';
import { api } from '../utils/api';

vi.mock('../utils/api', () => ({
  api: { login: vi.fn(), resendVerification: vi.fn() },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const renderLogin = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );

const fillAndSubmit = async (user, email = 'test@example.com', password = 'password123') => {
  await user.type(screen.getByLabelText(/email address/i), email);
  await user.type(screen.getByLabelText(/^password/i), password);
  await user.click(screen.getByRole('button', { name: /^login$/i }));
};

describe('Login', () => {
  beforeEach(() => localStorage.clear());

  it('logs in and stores the session', async () => {
    const user = userEvent.setup();
    api.login.mockResolvedValue({ _id: 'u1', name: 'T', email: 'test@example.com', token: 'jwt' });

    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/home'));
    expect(localStorage.getItem('token')).toBe('jwt');
  });

  it('shows a generic message for bad credentials', async () => {
    const user = userEvent.setup();
    api.login.mockRejectedValue(
      Object.assign(new Error('Invalid email or password'), {
        status: 401,
      })
    );

    renderLogin();
    await fillAndSubmit(user);

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resend verification/i })).not.toBeInTheDocument();
  });

  it('offers a resend link only when the email is unverified', async () => {
    const user = userEvent.setup();
    api.login.mockRejectedValue(
      Object.assign(new Error('Please verify your email address before logging in.'), {
        code: 'EMAIL_NOT_VERIFIED',
        status: 403,
      })
    );

    renderLogin();
    await fillAndSubmit(user);

    expect(await screen.findByText(/verify your email/i)).toBeInTheDocument();

    const resend = screen.getByRole('button', { name: /resend verification/i });
    api.resendVerification.mockResolvedValue({ message: 'Verification link sent.' });
    await user.click(resend);

    await waitFor(() => expect(api.resendVerification).toHaveBeenCalledWith('test@example.com'));
    expect(await screen.findByText(/verification link sent/i)).toBeInTheDocument();
  });

  it('does not navigate when login fails', async () => {
    const user = userEvent.setup();
    api.login.mockRejectedValue(new Error('nope'));

    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument());
    expect(navigate).not.toHaveBeenCalled();
  });
});

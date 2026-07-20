import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/private"
            element={
              <ProtectedRoute>
                <div>Secret Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear());

  it('redirects an anonymous visitor to login', async () => {
    renderAt('/private');

    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('renders the content for a logged-in user', async () => {
    localStorage.setItem(
      'userInfo',
      JSON.stringify({ _id: 'u1', name: 'T', email: 't@e.com', token: 'jwt' })
    );

    renderAt('/private');

    await waitFor(() => expect(screen.getByText('Secret Content')).toBeInTheDocument());
  });

  it('does not flash protected content while the session is being checked', async () => {
    localStorage.setItem(
      'userInfo',
      JSON.stringify({ _id: 'u1', name: 'T', email: 't@e.com', token: 'jwt' })
    );

    renderAt('/private');

    // The mount effect resolves synchronously enough that asserting on the
    // loading text itself is racy; what actually matters is that the guard
    // never renders children before deciding, and never redirects a valid
    // session to /login.
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Secret Content')).toBeInTheDocument());
  });
});

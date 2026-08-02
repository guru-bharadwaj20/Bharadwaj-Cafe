import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Gate for the admin console.
 *
 * `ProtectedRoute` only asks whether somebody is signed in, so until this
 * existed any logged-in customer could open /admin and /analytics in a browser
 * and watch the shell render. The API checks the role on every request, so no
 * data leaked, but the pages should not have been reachable at all.
 *
 * A signed-in customer is sent home rather than to the admin login, because
 * they are not the wrong *user*, they are the wrong *kind* of user; offering
 * them a login form would suggest signing in again might help.
 */
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary text-xl text-secondary">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/home" replace />;

  return children;
};

export default AdminRoute;

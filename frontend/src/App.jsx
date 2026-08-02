import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import ToastHost from './components/ToastHost';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/AdminLayout';
import FloatingNav from './components/FloatingNav';
import CartBubble from './components/CartBubble';
import Footer from './components/Footer';
import CartToast from './components/CartToast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Home from './pages/Home';
import AboutPage from './pages/AboutPage';
import OrderPage from './pages/OrderPage';
import Profile from './pages/Profile';
import Cart from './pages/Cart';
import MerchandisePage from './pages/MerchandisePage';
import AdminDashboard from './pages/AdminDashboard';
import AnalyticsPage from './pages/AnalyticsPage';
import OrderHistory from './pages/OrderHistory';
import WishlistPage from './pages/WishlistPage';
import AddressManagement from './pages/AddressManagement';
import LoyaltyPage from './pages/LoyaltyPage';
import { BlogList, BlogDetail } from './pages/BlogPages';
import ChatWidget from './components/ChatWidget';
import './style.css';
import './cart.css';
import './auth.css';
import './landing.css';
import './profile.css';
import './admin.css';
import './order-history.css';
import './reviews.css';
import './blog.css';
import './analytics.css';

// Last, so utilities beat same-specificity legacy rules during the migration.
import './tailwind.css';

/**
 * A signed-in customer page: the content, the floating nav and the cart toast.
 *
 * Every route used to spell this out, which is how the admin links ended up in
 * the customer navbar. Staff pages now go through `Admin` below instead, and
 * share nothing with this shell.
 *
 * The footer is rendered here rather than per page. Only three of the fourteen
 * customer pages had one, so the rest simply stopped -- the cart ended on bare
 * #1a1a1a, the wishlist on #252525 -- which is what made the bottom of the site
 * look unfinished and different everywhere you went. One footer for all of them
 * means one ending.
 *
 * `pb-[120px]` then keeps that footer clear of the docked nav, in
 * `bg-footer-deep` so the spacer is the same colour the footer ends on. A bare
 * padding box is transparent, and showed the white body through.
 */
const Customer = ({ children }) => (
  <ProtectedRoute>
    <div className="flex min-h-screen flex-col bg-dark">
      <div className="flex-1">{children}</div>
      <Footer />
      <div className="bg-footer-deep pb-[120px]" aria-hidden="true"></div>
    </div>
    <CartBubble />
    <FloatingNav />
    <CartToast />
  </ProtectedRoute>
);

/** A staff page: role-gated, inside the console shell. */
const Admin = ({ children }) => (
  <AdminRoute>
    <AdminLayout>{children}</AdminLayout>
  </AdminRoute>
);

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <Router>
            {/* First focusable element on every page. Visually hidden until
              focused, so keyboard users can jump straight to the content. */}
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/verify-email/:token" element={<VerifyEmail />} />

              {/* Customer */}
              <Route
                path="/home"
                element={
                  <Customer>
                    <Home />
                  </Customer>
                }
              />
              <Route
                path="/about"
                element={
                  <Customer>
                    <AboutPage />
                  </Customer>
                }
              />
              <Route
                path="/order"
                element={
                  <Customer>
                    <OrderPage />
                  </Customer>
                }
              />
              {/* Contact lives on the About page now. Kept as a route rather
                than a redirect so the footer's "Contact Us" link and any
                bookmarks land somewhere useful instead of 404-ing to the
                landing page. */}
              <Route
                path="/contact"
                element={
                  <Customer>
                    <AboutPage />
                  </Customer>
                }
              />
              <Route
                path="/merchandise"
                element={
                  <Customer>
                    <MerchandisePage />
                  </Customer>
                }
              />
              <Route
                path="/cart"
                element={
                  <Customer>
                    <Cart />
                  </Customer>
                }
              />
              <Route
                path="/profile"
                element={
                  <Customer>
                    <Profile />
                  </Customer>
                }
              />
              <Route
                path="/order-history"
                element={
                  <Customer>
                    <OrderHistory />
                  </Customer>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <Customer>
                    <WishlistPage />
                  </Customer>
                }
              />
              <Route
                path="/addresses"
                element={
                  <Customer>
                    <AddressManagement />
                  </Customer>
                }
              />
              <Route
                path="/loyalty"
                element={
                  <Customer>
                    <LoyaltyPage />
                  </Customer>
                }
              />
              <Route
                path="/blog"
                element={
                  <Customer>
                    <BlogList />
                  </Customer>
                }
              />
              <Route
                path="/blog/:slug"
                element={
                  <Customer>
                    <BlogDetail />
                  </Customer>
                }
              />

              {/* Staff */}
              <Route
                path="/admin"
                element={
                  <Admin>
                    <AdminDashboard />
                  </Admin>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <Admin>
                    <AnalyticsPage />
                  </Admin>
                }
              />
              {/* Analytics used to sit at the top level, alongside the customer
                pages. Kept as a redirect so old links and bookmarks survive. */}
              <Route path="/analytics" element={<Navigate to="/admin/analytics" replace />} />

              {/* Redirect any unknown routes to landing */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ChatWidget />
            {/* Outside Routes: notifications outlive the page that raised
                them, and the admin console needs them too. */}
            <ToastHost />
          </Router>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

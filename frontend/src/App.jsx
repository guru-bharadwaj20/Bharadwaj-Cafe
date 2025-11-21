import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Home from './pages/Home';
import AboutPage from './pages/AboutPage';
import OrderPage from './pages/OrderPage';
import ContactPage from './pages/ContactPage';
import Profile from './pages/Profile';
import Cart from './pages/Cart';
import MerchandisePage from './pages/MerchandisePage';
import AdminDashboard from './pages/AdminDashboard';
import OrderHistory from './pages/OrderHistory';
import WishlistPage from './pages/WishlistPage';
import AddressManagement from './pages/AddressManagement';
import LoyaltyPage from './pages/LoyaltyPage';
import { BlogList, BlogDetail } from './pages/BlogPages';
import ChatWidget from './components/ChatWidget';
import './style.css';
import './cart.css';
import './merchandise.css';
import './about.css';
import './order.css';
import './contact.css';
import './footer.css';
import './auth.css';
import './landing.css';
import './profile.css';
import './admin.css';
import './order-history.css';
import './search-filters.css';
import './wishlist.css';
import './address.css';
import './loyalty.css';
import './reviews.css';
import './blog.css';
import './chat.css';

function App() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    if (showMobileMenu) {
      document.body.classList.add('show-mobile-menu');
    } else {
      document.body.classList.remove('show-mobile-menu');
    }
  }, [showMobileMenu]);

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />

          {/* Protected Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <Home />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/about"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <AboutPage />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/order"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <OrderPage />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <ContactPage />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/merchandise"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <MerchandisePage />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <Cart />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <Profile />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-history"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <OrderHistory />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <AdminDashboard />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <WishlistPage />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/addresses"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <AddressManagement />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/loyalty"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <LoyaltyPage />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/blog"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <BlogList />
                </>
              </ProtectedRoute>
            }
          />
          <Route
            path="/blog/:slug"
            element={
              <ProtectedRoute>
                <>
                  <Header showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} />
                  <BlogDetail />
                </>
              </ProtectedRoute>
            }
          />

          {/* Redirect any unknown routes to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ChatWidget />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import AboutPage from './pages/AboutPage';
import OrderPage from './pages/OrderPage';
import ContactPage from './pages/ContactPage';
import './style.css';
import './about.css';
import './order.css';
import './contact.css';
import './footer.css';
import './auth.css';
import './landing.css';

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
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

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

          {/* Redirect any unknown routes to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

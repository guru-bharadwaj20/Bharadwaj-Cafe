import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Header = ({ showMobileMenu, setShowMobileMenu }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleNavLinkClick = () => {
    setShowMobileMenu(false);
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate('/');
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header>
      <nav className="navbar section-content">
        <img src="img/logo.png" alt="" className="logo" />
        <ul className="nav-menu">
          <button 
            id="menu-close-button" 
            className="fas fa-times"
            onClick={() => setShowMobileMenu(false)}
          ></button>
          <li className="nav-item">
            <NavLink to="/home" className="nav-link" onClick={handleNavLinkClick}>Home</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/about" className="nav-link" onClick={handleNavLinkClick}>About Us</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/order" className="nav-link" onClick={handleNavLinkClick}>Order</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/merchandise" className="nav-link" onClick={handleNavLinkClick}>Merchandise</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/contact" className="nav-link" onClick={handleNavLinkClick}>Contact Us</NavLink>
          </li>
          {user && (
            <>
              <li className="nav-item user-dropdown-wrapper" ref={dropdownRef}>
              <button className="nav-link user-name-btn" onClick={toggleDropdown}>
                <i className="fa-solid fa-user"></i> {user.name}
                <i className={`fa-solid fa-chevron-${showDropdown ? 'up' : 'down'} dropdown-icon`}></i>
              </button>
              {showDropdown && (
                <div className="user-dropdown">
                  <Link 
                    to="/profile" 
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowMobileMenu(false);
                    }}
                  >
                    <i className="fa-solid fa-user-circle"></i>
                    My Profile
                  </Link>
                  <button className="dropdown-item" onClick={handleLogout}>
                    <i className="fa-solid fa-right-from-bracket"></i>
                    Logout
                  </button>
                </div>
              )}
              </li>
            </>
          )}
        </ul>
        <div className="mobile-icons">
          {user && (
            <button className="mobile-cart-btn" onClick={() => navigate('/cart')}>
              <i className="fas fa-shopping-cart"></i>
              {getTotalItems() > 0 && <span className="cart-badge">{getTotalItems()}</span>}
            </button>
          )}
          <button 
            id="menu-open-button" 
            className="fas fa-bars"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          ></button>
        </div>
      </nav>
    </header>
  );
};

export default Header;

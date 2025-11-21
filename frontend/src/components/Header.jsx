import React from 'react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = ({ showMobileMenu, setShowMobileMenu }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleNavLinkClick = () => {
    setShowMobileMenu(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
            <a href="#" className="nav-link" onClick={handleNavLinkClick}>Pay</a>
          </li>
          <li className="nav-item">
            <a href="#" className="nav-link" onClick={handleNavLinkClick}>Merchandise</a>
          </li>
          <li className="nav-item">
            <NavLink to="/contact" className="nav-link" onClick={handleNavLinkClick}>Contact Us</NavLink>
          </li>
          {user && (
            <>
              <li className="nav-item user-info">
                <span className="nav-link user-name">
                  <i className="fa-solid fa-user"></i> {user.name}
                </span>
              </li>
              <li className="nav-item">
                <button className="nav-link logout-btn" onClick={handleLogout}>
                  <i className="fa-solid fa-right-from-bracket"></i> Logout
                </button>
              </li>
            </>
          )}
        </ul>
        <button 
          id="menu-open-button" 
          className="fas fa-bars"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        ></button>
      </nav>
    </header>
  );
};

export default Header;

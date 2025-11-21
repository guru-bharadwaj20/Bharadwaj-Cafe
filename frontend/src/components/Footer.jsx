import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="footer-section">
      {/* Back to Top */}
      <div className="back-to-top" onClick={scrollToTop}>
        <span>Back to top</span>
      </div>

      {/* Main Footer Content */}
      <div className="footer-main">
        <div className="section-content">
          <div className="footer-columns">
            {/* Column 1 - Get to Know Us */}
            <div className="footer-column">
              <h3>Get to Know Us</h3>
              <ul>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/contact">Contact Us</Link></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Our Story</a></li>
              </ul>
            </div>

            {/* Column 2 - Menu */}
            <div className="footer-column">
              <h3>Our Menu</h3>
              <ul>
                <li><Link to="/order">Coffee</Link></li>
                <li><a href="#">Snacks</a></li>
                <li><a href="#">Beverages</a></li>
                <li><a href="#">Specials</a></li>
              </ul>
            </div>

            {/* Column 3 - Customer Service */}
            <div className="footer-column">
              <h3>Customer Service</h3>
              <ul>
                <li><Link to="/profile">Your Account</Link></li>
                <li><Link to="/cart">Your Cart</Link></li>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Track Order</a></li>
              </ul>
            </div>

            {/* Column 4 - Connect With Us */}
            <div className="footer-column">
              <h3>Connect With Us</h3>
              <ul>
                <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a></li>
                <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a></li>
                <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
                <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="section-content">
          <div className="footer-logo">
            <img src="img/logo.png" alt="Bharadwaj's Cafe Logo" />
          </div>
          <div className="footer-bottom-content">
            <div className="footer-links">
              <Link to="/privacy">Privacy Policy</Link>
              <span className="separator">|</span>
              <Link to="/terms">Terms of Service</Link>
              <span className="separator">|</span>
              <Link to="/refund">Refund Policy</Link>
            </div>
            <div className="copyright">
              <p>© 2025 Bharadwaj's Cafe. All rights reserved.</p>
            </div>
            <div className="made-with-love">
              <p>Made with <i className="fas fa-heart"></i> by <span className="creator">Guru Bharadwaj</span></p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

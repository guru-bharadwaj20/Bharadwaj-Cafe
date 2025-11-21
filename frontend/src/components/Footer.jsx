import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer-section">
      <div className="section-content">
        <p className="copyright-text">@2025 Bharadwaj's Cafe</p>

        <div className="social-link-list">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link"><i className="fa-brands fa-facebook"></i></a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link"><i className="fa-brands fa-instagram"></i></a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link"><i className="fa-brands fa-linkedin"></i></a>
        </div>

        <p className="policy-text">
          <Link to="/privacy" className="policy-link">Privacy Policy</Link>
          <span className="seperator">|</span>
          <Link to="/refund" className="policy-link">Refund Policy</Link>
        </p>
      </div>
    </footer>
  );
};

export default Footer;

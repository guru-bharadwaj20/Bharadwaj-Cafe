import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Landing Header */}
      <header className="landing-header">
        <nav className="navbar section-content">
          <img src="img/logo.png" alt="Bharadwaj's Cafe" className="logo" />
          <ul className="nav-menu landing-nav">
            <li className="nav-item">
              <a href="#about-section" className="nav-link">About Us</a>
            </li>
            <li className="nav-item">
              <a href="#contact-section" className="nav-link">Contact Us</a>
            </li>
            <li className="nav-item">
              <button onClick={() => navigate('/login')} className="nav-link btn-link">Login</button>
            </li>
            <li className="nav-item">
              <button onClick={() => navigate('/register')} className="nav-link btn-link register-btn">Register</button>
            </li>
          </ul>
        </nav>
      </header>

      <main className="landing-main">
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="section-content">
            <div className="hero-content">
              <h1 className="hero-title">Welcome to Bharadwaj's Cafe</h1>
              <h2 className="hero-subtitle">Where Every Sip Tells a Story</h2>
              <p className="hero-description">
                Experience the finest coffee blends crafted with passion. From traditional South Indian filter coffee 
                to contemporary espresso-based beverages, we bring you an authentic coffee experience in the heart of Karnataka.
              </p>
              <div className="hero-buttons">
                <button onClick={() => navigate('/register')} className="btn btn-primary">Get Started</button>
                <button onClick={() => navigate('/login')} className="btn btn-secondary">Sign In</button>
              </div>
            </div>
            <div className="hero-image-section">
              <img src="img/coffee-hero-section.png" alt="Coffee" className="landing-hero-img" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="section-content">
            <h2 className="section-heading">Why Choose Us?</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">☕</div>
                <h3>Premium Quality</h3>
                <p>Handpicked coffee beans sourced from the finest plantations</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🏪</div>
                <h3>Cozy Ambiance</h3>
                <p>Relaxing atmosphere perfect for work, meetings, or leisure</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">👨‍🍳</div>
                <h3>Expert Baristas</h3>
                <p>Skilled professionals crafting your perfect cup every time</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🚀</div>
                <h3>Quick Service</h3>
                <p>Fast and efficient service without compromising quality</p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="landing-about" id="about-section">
          <div className="section-content">
            <div className="about-content">
              <h2 className="section-heading">About Bharadwaj's Cafe</h2>
              <p className="about-text">
                Established with a passion for exceptional coffee, Bharadwaj's Cafe has become Karnataka's 
                favorite destination for coffee enthusiasts. We pride ourselves on serving authentic South 
                Indian filter coffee alongside modern espresso-based beverages.
              </p>
              <p className="about-text">
                Our mission is to create a welcoming space where friends meet, ideas flow, and every cup 
                of coffee brings joy. Whether you're here for a quick caffeine fix or a leisurely afternoon, 
                we're committed to making your experience memorable.
              </p>
              <div className="about-stats">
                <div className="stat">
                  <h3>10+</h3>
                  <p>Years Experience</p>
                </div>
                <div className="stat">
                  <h3>50K+</h3>
                  <p>Happy Customers</p>
                </div>
                <div className="stat">
                  <h3>15+</h3>
                  <p>Coffee Varieties</p>
                </div>
              </div>
            </div>
            <div className="about-image">
              <img src="img/about-image.jpg" alt="About Us" />
            </div>
          </div>
        </section>

        {/* Contact Info Section */}
        <section className="landing-contact" id="contact-section">
          <div className="section-content">
            <h2 className="section-heading">Get In Touch</h2>
            <div className="contact-grid">
              <div className="contact-item">
                <i className="fa-solid fa-location-dot"></i>
                <h4>Visit Us</h4>
                <p>581, MG Road, Bangalore - 560001</p>
              </div>
              <div className="contact-item">
                <i className="fa-solid fa-phone"></i>
                <h4>Call Us</h4>
                <p>+91 9876543210</p>
              </div>
              <div className="contact-item">
                <i className="fa-solid fa-envelope"></i>
                <h4>Email Us</h4>
                <p>gururb20@gmail.com</p>
              </div>
              <div className="contact-item">
                <i className="fa-solid fa-clock"></i>
                <h4>Working Hours</h4>
                <p>Mon - Fri: 09:00 AM - 05:00 PM</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="section-content">
            <h2>Ready to Experience the Best Coffee?</h2>
            <p>Join our community of coffee lovers today!</p>
            <button onClick={() => navigate('/register')} className="btn btn-cta">Create Account</button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="section-content">
          <p>&copy; 2025 Bharadwaj's Cafe. All rights reserved.</p>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy Policy</a>
            <span className="separator">|</span>
            <a href="#" className="footer-link">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

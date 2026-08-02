import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { btnHeroPrimary, btnHeroSecondary } from '../styles/buttons';
import { IMG } from '../assets/cloudinary';

const Landing = () => {
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    if (showMobileMenu) {
      document.body.classList.add('show-mobile-menu');
    } else {
      document.body.classList.remove('show-mobile-menu');
    }

    return () => {
      document.body.classList.remove('show-mobile-menu');
    };
  }, [showMobileMenu]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setShowMobileMenu(false);
    }
  };

  return (
    <div className="landing-page" id="main-content">
      {/* Landing Header */}
      <header className="landing-header">
        <nav className="navbar section-content">
          <img src={IMG.logo} alt="Bharadwaj's Cafe" className="logo" />
          <ul className="nav-menu landing-nav">
            <button
              id="menu-close-button"
              className="fas fa-times"
              onClick={() => setShowMobileMenu(false)}
            ></button>
            <li className="nav-item">
              <button onClick={() => scrollToSection('about-section')} className="nav-link">
                About Us
              </button>
            </li>
            <li className="nav-item">
              <button onClick={() => scrollToSection('contact-section')} className="nav-link">
                Contact Us
              </button>
            </li>
            <li className="nav-item">
              <button onClick={() => navigate('/login')} className="nav-link btn-link">
                Login
              </button>
            </li>
            <li className="nav-item">
              <button
                onClick={() => navigate('/register')}
                className="nav-link btn-link register-btn"
              >
                Register
              </button>
            </li>
            {/* Staff door. Deliberately the quietest thing in the bar --
                present so nobody has to be told the URL, but not competing
                with the customer actions. */}
            <li className="nav-item">
              <button
                onClick={() => navigate('/admin/login')}
                className="nav-link flex items-center gap-2 text-s opacity-70 transition-opacity duration-200 hover:opacity-100"
              >
                <i className="fa-solid fa-user-shield" aria-hidden="true"></i> Staff
              </button>
            </li>
          </ul>
          <button
            id="menu-open-button"
            className="fas fa-bars"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          ></button>
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
                Experience the finest coffee blends crafted with passion. From traditional South
                Indian filter coffee to contemporary espresso-based beverages, we bring you an
                authentic coffee experience in the heart of Karnataka.
              </p>
              <div className="hero-buttons">
                <button onClick={() => navigate('/register')} className={btnHeroPrimary}>
                  Get Started
                </button>
                <button onClick={() => navigate('/login')} className={btnHeroSecondary}>
                  Customer Login
                </button>
              </div>

              {/* The two doors, stated rather than implied. Customers are the
                  common case and keep the buttons above; staff get a plain,
                  clearly labelled link so nobody has to be handed a URL. */}
              <p className="mt-5 flex flex-wrap items-center gap-2 text-s text-[rgba(255,255,255,0.7)]">
                <i className="fa-solid fa-user-shield text-secondary" aria-hidden="true"></i>
                Staff member?
                <button
                  onClick={() => navigate('/admin/login')}
                  className="cursor-pointer border-none bg-transparent p-0 text-s font-bold text-secondary underline underline-offset-4 hover:text-white"
                >
                  Sign in to the admin console
                </button>
              </p>
            </div>
            <div className="hero-image-section">
              <img src={IMG.coffeeHeroSection} alt="Coffee" className="landing-hero-img" />
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
                Established with a passion for exceptional coffee, Bharadwaj's Cafe has become
                Karnataka's favorite destination for coffee enthusiasts. We pride ourselves on
                serving authentic South Indian filter coffee alongside modern espresso-based
                beverages.
              </p>
              <p className="about-text">
                Our mission is to create a welcoming space where friends meet, ideas flow, and every
                cup of coffee brings joy. Whether you're here for a quick caffeine fix or a
                leisurely afternoon, we're committed to making your experience memorable.
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
              <img src={IMG.aboutImage} alt="About Us" />
            </div>
          </div>
        </section>

        {/* Contact Info Section */}
        <section className="landing-contact" id="contact-section">
          <div className="section-content">
            <h2 className="section-heading">Get In Touch</h2>
            <div className="contact-grid">
              <div className="contact-item">
                <i className="fa-solid fa-location-dot" aria-hidden="true"></i>
                <h4>Visit Us</h4>
                <p>581, MG Road, Bangalore - 560001</p>
              </div>
              <div className="contact-item">
                <i className="fa-solid fa-phone" aria-hidden="true"></i>
                <h4>Call Us</h4>
                <p>+91 9876543210</p>
              </div>
              <div className="contact-item">
                <i className="fa-solid fa-envelope" aria-hidden="true"></i>
                <h4>Email Us</h4>
                <p>gururb20@gmail.com</p>
              </div>
              <div className="contact-item">
                <i className="fa-solid fa-clock" aria-hidden="true"></i>
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
            <button onClick={() => navigate('/register')} className="btn btn-cta">
              Create Account
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="section-content">
          <p>&copy; 2025 Bharadwaj's Cafe. All rights reserved.</p>
          <div className="footer-links">
            <a href="#" className="footer-link">
              Privacy Policy
            </a>
            <span className="separator">|</span>
            <a href="#" className="footer-link">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

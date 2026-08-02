import { Link } from 'react-router-dom';
import { IMG } from '../assets/cloudinary';

/**
 * Home hero.
 *
 * Both buttons were `<a href="#">` — placeholders that scrolled to the top of
 * the page and did nothing else. They are router links now. "Contact Us" points
 * at the anchor on the About page, which is where the contact details moved.
 */
const Hero = () => {
  return (
    <section className="hero-section">
      <div className="section-content">
        <div className="hero-details">
          <h1 className="title">Bharadwaj &apos;s Cafe</h1>
          <h3 className="subtitle">Make your day great with our special coffee!</h3>
          <p className="description">
            Welcome to our coffee paradise, where every bean tells a story and every cup sparks joy.
          </p>

          <div className="buttons">
            <Link to="/order" className="button order-now">
              Order Now
            </Link>
            <Link to="/about#contact" className="button contact-us">
              Contact Us
            </Link>
          </div>
        </div>
        <div className="hero-image-wrapper">
          <img src={IMG.coffeeHeroSection} alt="Hero image" className="hero-image" />
        </div>
      </div>
    </section>
  );
};

export default Hero;

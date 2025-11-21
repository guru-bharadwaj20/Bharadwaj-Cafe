import React from 'react';

const Hero = () => {
  return (
    <section className="hero-section">
      <div className="section-content">
        <div className="hero-details">
          <h1 className="title">Bharadwaj 's Cafe</h1>
          <h3 className="subtitle">Make your day great with our special coffee!</h3>
          <p className="description">Welcome to our coffee paradise, where every bean tells a story and every cup sparks joy.</p>

          <div className="buttons">
            <a href="#" className="button order-now">Order Now</a>
            <a href="#" className="button contact-us">Contact Us</a>
          </div>
        </div>
        <div className="hero-image-wrapper">
          <img src="img/coffee-hero-section.png" alt="Hero image" className="hero-image" />
        </div>
      </div>
    </section>
  );
};

export default Hero;

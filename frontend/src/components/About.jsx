import React from 'react';

const About = () => {
  return (
    <section className="about-section" id="about">
      <div className="section-content">
        <div className="about-image-wrapper">
          <img src="img/about-image.jpg" alt="About" className="about-image" />
        </div>

        <div className="about-details">
          <h2 className="section-title">About Us</h2>
          <p className="text">
            At Bharadwaj's Coffee in Karnataka, India, we pride ourselves on being a go-to destination for coffee lovers and conversation seekers alike. We're dedicated to providing an exceptional coffee experience in a cozy and inviting atmosphere, where guests can relax, unwind and enjoy their time in comfort!
          </p>
          <div className="social-link-list">
            <a href="#" className="social-link"><i className="fa-brands fa-facebook"></i></a>
            <a href="#" className="social-link"><i className="fa-brands fa-instagram"></i></a>
            <a href="#" className="social-link"><i className="fa-brands fa-linkedin"></i></a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

import React, { useState } from 'react';
import { api } from '../utils/api';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await api.submitContact(formData);
      setStatus({
        type: 'success',
        message: response.message || 'Thank you for contacting us! We will get back to you soon.',
      });
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Failed to submit form. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-section" id="contact">
      <h2 className="section-title">Contact Us</h2>
      <div className="section-content">
        <ul className="contact-info-list">
          <li className="contact-info">
            <i className="fa-solid fa-location-crosshairs"></i>
            <p>581, MG Road, Bangalore - 560001</p>
          </li>
          <li className="contact-info">
            <i className="fa-regular fa-envelope"></i>
            <p>gururb20@gmail.com</p>
          </li>
          <li className="contact-info">
            <i className="fa-solid fa-phone"></i>
            <p>+91 9876543210</p>
          </li>
          <li className="contact-info">
            <i className="fa-regular fa-clock"></i>
            <p>Monday - Friday: 09:00 AM - 05:00 PM</p>
          </li>
          <li className="contact-info">
            <i className="fa-regular fa-clock"></i>
            <p>Weekend: Closed</p>
          </li>
          <li className="contact-info">
            <i className="fa-solid fa-globe"></i>
            <p>www.bharadwajscafe.com</p>
          </li>
        </ul>
        <form action="#" className="contact-form" onSubmit={handleSubmit}>
          {status.message && (
            <div
              style={{
                padding: '10px',
                marginBottom: '15px',
                borderRadius: '8px',
                backgroundColor: status.type === 'success' ? '#d4edda' : '#f8d7da',
                color: status.type === 'success' ? '#155724' : '#721c24',
                border: `1px solid ${status.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
              }}
            >
              {status.message}
            </div>
          )}
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            className="form-input"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Your email"
            className="form-input"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <textarea
            name="message"
            placeholder="Your Message"
            className="form-input"
            value={formData.message}
            onChange={handleChange}
            required
          ></textarea>
          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Contact;

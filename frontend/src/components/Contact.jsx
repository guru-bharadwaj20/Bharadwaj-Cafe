import { useState } from 'react';
import { api } from '../utils/api';
import { sectionTitle } from '../styles/layout';

/**
 * Contact section.
 *
 * Migrated from contact.css. Same 900px flip as About — the form sits beside
 * the details on wide screens and above them on narrow ones — so it uses the
 * same `max-[900px]:` arbitrary variant.
 *
 * The status banner used to be a block of inline styles computing its own hex
 * codes; it is now two class strings picked by the status type.
 */
const details = [
  { icon: 'fa-solid fa-location-crosshairs', text: '581, MG Road, Bangalore - 560001' },
  { icon: 'fa-regular fa-envelope', text: 'gururb20@gmail.com' },
  { icon: 'fa-solid fa-phone', text: '+91 9876543210' },
  { icon: 'fa-regular fa-clock', text: 'Monday - Friday: 09:00 AM - 05:00 PM' },
  { icon: 'fa-regular fa-clock', text: 'Weekend: Closed' },
  { icon: 'fa-solid fa-globe', text: 'www.bharadwajscafe.com' },
];

// Shared field styling, carrying no height and no padding.
//
// Those two are set per element below rather than here, because two utilities
// touching the same property cannot be overridden by appending one to the
// other: which wins is decided by their order in the generated stylesheet, not
// by the order of the class string. A previous version had `h-[50px]` in this
// base and appended `h-[120px]` for the textarea, and the textarea rendered at
// 50px as soon as the stylesheet was regenerated in a different order.
//
// `border-solid` is not redundant either. Tailwind's border-* utilities set
// only a width; the style normally comes from Preflight, which is disabled
// while the legacy stylesheets are loaded, so without it a border computes to
// style `none` and zero pixels wide.
//
// Focus ring is amber at 10%, matching the secondary colour it sits under.
const fieldClass =
  'mb-4 w-full rounded-s border border-solid border-medium-gray bg-white outline-none focus:border-secondary focus:shadow-[0_0_0_3px_rgba(243,150,28,0.1)]';

const inputClass = `${fieldClass} h-[50px] px-3`;
const textareaClass = `${fieldClass} h-[120px] resize-y p-3`;

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    } catch {
      setStatus({ type: 'error', message: 'Failed to submit form. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="bg-light-pink pb-[100px] pt-10 max-[900px]:pb-20 max-[900px]:pt-8"
      id="contact"
    >
      <h2 className={sectionTitle}>Contact Us</h2>
      <div className="mx-auto flex max-w-site items-start justify-between gap-12 px-5 max-[900px]:flex-col-reverse max-[900px]:items-center max-[900px]:gap-[30px]">
        <ul className="flex-1">
          {details.map((detail) => (
            <li key={detail.text} className="my-5 flex items-center gap-5 max-[900px]:my-[15px]">
              <i
                className={`${detail.icon} min-w-[25px] text-l text-secondary`}
                aria-hidden="true"
              ></i>
              <p className="text-n text-[#555]">{detail.text}</p>
            </li>
          ))}
        </ul>

        <form
          action="#"
          className="max-w-[50%] flex-1 max-[900px]:max-w-full"
          onSubmit={handleSubmit}
        >
          {status.message && (
            <div
              className={`mb-[15px] rounded-s border p-2.5 ${
                status.type === 'success'
                  ? 'border-[#c3e6cb] bg-[#d4edda] text-[#155724]'
                  : 'border-[#f5c6cb] bg-[#f8d7da] text-[#721c24]'
              }`}
            >
              {status.message}
            </div>
          )}

          <input
            type="text"
            name="name"
            placeholder="Your Name"
            className={inputClass}
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Your email"
            className={inputClass}
            value={formData.email}
            onChange={handleChange}
            required
          />
          <textarea
            name="message"
            placeholder="Your Message"
            className={textareaClass}
            value={formData.message}
            onChange={handleChange}
            required
          ></textarea>

          <button
            className="mt-2.5 cursor-pointer rounded-m border-2 border-solid border-primary bg-primary px-8 py-3 text-m font-bold text-white transition-all duration-300 enabled:hover:-translate-y-0.5 enabled:hover:bg-transparent enabled:hover:text-primary enabled:hover:shadow-[0_5px_15px_rgba(59,20,28,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Contact;

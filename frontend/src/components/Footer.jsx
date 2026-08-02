import { Link } from 'react-router-dom';
import { IMG } from '../assets/cloudinary';

/**
 * Site footer.
 *
 * Migrated from footer.css to utilities. The original media queries were
 * desktop-first (`max-width: 1024px`, `max-width: 640px`); these are the
 * mobile-first inversion, so the *base* styles here are the small-screen ones
 * and `sm:`/`lg:` add back what the wider layouts had.
 */

// One shared shell so the three bands line up on the same gutter. Replaces
// the global .section-content rule, which is 20px padding on a 1300px cap.
const shell = 'mx-auto w-full max-w-site px-5';

const linkClass =
  'text-n text-footer-link transition-colors duration-300 hover:text-secondary hover:underline';

const columns = [
  {
    heading: 'Get to Know Us',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Careers', href: '#' },
      { label: 'Our Story', href: '#' },
    ],
  },
  {
    heading: 'Our Menu',
    links: [
      { label: 'Coffee', to: '/order' },
      { label: 'Snacks', href: '#' },
      { label: 'Beverages', href: '#' },
      { label: 'Specials', href: '#' },
    ],
  },
  {
    heading: 'Customer Service',
    links: [
      { label: 'Your Account', to: '/profile' },
      { label: 'Your Cart', to: '/cart' },
      { label: 'Help Center', href: '#' },
      { label: 'Track Order', href: '#' },
    ],
  },
  {
    heading: 'Connect With Us',
    links: [
      { label: 'Facebook', href: 'https://facebook.com', external: true },
      { label: 'Instagram', href: 'https://instagram.com', external: true },
      { label: 'LinkedIn', href: 'https://linkedin.com', external: true },
      { label: 'Twitter', href: 'https://twitter.com', external: true },
    ],
  },
];

const FooterLink = ({ link }) =>
  link.to ? (
    <Link to={link.to} className={linkClass}>
      {link.label}
    </Link>
  ) : (
    <a
      href={link.href}
      className={linkClass}
      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {link.label}
    </a>
  );

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-dark">
      <button
        type="button"
        onClick={scrollToTop}
        className="w-full cursor-pointer bg-footer-slate py-[15px] text-center transition-colors duration-300 hover:bg-[#37475a]"
      >
        <span className="text-n font-medium text-white">Back to top</span>
      </button>

      <div className="bg-footer-slate pb-5 pt-[30px] sm:pb-10 sm:pt-[50px]">
        <div className={shell}>
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-[30px] sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            {columns.map((column) => (
              <div key={column.heading} className="text-center sm:text-left">
                <h3 className="mb-5 text-m font-bold uppercase tracking-[0.5px] text-white">
                  {column.heading}
                </h3>
                <ul className="m-0 list-none p-0">
                  {column.links.map((link) => (
                    <li key={link.label} className="mb-3">
                      <FooterLink link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-footer-deep py-5 sm:py-[30px]">
        <div className={`${shell} flex flex-col items-center gap-5`}>
          <div className="mb-2.5">
            <img src={IMG.logo} alt="Bharadwaj's Cafe Logo" className="h-[50px] w-auto" />
          </div>

          <div className="flex flex-col items-center gap-[15px] text-center">
            <div className="flex flex-col flex-wrap items-center justify-center gap-2 sm:flex-row sm:gap-2.5">
              <Link
                to="/privacy"
                className="text-s text-footer-link transition-colors duration-300 hover:text-secondary hover:underline"
              >
                Privacy Policy
              </Link>
              <span className="mx-[5px] hidden text-[#555] sm:inline">|</span>
              <Link
                to="/terms"
                className="text-s text-footer-link transition-colors duration-300 hover:text-secondary hover:underline"
              >
                Terms of Service
              </Link>
              <span className="mx-[5px] hidden text-[#555] sm:inline">|</span>
              <Link
                to="/refund"
                className="text-s text-footer-link transition-colors duration-300 hover:text-secondary hover:underline"
              >
                Refund Policy
              </Link>
            </div>

            <div className="text-s text-[#999]">
              <p className="m-0">© 2025 Bharadwaj&apos;s Cafe. All rights reserved.</p>
            </div>

            <div className="mt-2.5">
              <p className="m-0 flex items-center justify-center gap-2 text-s text-footer-link sm:text-n">
                Made with{' '}
                <i className="fas fa-heart animate-heartbeat text-[#e74c3c]" aria-hidden="true"></i>{' '}
                by <span className="font-bold text-secondary">Guru Bharadwaj</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

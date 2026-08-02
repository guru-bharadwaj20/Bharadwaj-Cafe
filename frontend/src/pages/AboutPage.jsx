import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import About from '../components/About';
import Contact from '../components/Contact';

/**
 * About and Contact, on one page.
 *
 * They used to be two routes, and Contact was reachable only from the account
 * menu -- an odd place to hide the shop's address and phone number. Contact now
 * sits directly beneath About and the pair are a single navbar destination.
 * `/contact` still resolves here so existing links and the footer keep working.
 */
const AboutPage = () => {
  const { hash, pathname } = useLocation();

  // The router does not act on a fragment by itself, so /about#contact would
  // otherwise land at the top of the page. /contact renders this page too, and
  // should behave as though the fragment were there.
  useEffect(() => {
    const id = hash ? hash.slice(1) : pathname === '/contact' ? 'contact' : null;
    if (!id) return;
    // Honour prefers-reduced-motion: a smooth glide is motion, and some
    // people ask not to be given any. It also makes the page deterministic
    // for the screenshot harness, which emulates the same preference.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  }, [hash, pathname]);

  return (
    <main id="main-content">
      <About />
      <Contact />
    </main>
  );
};

export default AboutPage;

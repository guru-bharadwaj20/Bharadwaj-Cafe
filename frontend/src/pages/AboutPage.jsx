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
  return (
    <main id="main-content">
      <About />
      <Contact />
    </main>
  );
};

export default AboutPage;

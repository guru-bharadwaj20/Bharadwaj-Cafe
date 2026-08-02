import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { btnHeroPrimary, btnHeroSecondary } from '../styles/buttons';
import { IMG } from '../assets/cloudinary';
import { sectionContent } from '../styles/layout';

/*
 * The signed-out landing page.
 *
 * Migrated from landing.css together with the navbar block in style.css, which
 * had to move at the same time: landing.css's mobile drawer rules were
 * `.landing-header .navbar .nav-menu .nav-link`-style overrides of style.css's
 * `.navbar .nav-menu .nav-link`. Both are (0,3,0) or higher, so a utility on the
 * element — one class, (0,1,0) — loses to either of them. Neither file could
 * move on its own without the page coming apart.
 *
 * The drawer's open state was a class on `<body>`, set from an effect here and
 * read by `body.show-mobile-menu` selectors in two stylesheets. It is the
 * `showMobileMenu` state directly now: the component already had it, and a
 * global class on the document was only ever a way for CSS to see it. The
 * backdrop was a `::before` on the header and is a real element for the same
 * reason.
 */

/* ---------------------------------------------------------------- header -- */

const header = 'fixed z-[100] w-full bg-primary shadow-[0_2px_10px_rgba(0,0,0,0.2)]';

const navbar = 'flex items-center justify-between p-5';

const logo = 'block h-[50px] w-[120px] rounded-s pl-3 transition-transform duration-300';

/*
 * Above 900px this is an inline row. Below it, a fixed drawer that slides in
 * from the left — hence `left-0` versus `-left-[250px]` rather than a
 * visibility toggle, so the transition has something to animate.
 */
const navMenuBase =
  'flex gap-[15px] to-900:fixed to-900:top-0 to-900:h-full to-900:w-[250px] to-900:flex-col to-900:items-center to-900:gap-1 to-900:border-y-0 to-900:border-l-0 to-900:border-r-[1.5px] to-900:border-solid to-900:border-dark to-900:bg-[#bc9ba2] to-900:pt-20 to-900:transition-[left] to-900:duration-200 to-900:z-[100]';

const navMenuClosed = `${navMenuBase} to-900:-left-[250px]`;
const navMenuOpen = `${navMenuBase} to-900:left-0`;

/*
 * The links are `<button>`s, so `bg-transparent` and `border-none` are stated:
 * style.css's bare `button` reset is going with it.
 *
 * The desktop and drawer appearances set the same properties — colour, border,
 * size — so the drawer values are all `to-900:` on one string rather than a
 * base and an override, which Tailwind would resolve by emission order.
 */
/*
 * The box carries no colour, size or weight, because all three variants below
 * set them and two utilities for one property are resolved by Tailwind's
 * emission order rather than by the order they appear in a className. Each
 * variant is therefore complete rather than a base plus an override.
 */
const navLinkBox =
  'cursor-pointer rounded-m border-none bg-transparent px-[18px] py-2.5 font-sans transition-all duration-300 to-900:mt-[18px] to-900:flex to-900:h-[50px] to-900:w-[200px] to-900:items-center to-900:justify-center to-900:rounded-[10px] to-900:border-[1.5px] to-900:border-solid to-900:border-dark to-900:text-center';

const navLink = `${navLinkBox} text-m text-white hover:bg-secondary hover:text-primary to-900:font-semibold to-900:text-dark to-900:hover:border-secondary`;

/* Amber at both sizes: landing.css filled it at desktop and the drawer rule
   filled it again below 900px, so there is no size-dependent colour here. */
const registerBtn = `${navLinkBox} bg-secondary text-m font-bold text-primary hover:bg-white hover:text-primary to-900:border-secondary`;

/* One size smaller and dimmed, so the staff door does not compete with Login
   and Register. `text-s` is on this string and not on `navLinkBox`, which is
   the whole reason the box names no size. */
const staffLink = `${navLinkBox} flex items-center gap-2 text-s text-white opacity-70 hover:bg-secondary hover:text-primary hover:opacity-100 to-900:font-semibold to-900:text-dark to-900:hover:border-secondary`;

const menuOpenButton =
  'hidden cursor-pointer border-none bg-transparent text-l text-white to-900:block';

const menuCloseButton =
  'hidden cursor-pointer rounded-s border-none bg-primary p-2 text-l text-secondary to-900:absolute to-900:right-5 to-900:top-5 to-900:z-[101] to-900:block';

const backdrop = 'fixed inset-0 z-[99] bg-[rgba(0,0,0,0.2)] backdrop-blur-[2px] to-900:block';

/* ------------------------------------------------------------------ hero -- */

const main = 'pt-[90px] to-900:pt-20';

const hero =
  'flex min-h-[90vh] items-center bg-[linear-gradient(135deg,var(--primary-color)_0%,#2a0e15_100%)] py-20 to-900:min-h-0 to-900:py-[60px]';

const heroRow =
  'flex items-center justify-between gap-[60px] to-900:flex-col-reverse to-900:gap-10';

const heroTitle =
  'mb-[15px] font-script text-[3.5rem] leading-[1.2] text-secondary to-900:text-[2.5rem] to-600:text-[2rem]';

const heroSubtitle = 'mb-5 text-xxl font-bold text-white to-900:text-xl';
const heroDescription = 'mb-[35px] max-w-[90%] text-m leading-[1.8] opacity-90 to-900:max-w-full';
const heroButtons = 'flex flex-wrap gap-5 to-600:flex-col to-600:gap-[15px]';
const heroImage = 'h-auto w-full max-w-[450px] drop-shadow-[0_10px_30px_rgba(0,0,0,0.3)]';

/* ---------------------------------------------------------------- shared -- */

/*
 * `.section-heading` is landing.css's own, distinct from the site-wide
 * `.section-title`: 60px of clearance below and a 4px underline rather than
 * 5px. The underline is a `::before`-style rule written as an `after:` variant.
 */
const sectionHeading =
  "relative mb-[60px] text-center text-xxl font-bold text-primary after:mx-auto after:mt-[15px] after:block after:h-1 after:w-20 after:rounded-sm after:bg-secondary after:content-[''] to-600:text-xl";

const cardGrid =
  'mt-[50px] grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-[35px] to-900:grid-cols-1 to-900:gap-[25px]';

const card =
  'rounded-[15px] bg-white text-center shadow-[0_5px_15px_rgba(0,0,0,0.08)] transition-all duration-300';

const featureCard = `${card} px-[25px] py-[35px] hover:-translate-y-[10px] hover:shadow-[0_15px_30px_rgba(0,0,0,0.15)]`;
const contactCard = `${card} px-[25px] py-[30px]`;

const cardTitle = 'mb-3 text-l font-bold text-primary';
const cardText = 'text-n leading-[1.6] text-[#666]';

const FEATURES = [
  {
    icon: '☕',
    title: 'Premium Quality',
    text: 'Handpicked coffee beans sourced from the finest plantations',
  },
  {
    icon: '🏪',
    title: 'Cozy Ambiance',
    text: 'Relaxing atmosphere perfect for work, meetings, or leisure',
  },
  {
    icon: '👨‍🍳',
    title: 'Expert Baristas',
    text: 'Skilled professionals crafting your perfect cup every time',
  },
  {
    icon: '🚀',
    title: 'Quick Service',
    text: 'Fast and efficient service without compromising quality',
  },
];

const CONTACTS = [
  { icon: 'fa-location-dot', title: 'Visit Us', text: '581, MG Road, Bangalore - 560001' },
  { icon: 'fa-phone', title: 'Call Us', text: '+91 9876543210' },
  { icon: 'fa-envelope', title: 'Email Us', text: 'gururb20@gmail.com' },
  { icon: 'fa-clock', title: 'Working Hours', text: 'Mon - Fri: 09:00 AM - 05:00 PM' },
];

const STATS = [
  { value: '10+', label: 'Years Experience' },
  { value: '50K+', label: 'Happy Customers' },
  { value: '15+', label: 'Coffee Varieties' },
];

const Landing = () => {
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setShowMobileMenu(false);
    }
  };

  return (
    <div className="min-h-screen" id="main-content">
      {showMobileMenu && (
        <div className={backdrop} onClick={() => setShowMobileMenu(false)} aria-hidden="true"></div>
      )}

      <header className={header}>
        <nav className={`${sectionContent} ${navbar}`}>
          <img src={IMG.logo} alt="Bharadwaj's Cafe" className={logo} />
          <ul className={showMobileMenu ? navMenuOpen : navMenuClosed}>
            <button
              className={`fas fa-times ${menuCloseButton}`}
              onClick={() => setShowMobileMenu(false)}
              aria-label="Close menu"
            ></button>
            <li>
              <button onClick={() => scrollToSection('about-section')} className={navLink}>
                About Us
              </button>
            </li>
            <li>
              <button onClick={() => scrollToSection('contact-section')} className={navLink}>
                Contact Us
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/login')} className={navLink}>
                Login
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/register')} className={registerBtn}>
                Register
              </button>
            </li>
            {/* Staff door. Deliberately the quietest thing in the bar --
                present so nobody has to be told the URL, but not competing
                with the customer actions. */}
            <li>
              <button onClick={() => navigate('/admin/login')} className={staffLink}>
                <i className="fa-solid fa-user-shield" aria-hidden="true"></i> Staff
              </button>
            </li>
          </ul>
          <button
            className={`fas fa-bars ${menuOpenButton}`}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Open menu"
            aria-expanded={showMobileMenu}
          ></button>
        </nav>
      </header>

      <main className={main}>
        <section className={hero}>
          <div className={`${sectionContent} ${heroRow}`}>
            <div className="flex-1 text-white">
              <h1 className={heroTitle}>Welcome to Bharadwaj&apos;s Cafe</h1>
              <h2 className={heroSubtitle}>Where Every Sip Tells a Story</h2>
              <p className={heroDescription}>
                Experience the finest coffee blends crafted with passion. From traditional South
                Indian filter coffee to contemporary espresso-based beverages, we bring you an
                authentic coffee experience in the heart of Karnataka.
              </p>
              <div className={heroButtons}>
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
            <div className="flex flex-1 justify-center">
              <img src={IMG.coffeeHeroSection} alt="Coffee" className={heroImage} />
            </div>
          </div>
        </section>

        <section className="bg-light-pink py-[100px]">
          <div className={sectionContent}>
            <h2 className={sectionHeading}>Why Choose Us?</h2>
            <div className={cardGrid}>
              {FEATURES.map((feature) => (
                <div key={feature.title} className={featureCard}>
                  <div className="mb-5 text-[3rem]">{feature.icon}</div>
                  <h3 className={cardTitle}>{feature.title}</h3>
                  <p className={cardText}>{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-[100px]" id="about-section">
          <div
            className={`${sectionContent} flex items-center gap-[60px] to-900:flex-col to-900:gap-10`}
          >
            <div className="flex-1">
              <h2 className={sectionHeading}>About Bharadwaj&apos;s Cafe</h2>
              <p className="mb-5 text-m leading-[1.8] text-[#555]">
                Established with a passion for exceptional coffee, Bharadwaj&apos;s Cafe has become
                Karnataka&apos;s favorite destination for coffee enthusiasts. We pride ourselves on
                serving authentic South Indian filter coffee alongside modern espresso-based
                beverages.
              </p>
              <p className="mb-5 text-m leading-[1.8] text-[#555]">
                Our mission is to create a welcoming space where friends meet, ideas flow, and every
                cup of coffee brings joy. Whether you&apos;re here for a quick caffeine fix or a
                leisurely afternoon, we&apos;re committed to making your experience memorable.
              </p>
              <div className="mt-10 flex flex-wrap gap-10 to-900:justify-center">
                {STATS.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <h3 className="mb-[5px] text-[2.5rem] font-bold text-secondary">
                      {stat.value}
                    </h3>
                    <p className="text-s text-[#666]">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <img
                src={IMG.aboutImage}
                alt="About Us"
                className="h-auto w-full max-w-[450px] rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
              />
            </div>
          </div>
        </section>

        <section className="bg-light-pink py-[100px]" id="contact-section">
          <div className={sectionContent}>
            <h2 className={sectionHeading}>Get In Touch</h2>
            <div className={cardGrid}>
              {CONTACTS.map((contact) => (
                <div key={contact.title} className={contactCard}>
                  <i
                    className={`fa-solid ${contact.icon} mb-[15px] text-[2.5rem] text-secondary`}
                    aria-hidden="true"
                  ></i>
                  <h4 className="mb-2.5 text-l font-semibold text-primary">{contact.title}</h4>
                  <p className={cardText}>{contact.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary py-20 text-center text-white">
          <div className={sectionContent}>
            <h2 className="mb-[15px] text-xxl font-bold">Ready to Experience the Best Coffee?</h2>
            <p className="mb-[30px] text-m opacity-90">
              Join our community of coffee lovers today!
            </p>
            <button
              onClick={() => navigate('/register')}
              className="cursor-pointer rounded-m border-none bg-secondary px-10 py-4 text-m font-bold text-primary transition-all duration-300 hover:scale-105 hover:bg-white hover:shadow-[0_10px_25px_rgba(255,255,255,0.2)] to-600:w-full"
            >
              Create Account
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-dark py-[30px] text-center text-white">
        <div className={`${sectionContent} flex flex-col items-center gap-[15px]`}>
          <p>&copy; 2025 Bharadwaj&apos;s Cafe. All rights reserved.</p>
          <div className="flex items-center gap-2.5">
            <a
              href="#"
              className="text-s text-white no-underline transition-all duration-300 hover:text-secondary"
            >
              Privacy Policy
            </a>
            <span className="mx-[5px] text-[#666]">|</span>
            <a
              href="#"
              className="text-s text-white no-underline transition-all duration-300 hover:text-secondary"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

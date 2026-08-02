import { Link } from 'react-router-dom';
import { IMG } from '../assets/cloudinary';
import { sectionContent } from '../styles/layout';

/**
 * Home hero.
 *
 * Both buttons were `<a href="#">` — placeholders that scrolled to the top of
 * the page and did nothing else. They are router links now. "Contact Us" points
 * at the anchor on the About page, which is where the contact details moved.
 *
 * Migrated from the `.hero-section` block in style.css. Two oddities in that
 * block are resolved rather than carried:
 *
 * - `.buttons` declared `gap` twice, `1rem` then `15px`. The second won, so
 *   15px is what shipped and 15px is what this says.
 * - The desktop rule was `min-height: 100vh` on both the section and its inner
 *   row, which on a page that also has a footer and a docked nav is 100vh of
 *   hero plus everything else. It is unchanged here; this is a port, and the
 *   height is a design question rather than a bug.
 */

const heroSection = 'min-h-screen bg-primary';

const heroRow =
  'flex min-h-screen items-center justify-between text-white to-900:flex-col-reverse to-900:justify-center to-900:gap-0 to-900:px-5 to-900:pb-5 to-900:pt-[30px] to-900:text-center';

const title = 'pl-4 font-script text-xxl text-secondary';
const subtitle = 'mt-2 max-w-[80%] pl-4 text-xl font-semibold to-900:max-w-full';
const description = 'mb-10 mt-6 max-w-[80%] pl-4 text-m to-900:max-w-full';

const buttons = 'ml-2 flex flex-wrap gap-[15px] to-900:items-start to-900:gap-3';

/* The two buttons differ in fill and in what hovering does, so they are two
   strings rather than a base plus an override — Tailwind resolves two utilities
   for one property by emission order, not by class order. */
const buttonBox =
  'rounded-m border-2 border-solid px-8 py-3 text-m font-bold transition-all duration-300 hover:-translate-y-0.5';

const orderNow = `${buttonBox} border-transparent bg-secondary text-primary hover:border-white hover:bg-transparent hover:text-white hover:shadow-[0_5px_15px_rgba(255,255,255,0.2)]`;

const contactUs = `${buttonBox} border-white bg-transparent text-white hover:border-secondary hover:bg-secondary hover:text-primary hover:shadow-[0_5px_15px_rgba(243,150,28,0.3)]`;

const imageWrapper =
  'mr-10 max-w-[480px] pt-[4.5rem] to-900:mr-0 to-900:w-full to-900:max-w-[230px]';

const Hero = () => {
  return (
    <section className={heroSection}>
      <div className={`${sectionContent} ${heroRow}`}>
        <div>
          <h1 className={title}>Bharadwaj &apos;s Cafe</h1>
          <h3 className={subtitle}>Make your day great with our special coffee!</h3>
          <p className={description}>
            Welcome to our coffee paradise, where every bean tells a story and every cup sparks joy.
          </p>

          <div className={buttons}>
            <Link to="/order" className={orderNow}>
              Order Now
            </Link>
            <Link to="/about#contact" className={contactUs}>
              Contact Us
            </Link>
          </div>
        </div>
        <div className={imageWrapper}>
          {/* `w-[95%]` is style.css's global `img` width, which this image
              relied on at desktop; the mobile rule set it to 100%. */}
          <img
            src={IMG.coffeeHeroSection}
            alt="Hero image"
            className="block h-auto w-[95%] object-contain to-900:w-full"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;

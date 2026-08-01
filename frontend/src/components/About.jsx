/**
 * About section.
 *
 * Migrated from about.css. The layout flips to a reversed column under 900px,
 * which is not a Tailwind default breakpoint, so it is expressed with the
 * `max-[900px]:` arbitrary variant rather than by bending `md:` to fit.
 *
 * `section-title` stays a legacy class for now: it carries an ::after
 * underline and is shared by most pages, so it moves in one piece later.
 */
const socials = [
  { label: 'Facebook', icon: 'fa-facebook' },
  { label: 'Instagram', icon: 'fa-instagram' },
  { label: 'LinkedIn', icon: 'fa-linkedin' },
];

const About = () => {
  return (
    <section className="min-h-screen bg-light-pink py-[100px] max-[900px]:py-20" id="about">
      <div className="mx-auto flex max-w-site items-center justify-between gap-[50px] px-5 max-[900px]:flex-col-reverse max-[900px]:gap-10">
        <div>
          <img
            src="img/about-image.jpg"
            alt="About"
            className="h-[400px] w-[400px] rounded-circle object-cover max-[900px]:aspect-square max-[900px]:h-full max-[900px]:w-full max-[900px]:max-w-[280px]"
          />
        </div>

        <div className="max-w-[50%] max-[900px]:max-w-full">
          <h2 className="section-title p-0">About Us</h2>
          <p className="my-[30px] text-center text-m leading-[1.8] text-[#555] max-[900px]:mb-5 max-[900px]:mt-[30px]">
            At Bharadwaj&apos;s Coffee in Karnataka, India, we pride ourselves on being a go-to
            destination for coffee lovers and conversation seekers alike. We&apos;re dedicated to
            providing an exceptional coffee experience in a cozy and inviting atmosphere, where
            guests can relax, unwind and enjoy their time in comfort!
          </p>
          <div className="flex justify-center gap-[25px]">
            {socials.map((social) => (
              <a
                key={social.label}
                href="#"
                aria-label={social.label}
                className="inline-block text-l text-primary transition duration-200 ease-in hover:scale-110 hover:text-secondary"
              >
                <i className={`fa-brands ${social.icon}`} aria-hidden="true"></i>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

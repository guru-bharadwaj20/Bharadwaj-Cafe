/**
 * The two site-wide layout classes from style.css.
 *
 * `.section-content` was used by six components and `.section-title` by three,
 * which is why they are here rather than repeated at each call site.
 */

/** The page gutter: centred, capped at the site width, 20px of side padding. */
export const sectionContent = 'mx-auto max-w-site px-5';

/*
 * The section heading, with its 80x5 amber underline.
 *
 * The underline was `.section-title::after` and is an `after:` variant; the
 * empty `content` is required, because a pseudo-element with no `content` is
 * not generated at all.
 *
 * The colour is deliberately not in here. `.section-title` was maroon, which is
 * right on the light About and Contact sections and 1.08:1 against the cart's
 * #1a1a1a -- the heading was invisible there, and the fix was a `text-white`
 * appended to the class string. Appending a colour to a string that already
 * names one leaves the winner to Tailwind's emission order, so the two are
 * separate exports and each caller picks one.
 */
const sectionTitleBox =
  "pb-[60px] text-center text-xxl font-bold uppercase after:mx-auto after:mt-2.5 after:block after:h-[5px] after:w-20 after:rounded-s after:bg-secondary after:content-['']";

/** On the light sections. */
export const sectionTitle = `${sectionTitleBox} text-primary`;

/** On the dark ones — the cart, and anything else on #1a1a1a or #252525. */
export const sectionTitleOnDark = `${sectionTitleBox} text-white`;

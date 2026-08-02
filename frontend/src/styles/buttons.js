/**
 * The two shared button pairs.
 *
 * `.btn-primary` and `.btn-secondary` were declared in both cart.css and
 * landing.css and used by four pages. Which declaration applied depended on
 * the import order in App.jsx, not on anything local: landing.css is imported
 * later, so it won the colours and the hover everywhere, while cart.css kept
 * the box because landing only styles those through a separate `.btn` class.
 *
 * The cart's secondary button is the clearest symptom. cart.css asks for a
 * solid grey #444; what actually rendered was landing.css's transparent button
 * with a white border.
 *
 * These constants encode what the browser resolved to, not what either file
 * asked for, so lifting them out changes nothing on screen. Whether that
 * resolution is the *desired* design is a separate question and a deliberate
 * one — see docs/tailwind-migration.md.
 */

// Colours and hover, identical across both sizes because landing.css supplied
// them to every caller regardless of size.
const primarySkin =
  'bg-secondary text-primary hover:-translate-y-[3px] hover:bg-white hover:shadow-[0_10px_25px_rgba(243,150,28,0.3)]';

const secondarySkin =
  'border-2 border-solid border-white bg-transparent text-white hover:bg-white hover:text-primary';

const base = 'cursor-pointer font-bold transition-all duration-300';

/** Compact box, from cart.css: used by Cart, OrderHistory and VerifyEmail. */
const compactBox = 'rounded-s px-[30px] py-3 text-[16px]';

/** Hero box, from landing.css's `.btn`: larger, fully rounded. */
const heroBox = 'rounded-m px-8 py-[14px] text-m';

export const btnPrimary = `${base} ${compactBox} border-none ${primarySkin}`;
export const btnSecondary = `${base} ${compactBox} ${secondarySkin}`;

export const btnHeroPrimary = `${base} ${heroBox} border-none ${primarySkin}`;
export const btnHeroSecondary = `${base} ${heroBox} ${secondarySkin}`;

/** Disabled state, shared by the buttons that can be busy. */
export const btnDisabled = 'disabled:cursor-not-allowed disabled:opacity-60';

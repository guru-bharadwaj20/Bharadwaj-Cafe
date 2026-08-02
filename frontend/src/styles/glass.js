/**
 * Translucent surfaces for the floating nav, the cart toast and the admin bar.
 *
 * These are written as literal rgba rather than as Tailwind opacity modifiers,
 * and that is not a style preference. The theme maps `white` to
 * `var(--white-color)`, so `text-white/75` compiles to
 * `rgb(var(--white-color) / 0.75)` -- and because the token holds `#fff`
 * rather than the `255 255 255` channel triplet the modifier syntax needs, the
 * whole declaration is invalid and the browser drops it. On an anchor that
 * means no colour is set at all and the link falls back to UA blue, which is
 * exactly how the first cut of the floating nav rendered.
 *
 * Either keep alpha out of the themed colours, as here, or redefine them in
 * `tailwind.config.js` as channel triplets. Doing it here keeps the CSS custom
 * properties the single source of truth for the solid colours.
 */

/** Brand maroon at 78%, over a blur: reads on both the dark and light pages. */
export const glassPanel = [
  'border border-solid border-[rgba(255,255,255,0.15)]',
  'bg-[rgba(59,20,28,0.78)] backdrop-blur-md',
  'shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
].join(' ');

/** The same surface, near-opaque, for menus that sit over the bar. */
export const glassMenu = [
  'border border-solid border-[rgba(255,255,255,0.15)]',
  'bg-[rgba(59,20,28,0.96)] backdrop-blur-md',
  'shadow-[0_12px_40px_rgba(0,0,0,0.5)]',
].join(' ');

export const textOnGlass = 'text-[rgba(255,255,255,0.75)]';
export const textOnGlassSoft = 'text-[rgba(255,255,255,0.6)]';
export const textOnGlassFaint = 'text-[rgba(255,255,255,0.5)]';
export const hoverOnGlass = 'hover:bg-[rgba(255,255,255,0.1)] hover:text-white';
export const activeOnGlass = 'bg-[rgba(255,255,255,0.15)] text-secondary';
export const borderOnGlass = 'border-[rgba(255,255,255,0.25)]';

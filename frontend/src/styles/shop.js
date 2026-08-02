/**
 * The shop card pattern, shared by the Order menu and the Merchandise shelf.
 *
 * order.css and merchandise.css were near-duplicates: the same dark section,
 * the same three-across card grid, the same hover lift, the same amber price —
 * declared twice, so the two pages could drift apart and had already started
 * to. They are one definition now, which is the point of the migration as much
 * as the utilities themselves are.
 *
 * A note on the arbitrary values: CSS `calc()` requires spaces around its
 * operators, and Tailwind reads a space in an arbitrary value as the end of
 * the class, so those spaces are written as underscores.
 */

/** Full-height dark section wrapper. */
/*
 * Asymmetric on purpose. The 100px top used to be clearance for the fixed
 * header; with the nav docked at the bottom there is nothing up there to clear,
 * and a 100px gap above the title just read as a rendering fault.
 */
export const shopSection =
  'min-h-screen bg-dark pb-[100px] pt-10 text-white max-[900px]:pb-20 max-[900px]:pt-8';

/**
 * The dark-section title. Carries its own amber underline through `after:`,
 * rather than depending on the global `.section-title` rule, whose colours are
 * tuned for the light sections.
 */
export const shopTitle = [
  'mb-[60px] p-0 text-center text-xxl font-bold uppercase text-white',
  'after:mx-auto after:mt-2.5 after:block after:h-[5px] after:w-20',
  'after:rounded-s after:bg-secondary after:content-[""]',
  'max-[900px]:mb-10',
].join(' ');

export const shopGrid = 'flex flex-wrap justify-center gap-[30px] max-[900px]:gap-[25px]';

/**
 * Three across, two under 900px, one under 640px.
 *
 * `relative` is here because both the wishlist heart and the category badge
 * are positioned against the card.
 */
export const shopCard = [
  'relative flex flex-col items-center rounded-[15px] bg-[#1a1a1a] p-[25px] text-center',
  'shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all duration-300',
  'hover:-translate-y-[5px] hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]',
  'flex-[1_1_calc(33.333%_-_30px)] max-w-[calc(33.333%_-_30px)]',
  'max-[1024px]:flex-[1_1_calc(33.33%_-_20px)] max-[1024px]:max-w-[calc(33.33%_-_20px)]',
  'max-[900px]:flex-[1_1_calc(50%_-_20px)] max-[900px]:max-w-[calc(50%_-_20px)] max-[900px]:p-5',
  'max-[640px]:max-w-full max-[640px]:flex-[1_1_100%]',
].join(' ');

export const shopImage = 'mb-5 aspect-square max-w-[80%] rounded-[10px] object-contain';

export const shopDetails = 'w-full';

export const shopName = 'my-2.5 text-l font-semibold text-secondary';

export const shopText = 'text-n text-white opacity-90';

export const shopFooter = 'mt-[15px] flex items-center justify-between gap-[15px]';

export const shopPrice = 'm-0 text-l font-bold text-secondary';

/** Loading, empty and error copy that replaces the grid. */
export const shopStatus = 'px-5 py-[60px] text-center text-m text-medium-gray';

/**
 * Add to cart. Turns green for a moment after a click, which is why the
 * confirmed state is a separate string rather than a modifier.
 */
const addToCartBase = [
  'flex cursor-pointer items-center gap-2 rounded-[25px] border-none px-5 py-2.5',
  'text-n font-semibold transition-all duration-300 [&>i]:text-[14px]',
].join(' ');

export const addToCartBtn = `${addToCartBase} bg-secondary text-black hover:scale-105 hover:bg-[#d67e0e]`;

export const addToCartBtnAdded = `${addToCartBase} bg-[#4caf50] text-white`;

/** Heart, pinned to the top-left corner of a menu card. */
export const wishlistBtn = [
  'absolute right-2.5 top-2.5 z-10 flex h-[35px] w-[35px] items-center justify-center',
  'cursor-pointer rounded-circle border-none bg-black/70 text-white transition-all duration-300',
  'hover:scale-110 hover:bg-secondary hover:text-black',
].join(' ');

/** Category pill on a merchandise card. */
export const merchBadge = [
  'absolute right-[15px] top-[15px] rounded-[20px] bg-secondary px-3 py-[5px]',
  'text-[0.75rem] font-bold uppercase tracking-[0.5px] text-black',
].join(' ');

export const dietaryTags = 'my-2 flex flex-wrap gap-[5px]';

export const dietaryTag =
  'rounded-[12px] bg-secondary px-2 py-[3px] text-[11px] font-bold text-black';

export const ratingRow = 'my-[5px] flex items-center gap-[5px] text-s text-secondary';

export const ratingCount = 'text-[#999]';

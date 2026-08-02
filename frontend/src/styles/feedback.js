/**
 * The loading state, shared by five pages.
 *
 * `.loading-container` and `.spinner` were declared twice — in admin.css and
 * order-history.css — byte for byte the same, which is the only reason nobody
 * noticed. Five pages use them and three of those import neither file: the
 * wishlist, the loyalty page and the email-verification page were all being
 * held up by whichever of the two stylesheets happened to be in the bundle.
 * Deleting either one on its own would have silently unstyled them.
 */

export const loadingContainer = 'px-5 py-[100px] text-center text-white';

/**
 * Tailwind's own `animate-spin` is `spin 1s linear infinite` turning 0deg to
 * 360deg, which is exactly the local `@keyframes spin` both files defined, so
 * the keyframes go with them.
 *
 * The ring is a 4px border all the way round with only the top segment
 * recoloured, so `border-t-secondary` names a colour and not a width — the
 * four-side `border-4` is what gives it one.
 */
export const spinner =
  'mx-auto mb-5 h-[50px] w-[50px] animate-spin rounded-circle border-4 border-solid border-[rgba(243,150,28,0.2)] border-t-secondary';

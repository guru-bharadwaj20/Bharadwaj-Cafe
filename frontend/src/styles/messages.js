/**
 * Inline error and success banners.
 *
 * Lifted out of auth.css because five auth pages are not the only callers:
 * the cart's checkout error and the admin login both use these classes, and
 * neither imports anything auth-related. Deleting auth.css without moving them
 * first would have quietly unstyled both.
 *
 * These are the *inline, in-form* messages — the ones that sit above a form and
 * stay until the form changes. Transient confirmations go through
 * `useToast` and `ToastHost` instead.
 *
 * The 1px borders are written as full four-side borders, so no `border-x-0`
 * pairing is needed; see docs/tailwind-migration.md for why one-sided borders
 * require it while Preflight is off.
 */

const base = 'mb-5 flex items-center gap-2.5 rounded-s px-[15px] py-3 text-s';

export const errorMessage = `${base} border border-solid border-[#fcc] bg-[#fee] text-[#c33]`;

export const successMessage = `${base} border border-solid border-[#cfc] bg-[#efe] text-[#3c3]`;

/** Field-level validation text, shown under the input it belongs to. */
export const fieldError = 'mt-[5px] block text-[0.85rem] text-[#c33]';

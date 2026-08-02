/**
 * The auth form field pattern.
 *
 * `.form-group` was declared bare in auth.css and scoped everywhere else
 * (`.payment-form .form-group`, `.address-form .form-group`, `.edit-form
 * .form-group`, `.review-form .form-group`). A bare declaration matches every
 * `.form-group` in the app, so auth.css was styling four other pages' forms as
 * a side effect of styling its own.
 *
 * Mostly that was harmless, because the scoped rules either outrank it or are
 * imported later. The cart was not so lucky. `.payment-form label` and
 * `.form-group label` have identical specificity (0,1,1), and App.jsx imports
 * auth.css after cart.css, so auth won every tie on the checkout form:
 *
 *   - labels rendered var(--dark-color) on the #2a2a2a panel, not cart's #fff
 *   - the phone input rendered auth's #fafafa background while keeping cart's
 *     `color: #fff` — white text in a white box, invisible as you type
 *
 * These constants carry the auth pages' own resolved values, so those pages do
 * not move. Deleting the bare rules from auth.css is what lets cart.css style
 * its own form again, which is a deliberate fix and not a no-op — see
 * docs/tailwind-migration.md.
 */

/** 20px gap below each field, from `.form-group`. */
export const formGroup = 'mb-5';

/**
 * Icon and text on one line. The icon is a separate export because the old
 * `.form-group label i` rule coloured it independently of the label.
 */
export const formLabel = 'mb-2 flex items-center gap-2 text-s font-medium text-dark';
export const formLabelIcon = 'text-secondary';

/**
 * `border-solid` is required: Preflight is off, so a bare `border-2` computes
 * to a two-pixel border of style `none` and draws nothing.
 *
 * The focus rule drops the outline in favour of an amber border, matching what
 * auth.css did. It still beats the global `input:focus-visible` ring in
 * style.css — (0,2,0) against (0,1,1) — so keyboard focus looks unchanged.
 */
export const formInput =
  'w-full rounded-s border-2 border-solid border-[#e0e0e0] bg-[#fafafa] px-[15px] py-3 text-n transition-all duration-300 focus:border-secondary focus:bg-white focus:outline-none';

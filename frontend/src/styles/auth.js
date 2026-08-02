/**
 * The auth pages: login, register, forgot password, reset password, verify email.
 *
 * All five render the same split panel — an image half and a form half — so the
 * layout lives here once rather than being re-typed as utility strings in five
 * files. The field pattern is `styles/forms.js` and the banners are
 * `styles/messages.js`; this file is what was left of auth.css after those two.
 *
 * Values are ported from auth.css unchanged. Two exceptions are deliberate and
 * are documented at `authBtn` and in docs/tailwind-migration.md: three classes
 * that auth.css never declared, so two of these pages were rendering unstyled.
 */

/* ---------------------------------------------------------------- layout -- */

export const authPage =
  'flex min-h-screen items-center justify-center bg-primary p-5 to-600:p-2.5';

export const authContainer =
  'flex w-full max-w-[1100px] flex-row overflow-hidden rounded-[20px] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.3)] to-900:flex-col';

/** The image half. Only login and register have one. */
export const authLeft =
  'relative flex min-h-[600px] flex-1 items-center justify-center bg-primary p-10 to-900:min-h-[250px] to-900:px-5 to-900:py-[30px]';

export const authImage =
  'absolute h-auto w-full max-w-[400px] opacity-30 to-900:max-w-[250px]';

export const authOverlay = 'relative z-[1] text-center text-white';
export const authOverlayTitle = 'mb-[15px] font-script text-xxl text-secondary';
export const authOverlayText = 'text-m opacity-90';

/*
 * The form half, in two forms. auth.css set `flex: 1` on `.auth-right` and then
 * `flex: unset` on `.center-form` for the three pages with no image beside
 * them, relying on source order to break the tie. Utilities are ordered by
 * whatever Tailwind emits last, not by the order they are written in the class
 * string, so the two are kept apart instead — see the trap in
 * docs/tailwind-migration.md. `flex: unset` is the initial value for a flex
 * item, so the centred variant simply names no flex utility at all.
 */
const authRightBox =
  'flex items-center justify-center px-[50px] py-[60px] to-900:px-[30px] to-900:py-10 to-600:px-5 to-600:py-[30px]';

export const authRight = `flex-1 ${authRightBox}`;
export const authRightCentered = `mx-auto max-w-[500px] ${authRightBox}`;

export const authFormContainer = 'w-full max-w-[400px] to-600:max-w-full';

/* ---------------------------------------------------------------- header -- */

export const authHeader = 'mb-[30px] text-center';
export const authLogo = 'mb-5 h-[60px] w-auto';
export const authTitle = 'mb-2 text-xl font-bold text-primary to-600:text-l';
export const authSubtitle = 'text-s text-[#666]';

export const authForm = 'mt-[25px]';

/* --------------------------------------------------------------- actions -- */

/**
 * The primary submit button.
 *
 * `enabled:hover:` rather than plain `hover:` because auth.css wrote
 * `:hover:not(:disabled)` — a disabled button must not lift when the pointer
 * crosses it.
 *
 * ResetPassword's submit button was `.submit-button`, a class no stylesheet in
 * the project declares, so it rendered as a bare browser button while the other
 * four pages showed the amber one. It uses this now.
 */
export const authBtn =
  'mt-2.5 w-full cursor-pointer rounded-m border-none bg-secondary p-[14px] text-m font-bold text-primary transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 enabled:hover:-translate-y-0.5 enabled:hover:bg-primary enabled:hover:text-white enabled:hover:shadow-[0_5px_15px_rgba(59,20,28,0.3)]';

/**
 * The same skin at its natural width, for a link rather than a submit button.
 *
 * A separate export rather than `${authBtn} w-auto`, because appending a width
 * to a string that already names one leaves the winner to Tailwind's emission
 * order instead of to the order the classes are written in.
 *
 * Every class is spelled out in full here — no interpolation, no `.join()`
 * building the variants — because Tailwind finds classes by scanning the source
 * text. A name that only exists once the string has been evaluated is a name
 * Tailwind never sees, and the utility is simply never generated.
 *
 * Note the plain `hover:` too: `:enabled` matches form controls only, so the
 * `enabled:` prefix above would silently switch the hover off on an anchor.
 */
export const authBtnInline =
  'inline-block cursor-pointer rounded-m border-none bg-secondary px-[30px] py-3 text-m font-bold text-primary no-underline transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-[0_5px_15px_rgba(59,20,28,0.3)]';

/**
 * The same button outlined rather than filled, for a second action beside it.
 *
 * It exists because the email-verification page's failure state offered
 * `btnSecondary` from styles/buttons.js — white text inside a white border,
 * which is correct on the dark pages that button was written for and
 * completely invisible on the white auth card. Whoever added it could not have
 * seen it: reaching that state needs an expired verification link.
 */
export const authBtnOutline =
  'inline-block cursor-pointer rounded-m border-2 border-solid border-primary bg-transparent px-[30px] py-3 text-m font-bold text-primary no-underline transition-all duration-300 hover:bg-primary hover:text-white';

export const formFooter = 'mb-5 flex justify-end';

export const forgotLink =
  'text-s font-medium text-secondary no-underline transition-all duration-300 hover:text-primary hover:underline';

/**
 * "OR" between the password form and the Google button. The rule is a full-width
 * hairline behind the page background, with the word painted over it — hence the
 * white background on the span rather than a gap in the line.
 */
export const authDivider =
  "relative my-[25px] text-center before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-[#e0e0e0] before:content-['']";

export const authDividerLabel =
  'relative bg-white px-[15px] text-s font-medium text-[#999]';

/** Google renders its own button in here and its branding terms forbid
    restyling it, so this only centres what Google draws. */
export const googleSignin = 'my-5 justify-center';

/* ------------------------------------------------------------- footer nav -- */

export const authRedirect = 'mt-5 text-center';
export const authRedirectText = 'text-n text-[#666]';

export const redirectLink =
  'font-bold text-secondary no-underline transition-all duration-300 hover:text-primary hover:underline';

/**
 * A single top rule. Preflight is off, so `border-t border-solid` would set the
 * style on all four sides and leave the other three at the CSS initial width of
 * `medium` — about 3px of box. The three explicit zeroes are load-bearing.
 */
export const backHome =
  'mt-[30px] border-x-0 border-b-0 border-t border-solid border-[#e0e0e0] pt-5 text-center';

export const backLink =
  'inline-flex items-center gap-2 text-s text-dark no-underline transition-all duration-300 hover:text-secondary';

export const backLinkIcon = 'text-[0.9rem]';

/**
 * "Resend verification email", rendered inside the login error banner.
 *
 * auth.css used `font: inherit` to pick up the banner's type. That shorthand is
 * spelled out here instead of as an arbitrary `[font:inherit]`, because the
 * weight override next to it would then be two arbitrary properties racing for
 * emission order. The banner is `text-s` in the site font, which is what these
 * three utilities say.
 */
export const resendLink =
  'mt-2.5 block cursor-pointer border-none bg-transparent p-0 font-sans text-s font-semibold leading-[inherit] text-secondary underline disabled:cursor-not-allowed disabled:opacity-60';

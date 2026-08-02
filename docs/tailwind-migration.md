# Tailwind migration

**Complete: 20 of 20.** `src/tailwind.css` is the only stylesheet left. It
holds the design tokens as custom properties, three global rules for elements
no component owns (`html`, the `:focus-visible` ring, the reduced-motion
override), and Tailwind itself. Everything else is utilities on components,
with patterns shared across components living in `src/styles/*.js`.

The rule for the whole exercise was that the site must not change appearance,
checked rather than asserted:

```
npm run ui:baseline   # before a batch
npm run ui:after      # after it
npm run ui:diff       # per-page percentage of pixels changed
```

Both servers must be running. Every route is captured at 1440px and 390px,
signed in, with a seeded cart. Expect a permanent ~0.2% delta on the profile
pages: each run registers a throwaway account, so the name on screen differs.

**Outstanding: a clean determinism re-run.** The API rate limiter stopped the
last attempt (see the false positives below). The guard is in place; the next
run on a cooled-down limiter is the check.

## What moved where

| Stylesheet | Replaced by |
| --- | --- |
| `footer.css` | `components/Footer.jsx` |
| `about.css` | `components/About.jsx` |
| `contact.css` | `components/Contact.jsx` |
| `order.css`, `merchandise.css` | `styles/shop.js` |
| `search-filters.css` | `components/SearchFilters.jsx` |
| `chat.css` | `components/ChatWidget.jsx` |
| `wishlist.css` | `pages/WishlistPage.jsx` |
| `loyalty.css` | `pages/LoyaltyPage.jsx` |
| `address.css` | `pages/AddressManagement.jsx` |
| `auth.css` | `styles/auth.js`, `styles/forms.js`, `styles/messages.js` |
| `cart.css` | `pages/Cart.jsx` |
| `analytics.css` | `components/charts/Charts.jsx`, `pages/AnalyticsPage.jsx`, `viz-*` tokens |
| `admin.css` | `styles/admin.js` |
| `order-history.css` | `pages/OrderHistory.jsx`, `styles/status.js` |
| `profile.css` | `pages/Profile.jsx`, `components/NotificationToggle.jsx` |
| `landing.css` | `pages/Landing.jsx` |
| `style.css` | `styles/layout.js`, `components/Hero.jsx`, tokens and globals in `tailwind.css` |
| `blog.css`, `reviews.css` | **deleted** — both styled features unreachable in the running app |

Shared modules in `src/styles/`: `buttons` · `forms` · `messages` · `glass` ·
`shop` · `auth` · `admin` · `feedback` · `status` · `layout`. Each exists
because a class was declared in more than one stylesheet, so which declaration
applied depended on `App.jsx`'s import order rather than on anything local.

`landing.css` and `style.css` had to move in the same commit: landing's mobile
drawer rules were `.landing-header .navbar .nav-menu .nav-link`-shaped
overrides of style.css's `.navbar .nav-menu .nav-link`, both (0,3,0) or higher,
against a utility's (0,1,0). Whichever moved first would have lost to the other.

Preflight came on in that same commit, because `@tailwind base` is what
replaces the reset style.css was carrying. Splitting them would have left an
intermediate commit with bullets on every list and default margins everywhere.

A further 204 lines went with `style.css` without being migrated at all: the
cart button, the user dropdown, `@keyframes dropdownFadeIn`, `.mobile-icons`
and `.mobile-cart-btn` were the deleted `components/Header.jsx`'s, orphaned by
the navigation rebuild and left behind styling nothing.

## Faults found by reading the rules against the markup

None of these produced a pixel diff, because the rules were never rendering.
That is the main lesson of the second half of this migration: a screenshot
comparison cannot see a rule that does not match anything.

- **`order-history.css` had been written against different markup than
  shipped.** Fifteen classes the component renders were declared nowhere;
  seven the file declared were rendered by nothing. Same design, two sets of
  names. The heading was UA-default black on the dark page, the status badge
  was an unshaped colour block, and the five-step order tracker stacked
  vertically because its flex row and progress rail were never in the markup.
- **Reset Password's submit button was `.submit-button`**, declared nowhere —
  a bare browser button where four sibling pages show the amber one.
- **Verify Email was unstyled apart from `.spinner`**, and its failure state
  offered a white-on-white button, only reachable through an expired link.
- **The checkout `<legend>` was black on #2a2a2a**, about 1.3:1: it inherits
  its colour and nothing from `<body>` down sets one.
- **`.payment-option` asked for `display: flex` and never got it** — (0,1,0)
  against `.payment-form label`'s (0,1,1).
- **`.item-price` was declared in two files**, and cart.css's `!important`
  colour beat order-history.css's on the order history page.
- **`.loading` was declared nowhere**, so three admin messages were black on
  #252525.
- **The notification opt-in was built for a dark surface** and renders on
  `--light-pink-color`: invisible panel, invisible "on" button.
- **Order status colours existed in four places**, and the copy that shipped —
  a map inside a component — set no foreground colour.

## Traps

Each of these cost real time and would silently damage whatever is migrated
next, so they are worth reading before continuing.

**(Historical — Preflight is on now, and both of these go away with it.)**

**Preflight off meant `border-*` utilities had no style.** Tailwind's border
utilities set a width and a colour but never `border-style`; that normally
arrives with Preflight, which is disabled while the legacy stylesheets are
loaded. `border-2` therefore computes to a two-pixel border of style `none` —
zero pixels wide. Always pair it with `border-solid`. Adding a global
`*{border-style:solid}` instead was tried and reverted: it put borders on
legacy elements that set a width without a style, changing eight pages.

**…and a one-sided border needed the other three sides zeroed.** This is the
sharp edge of the rule above and it has already caused two regressions.
`border-solid` sets the style on *all four* sides; Preflight is what normally
sets every side's width to 0, so without it the sides you did not name fall
back to the CSS initial width `medium` — about 3px. `border-b border-solid`
therefore draws a full box. Write `border-x-0 border-t-0 border-b
border-solid`: those touch different properties from each other, so unlike
`border-0 border-b` there is no stylesheet-order tie-break involved. The
loyalty tier rows were 3px too tall this way, and the chat input row was
carrying 3px on three sides for several commits before anyone measured it.

**A class name that does not exist in the source text is never generated.**
Tailwind finds classes by scanning files as text, so
`hover:${lift.split(' ').join(' hover:')}` produces nothing at all — the names
only exist once the string is evaluated. Every variant is spelled out in full.

**`hover:[&>td]:` is not "on hover, the cells".** Tailwind composes it as
`.class > td:hover`, the one cell under the pointer, and `last:[&>td]:` as
`> td:last-child`, the rightmost cell of every row rather than the cells of the
last row. The pseudo-class has to go inside the arbitrary selector:
`[&:hover>td]` and `[&:last-child>td]`. Both forms read plausibly and both of
the wrong ones were briefly committed.

**`tabular-nums` is dead with Preflight off,** for the same reason transforms
were: it composes its value from five `--tw-numeric-*` variables that Preflight
declares. Written as a raw `[font-variant-numeric:tabular-nums]` instead.

**A `max-[900px]:` variant is not `@media (max-width: 900px)`.** The arbitrary
form compiles to `not all and (min-width: 900px)`, which stops a hundredth of a
pixel short. The three legacy widths are named screens — `to-900`, `to-768`,
`to-600` — using `{ max: ... }`, which emits the query exactly. Verified in the
built CSS that Tailwind emits them after the base utilities, and `to-600` after
`to-900`, which is the cascade the source files relied on.

**Conflicting utilities are resolved by stylesheet order, not class order.**
Appending `h-[120px]` to a shared base already holding `h-[50px]` does not
override it — whichever Tailwind emits later wins, which can change between
builds. Keep any property that varies per element out of the shared base.
This one is nasty because it can look correct until an unrelated rebuild.

**Some legacy rules match more elements than their name suggests.** The
checkbox labels in the filter bar were picking up a font size *and* a bottom
margin from the group-heading rule. Restoring only the size left every row 8px
short. When a rule's selector is broader than its name, check what else it hits
before deleting it.

**A component stylesheet can hold global declarations.** `about.css` contained
a `:root` block inside a 900px media query that retuned the type scale for the
entire site. It now lives in `style.css` next to the tokens it overrides.

**An unscoped declaration styles the whole app, and ties go to import order.**
`auth.css` declared `.form-group` bare while the other four files scoped
theirs. `.form-group label` and `.payment-form label` both score 0,1,1, and
App.jsx imports auth.css after cart.css, so auth won every tie on the checkout
form — dark labels on a dark panel, and a `#fafafa` input that kept cart's
`color: #fff`, making typed text invisible. Nobody would find that by reading
either file alone. Before deleting a shared rule, check what its removal
*restores* as well as what it takes away: here the fix was simply letting
cart.css style its own form again.

## Shared classes across stylesheets

Some class names are declared in more than one stylesheet, so which declaration
applies depends on the import order in `App.jsx` rather than on anything local.
This is the main reason files cannot simply be taken one at a time.

`.btn-primary` / `.btn-secondary` were the worst case and are **now resolved**:
declared in both `cart.css` and `landing.css`, with `landing.css` imported
later and therefore winning the colours and hover on all four consuming pages,
while `cart.css` kept the box. The cart's secondary button rendered as
landing's transparent white-bordered button rather than the solid grey
`cart.css` asks for. Both now live in `styles/buttons.js`.

`.form-group` is **now resolved** and turned out to be a narrower problem than
its five declarations suggested: only `auth.css` declared it bare, and the
other four are scoped (`.payment-form`, `.address-form`, `.edit-form`,
`.review-form`). Those four can safely be migrated one at a time. The bare
rules now live in `styles/forms.js`; see the trap above for what they were
doing to the cart.

Still outstanding:

- `.loading-container` / `.spinner` — used by the wishlist and account pages,
  declared elsewhere.
- `.section-title` — declared in `style.css` and overridden per section. The
  dark-section variant already lives in `styles/shop.js`.

## Suggested order for the rest

1. ~~Lift `.form-group`~~ — done, in `styles/forms.js`.
2. ~~`loyalty.css`~~ — done. `address.css` next; it is self-contained and the
   harness now opens its form.

   **`blog.css` is blocked, not skipped.** There are no blog posts in the
   database and the seeder only handles menu items, so `/blog` renders an empty
   grid and `/blog/:slug` has nothing to open. Migrating it would leave the
   card, badge, meta, grid and the entire detail page unverified — the wishlist
   trap again. Creating posts needs an admin account, and the `ADMIN_EMAIL` and
   `ADMIN_PASSWORD` in `backend/.env` do not authenticate, so that user does not
   exist. Either seed posts first or accept that this file cannot be checked.
3. `auth.css` — what remains after the form lift: the split-panel layout, the
   header, the divider and `.field-error`, across five components (`Login`,
   `Register`, `ForgotPassword`, `ResetPassword`, `VerifyEmail`).
4. `cart.css` and `landing.css` — their button rules are already gone, so
   what remains is page-local.
5. `profile.css`, `order-history.css`, `admin.css`, `analytics.css`.
6. `style.css` last: it holds the tokens, the reset and the header, so it is
   what everything else is measured against.
7. Once no legacy stylesheet remains, turn Preflight on in
   `tailwind.config.js`, drop the `border-solid` pairings, and re-run the diff.
   Expect real changes here — Preflight resets `img`, headings and lists — so
   this is its own commit with its own review.

## Verifying a page that needs data

The harness signs in, seeds a cart and seeds a wishlist. A route that renders
only an empty state proves almost nothing, so before migrating a data-driven
page, check that the captured screenshot actually shows the component. Extend
`seedWishlist` in `scripts/ui-snapshot.mjs` for the equivalent on other pages —
orders, reviews and loyalty all currently capture empty.

It also captures two states that only exist after a click: `cart-checkout`
(which types into the fields, so text-against-background contrast is recorded
rather than assumed) and `addresses-form`. Add an `expand` step to `ROUTES` for
any other UI hidden behind a button, or the run will report a confident 0.00%
for a page it never actually rendered.

**Capture every kind of user, not just every route.** Until the navigation
rebuild this harness only ever signed in as a customer, so the staff links were
never in a single screenshot — and the wrapped navbar and the wrecked analytics
page went out under a run that reported 0.00% across the board. The admin
routes are now captured in a session of their own, gated on
`UISNAP_ADMIN_EMAIL` and `UISNAP_ADMIN_PASSWORD`:

```
UISNAP_ADMIN_EMAIL=... UISNAP_ADMIN_PASSWORD=... npm run ui:baseline
```

Without them the staff pages are skipped and the run says so. Create a staff
account with `npm run create-admin` in `backend/`; it will not touch an
existing user with that email.

`reviews.css` is a special case: `components/Reviews.jsx` is not imported
anywhere, so nothing it styles is reachable in the running app. Migrating that
file cannot be verified by screenshot, and is probably not worth doing before
deciding whether the component should be mounted or deleted.

## Two false positives worth knowing about

The harness disagreed with itself before these were fixed, which is worse than
a wrong answer because the number still looks authoritative:

- **Webfonts landing after the screenshot.** Every glyph shifts a pixel or two
  and the whole page lights up — `contact-desktop` read 0.96% on one run and
  0.00% on the next with identical code. Fixed by awaiting `document.fonts.ready`.
- **A blinking text caret** in whichever field was filled last, caught in
  roughly half the screenshots. Fixed by blurring before capture.

- **The pulsing chat launcher and late-loading images.** The launcher animates
  forever, so it was caught at a different point each run, and the header logo
  arriving late shifted the layout under the capture. Fixed by waiting on
  `document.images` and injecting a stylesheet that disables all animation and
  transition before the screenshot.

If a diff shows uniform ghosting across the entire page rather than a change
in one region, suspect the harness before the CSS — and confirm it by
capturing twice without touching the code.

- **Smooth scrolling.** The about page scrolls to its contact anchor on mount,
  and a full-page screenshot draws fixed elements — the nav, the cart bubble —
  wherever the viewport is mid-glide: ~1% desktop, ~3% mobile, on a page nothing
  had touched. The page now honours `prefers-reduced-motion` and the harness
  emulates it.
- **Rate limiting.** Several captures back to back trip the API limiter. A 429
  used to sail through: every protected route bounced to /login, every
  screenshot came out at viewport height, and the diff reported that most of
  the site had changed size. It now refuses to capture without a session,
  because a comparison built on a failed login is fabricated, not degraded.

**Still outstanding:** `cart-checkout-mobile` reports around 0.9% between runs
of identical code. It is confined to the mobile header — the logo ghosts
vertically and the launcher still shows — while the page body is clean. Do not
read a sub-1% result on that one capture as a real change until this is
tracked down; when migrating `cart.css`, compare the body region.

## The navigation rebuild

The fixed top header is gone. `components/Header.jsx` was deleted and replaced
by `components/FloatingNav.jsx`, a translucent bar docked at the bottom, and
the staff links moved into a separate admin console at `/admin/*` behind
`AdminRoute`. Three defects drove it, and all three were invisible to this
harness because every run signed in as a customer:

- **The bar wrapped for staff.** Seven links did not fit, so it grew to two
  lines — taller than the 100px of clearance every page allowed — and painted
  the headings on Order, Merchandise and Contact underneath itself.
- **`header` was styled as a bare element selector** in `style.css`:
  `position: fixed; width: 100%; z-index: 5; background: var(--primary-color)`.
  That caught *every* `<header>` in the app. The analytics page's title row is
  a `<header>`, so it was torn out of the flow, painted maroon and dropped over
  the metric cards, hiding three of five labels and the "90 days" button. It is
  now scoped to `.landing-header`.
- **The cart was unreachable on desktop.** Its button lived in `.mobile-icons`,
  which `style.css` hides above 768px, so adding an item produced no
  confirmation and offered no way to the basket. The nav now carries a
  permanent cart item with a count badge, and `components/CartToast.jsx`
  confirms each add.

Page paddings that existed only to clear the old header came down from 100px to
40px. The `Customer` wrapper in `App.jsx` carries `bg-dark`, because a bare
padding box is transparent and the white body showed through as a band under
every dark page.

**Opacity modifiers do not work on the themed colours.** `white`, `primary` and
the rest map to `var(--*)`, so `text-white/75` compiles to
`rgb(var(--white-color) / 0.75)`; the token holds `#fff` rather than the
`255 255 255` triplet that syntax needs, the declaration is invalid, and the
browser drops it. On an anchor that means no colour at all and the link falls
back to UA blue — which is exactly how the first floating nav rendered. Use
`styles/glass.js`, which keeps the alpha in literal rgba.

## Shared classes still to resolve

`.form-actions` is declared bare in `profile.css` and `reviews.css`, so which
one applies is decided by import order rather than by either page. It currently
resolves to `gap: 10px` from reviews.css and `margin-top: 20px`, which
`profile.css` now states explicitly rather than inheriting from the deleted
address.css. Profile's own file asks for 15px and 30px and has never got
either. Whether to keep the resolved values or honour profile's intent is a
deliberate decision, and worth taking when profile.css is migrated.

Note that `reviews.css` wins several of these ties despite
`components/Reviews.jsx` never being imported — a stylesheet for an unmounted
component is currently styling live pages.

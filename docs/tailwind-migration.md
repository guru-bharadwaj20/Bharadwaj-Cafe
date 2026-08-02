# Tailwind migration

Status of the move from twenty hand-written stylesheets to Tailwind utilities,
and the traps found so far. The rule for the whole exercise is that the site
must not change appearance, which is checked rather than asserted:

```
npm run ui:baseline   # before a batch
npm run ui:after      # after it
npm run ui:diff       # per-page percentage of pixels changed
```

Both servers must be running. Every route is captured at 1440px and 390px,
signed in, with a seeded cart. Expect a permanent ~0.2% delta on the profile
pages: each run registers a throwaway account, so the name on screen differs.

## Done — 10 of 20 stylesheets

| Stylesheet | Replaced by | Diff |
| --- | --- | --- |
| `footer.css` | `components/Footer.jsx` | 0.00% |
| `about.css` | `components/About.jsx` | 0.00% |
| `contact.css` | `components/Contact.jsx` | 0.00% |
| `order.css`, `merchandise.css` | `styles/shop.js` | 0.00% |
| `search-filters.css` | `components/SearchFilters.jsx` | 0.00% |
| `chat.css` | `components/ChatWidget.jsx` | structural |
| `wishlist.css` | `pages/WishlistPage.jsx` | 0.00% |
| button rules in `cart.css` + `landing.css` | `styles/buttons.js` | 0.00% |
| `.form-group` rules in `auth.css` | `styles/forms.js` | 0.00%, cart fixed |
| `loyalty.css` | `pages/LoyaltyPage.jsx` | 0.00% |
| `address.css` | `pages/AddressManagement.jsx` | intentional, see below |

The chat widget is checked structurally rather than by pixels: its panel holds
a live Gemini reply, so the text differs between runs. Panel size, message
border-radius, alignment and colours were compared instead.

The addresses route is the one migration that deliberately changes the page,
because it was broken. It had no top offset and no background, so with the
site header fixed at 90px the heading sat behind the navbar as white text on
the default white page, and the "Add New Address" button — the only way to add
one — could not be clicked at all. Its card actions were also coloured by
`button:nth-child()`, so on the default address, where "Set as Default" is not
rendered, every button shifted a position and Delete came out blue.

## Remaining — 10 stylesheets

`admin` · `analytics` · `auth` · `blog` · `cart` · `landing` ·
`order-history` · `profile` · `reviews` · `style`

## Traps

Each of these cost real time and would silently damage whatever is migrated
next, so they are worth reading before continuing.

**Preflight is off, so `border-*` utilities have no style.** Tailwind's border
utilities set a width and a colour but never `border-style`; that normally
arrives with Preflight, which is disabled while the legacy stylesheets are
loaded. `border-2` therefore computes to a two-pixel border of style `none` —
zero pixels wide. Always pair it with `border-solid`. Adding a global
`*{border-style:solid}` instead was tried and reverted: it put borders on
legacy elements that set a width without a style, changing eight pages.

**…and a one-sided border needs the other three sides zeroed.** This is the
sharp edge of the rule above and it has already caused two regressions.
`border-solid` sets the style on *all four* sides; Preflight is what normally
sets every side's width to 0, so without it the sides you did not name fall
back to the CSS initial width `medium` — about 3px. `border-b border-solid`
therefore draws a full box. Write `border-x-0 border-t-0 border-b
border-solid`: those touch different properties from each other, so unlike
`border-0 border-b` there is no stylesheet-order tie-break involved. The
loyalty tier rows were 3px too tall this way, and the chat input row was
carrying 3px on three sides for several commits before anyone measured it.

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

**Still outstanding:** `cart-checkout-mobile` reports around 0.9% between runs
of identical code. It is confined to the mobile header — the logo ghosts
vertically and the launcher still shows — while the page body is clean. Do not
read a sub-1% result on that one capture as a real change until this is
tracked down; when migrating `cart.css`, compare the body region.

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

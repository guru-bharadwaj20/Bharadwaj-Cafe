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

## Done — 8 of 20 stylesheets

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

The chat widget is checked structurally rather than by pixels: its panel holds
a live Gemini reply, so the text differs between runs. Panel size, message
border-radius, alignment and colours were compared instead.

## Remaining — 12 stylesheets

`address` · `admin` · `analytics` · `auth` · `blog` · `cart` · `landing` ·
`loyalty` · `order-history` · `profile` · `reviews` · `style`

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

Still outstanding:

- `.form-group` — declared in `address.css`, `auth.css`, `cart.css`,
  `profile.css` and `reviews.css`. Lift this next, the same way, before
  migrating any of those five files individually.
- `.loading-container` / `.spinner` — used by the wishlist and account pages,
  declared elsewhere.
- `.section-title` — declared in `style.css` and overridden per section. The
  dark-section variant already lives in `styles/shop.js`.

## Suggested order for the rest

1. **Lift `.form-group`** into a `styles/forms.js` module and update all five
   callers in one commit, exactly as was done for the buttons. Encode what the
   browser currently resolves to, then change it deliberately afterwards if
   the resolution is not what you want.
2. Self-contained pages, cheapest first: `blog.css`, `loyalty.css`,
   `reviews.css`, `address.css`.
3. `auth.css` — one stylesheet, five components (`Login`, `Register`,
   `ForgotPassword`, `ResetPassword`, `VerifyEmail`).
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
orders, addresses, reviews and loyalty all currently capture empty.

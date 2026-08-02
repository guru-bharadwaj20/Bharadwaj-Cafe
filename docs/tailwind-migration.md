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

## Done

| Stylesheet | Replaced by | Diff |
| --- | --- | --- |
| `footer.css` | `components/Footer.jsx` | 0.00% |
| `about.css` | `components/About.jsx` | 0.00% |
| `contact.css` | `components/Contact.jsx` | 0.00% |
| `order.css`, `merchandise.css` | `styles/shop.js` | 0.00% |
| `search-filters.css` | `components/SearchFilters.jsx` | 0.00% |

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

## The blocker for the rest

Several class names are defined in more than one stylesheet, so which
definition applies depends on the import order in `App.jsx` rather than on
anything local:

- `.btn-primary` / `.btn-secondary` — declared in both `cart.css` and
  `landing.css`, used by `Cart`, `Landing`, `OrderHistory` and `VerifyEmail`.
  `landing.css` is imported later and wins, so the cart's buttons currently
  take their text colour and hover from the landing page: maroon text rather
  than the black `cart.css` asks for, and a white hover rather than a darker
  amber. The padding still comes from `cart.css`. This is a live inconsistency,
  not only a migration hazard.
- `.form-group` — declared in `address.css`, `auth.css`, `cart.css`,
  `profile.css` and `reviews.css`.
- `.section-title` — declared in `style.css` and overridden per section.

The consequence is that these files cannot be migrated one at a time. Deleting
`cart.css` alone hands its buttons to `landing.css`, which changes them.

## Suggested order for the rest

1. **Shared primitives first.** Lift `.btn-primary`, `.btn-secondary` and
   `.form-group` into `styles/` modules and update all callers in one commit.
   Decide deliberately which of the competing definitions is correct — that is
   a design decision, not a mechanical one, and it is where the site stops
   looking inconsistent.
2. Self-contained pages, cheapest first: `chat.css`, `wishlist.css`,
   `blog.css`, `loyalty.css`, `reviews.css`, `address.css`.
3. `auth.css` — one stylesheet, five components (`Login`, `Register`,
   `ForgotPassword`, `ResetPassword`, `VerifyEmail`).
4. `cart.css` and `landing.css` together, after step 1.
5. `profile.css`, `order-history.css`, `admin.css`, `analytics.css`.
6. `style.css` last: it holds the tokens, the reset and the header, so it is
   what everything else is measured against.
7. Once no legacy stylesheet remains, turn Preflight on in
   `tailwind.config.js`, drop the `border-solid` pairings, and re-run the diff.
   Expect real changes here — Preflight resets `img`, headings and lists — so
   this is its own commit with its own review.

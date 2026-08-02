# Engineering notes

The detail behind the summary in the README: the defects that were found, how
they were found, and the times the measuring instrument was wrong.

Every figure here is a measurement. Where something is unverified, it says so.

---

## Defects found and fixed

Each of these was live in the running application.

| Fault | How it presented | Cause |
|---|---|---|
| **Checkout rejected whole baskets** | "the cart isn't working" | Merchandise carried invented ids like `merch-1` matching no document. The server rejected the order, and because the cart is shared, one t-shirt killed checkout for everything in it |
| **Phantom unbuyable products** | Six items that always failed | A hardcoded fallback menu rendered whenever a search matched *nothing*, with ids `"1"`–`"6"` |
| **Invisible checkout fields** | Typing produced nothing visible | `auth.css` declared `.form-group` unscoped, so it styled every form in the app. It won the specificity tie against `cart.css`, giving the phone input a `#fafafa` background while cart kept `color: #fff` — white text in a white box |
| **Unreadable headings** | "Your Cart" simply absent | `.section-title` is maroon: correct on light sections, **1.08:1** against the dark cart page. WCAG's floor for large text is 3:1. Now 17.40:1 |
| **The admin dashboard was open** | Nothing visible at all | `/admin` sat behind a check for *any* signed-in user. The API enforced roles so no data leaked, but the pages rendered for customers |
| **Analytics was wrecked** | Overlapping, unreadable | `style.css` styled the bare element selector `header`. The analytics title row *is* a `<header>`, so it was pulled out of the flow, painted maroon and dropped over the metric cards |
| **No way to reach the cart** | Add-to-cart felt like a no-op | The cart button lived in `.mobile-icons`, which `style.css` hid above 768px. On desktop there was no confirmation *and* no link |
| **Every CSS transform was dead** | Navbar 179px off-centre; nothing hovered | With Preflight disabled, Tailwind's `--tw-translate-y`, `--tw-rotate` and the rest were never declared. `translate(-50%, )` is invalid, so browsers dropped the declaration |
| **The filter bar wiped itself** | Two filters never held at once | Changing a filter set `loading`; the page returned early, unmounting the filter component and destroying its state mid-search |

---

## The visual-regression harness

Visual regressions do not show up in unit tests.
[`scripts/ui-snapshot.mjs`](../scripts/ui-snapshot.mjs) screenshots every route
at two widths, in both a customer and a staff session, and diffs them pixel by
pixel.

```bash
npm run ui:baseline     # before a change
npm run ui:after        # after it
npm run ui:diff         # per-page percentage of pixels changed
```

It seeds its own cart, wishlist and addresses, and opens the two forms that
exist only after a click — a route rendering an empty state proves nothing.

Responsiveness is checked the same way: **7 widths × 11 routes, zero horizontal
overflow.**

### Five times it was wrong

Each time, the number still looked authoritative.

| It reported | Actually | Fix |
|---|---|---|
| `contact-desktop` **0.96%**, then **0.00%** on identical code | A webfont landing after the screenshot, shifting every glyph | await `document.fonts.ready` |
| `cart-checkout-mobile` drifting ~1.4% run to run | A text caret caught mid-blink, plus the chat launcher's endless pulse | blur before capture, freeze all animation |
| **0.00% across the board** — while shipping a visibly broken navbar | Every run signed in as a *customer*, so the staff links were never in a single screenshot | capture an admin session too |
| `/contact` at ~1% desktop, ~3% mobile, on a page nothing had touched | The page smooth-scrolls to its anchor, and a full-page screenshot draws fixed elements wherever the viewport is mid-glide | honour `prefers-reduced-motion`, and emulate it |
| **Most of the site had changed size** | A 429: enough captures back to back tripped the API rate limiter, every protected route bounced to `/login`, and every screenshot came out at viewport height | refuse to capture without a session |

Two are worth remembering. The customer-only session meant a green board had
been measuring the wrong *kind of user* for the entire project. The 429 is
worse — a comparison built on a failed login is not degraded, it is fabricated,
and it read as a confident result.

**Outstanding:** a clean determinism re-run. The rate limiter is what stopped
the last attempt; the guard is in place, and the next run on a cooled-down
limiter is the check.

### Two changes were built, measured, and withdrawn

A global `*{border-style:solid}` (it put borders on eight pages) and a
`bg-dark` page spacer (it left a seam against the footer). Both are written up
in [tailwind-migration.md](tailwind-migration.md) rather than quietly deleted.

---

## What the stylesheet integration found

Folding twenty stylesheets into the components meant reading every rule against
the markup that actually renders it. That comparison found more broken pages
than the pixel diffs ever did — **because a rule that matches nothing produces
no diff.** It was never rendering in the first place.

| Page | What was wrong |
|---|---|
| **Order history** | The stylesheet had been written against **different markup than shipped**. Fifteen classes the component renders (`.order-header`, `.order-body`, `.order-status-badge`, `.order-item`, `.modal-close`, …) were declared in no stylesheet in the project, while the file carried `.order-card-header`, `.order-card-body`, `.order-status` and friends, which nothing rendered. Same design, two sets of names. The heading was browser-default black on the dark page, the status badge was a plain coloured block, and the five-step order tracker — designed as a row with a progress rail through it — **stacked vertically**, `flex: 1` inert on a non-flex parent |
| **Reset Password** | Its submit button was `.submit-button`, a class no stylesheet declares — a bare browser button where the other four auth pages show the amber one |
| **Verify Email** | Everything except `.spinner` was undeclared: a column of unstyled text under a raw glyph. Its failure state offered a white-on-white button, correct on the dark pages it was written for and invisible on the white auth card. Reaching that state needs an expired link, which is why nobody saw it |
| **Checkout** | The `<legend>` inherits its colour and nothing from `<body>` down sets one, so **"Payment" was black on #2a2a2a**, about 1.3:1. The labels below it were white because a `label` selector caught them; a legend is not a label |
| **Checkout** | `.payment-option` asked for `display: flex` and never got it — `.payment-form label` is (0,1,1) against its (0,1,0) — so every option rendered as a block with its `gap` and alignment inert |
| **Order history** | `.item-price` was declared in `cart.css` *and* `order-history.css`, and cart marked its colour `!important`. Line prices rendered in the cart's amber bold 18px next to the already-amber quantity; order-history's own white, right-aligned values lost every time |
| **Admin dashboard** | `.loading` was declared nowhere, so three "Loading…" messages rendered in browser-default black on #252525 |
| **Admin dashboard** | The tabs were styled by two stylesheets at once, silently taking `flex: 1`, `min-width: 200px`, `justify-content` and a font weight from the *account page's* file |
| **Account** | The notification opt-in was written for a dark surface — a 6%-white panel and a white-on-transparent "on" button — and renders on `--light-pink-color`. The panel was invisible, and so was the button once notifications were switched on |
| **Account** | 90px of mobile top padding, left over from clearing a fixed header the navigation rebuild had removed. Every other page came down to 40px; this one was missed |

Order status colours existed in **four** places: twice in `admin.css`, once in
`order-history.css`, and once as a map inside a component — the only copy that
shipped, and the one with no foreground colour, so `CONFIRMED` rendered black
on `#2196f3`. They are one module now.

---

## Design decisions

**Customer and staff are two separate applications over one API.** Not
tidiness: with `Dashboard` and `Analytics` in it, the customer navbar carried
seven links, wrapped onto a second line, and pushed page headings underneath
the fixed header. Splitting them fixed the layout and closed the authorisation
hole in the same change.

**No image lives in the repository.** All 31 are on Cloudinary, uploaded by
[`backend/scripts/uploadAssets.ts`](../backend/scripts/uploadAssets.ts), which
derives a deterministic `public_id` from each path — re-running finds the
existing asset instead of duplicating it. The URLs are committed in a manifest
and stored on menu documents, so stability matters. Anything rendering a
database-supplied URL passes through `resolveImage`, which maps a legacy
`img/latte.png` onto the manifest rather than 404-ing. Measured effect: the
service-worker precache fell from **37 entries / 11,429 KB to 5 / 417 KB**.

**Uploads never touch the API server.** Cloudinary is used with *signed direct
uploads* — the browser uploads straight to Cloudinary and the server only signs
the parameters (folder, timestamp, allowed formats). No multi-megabyte buffers
in Node's memory, no timeout on a slow connection, and a leaked signature
cannot be reused to upload anything, anywhere, forever.

**The order total is computed server-side.** The client sends ids and
quantities only. Prices shown during checkout are a preview; the server looks
up current prices and calculates the total itself.

**Shared styling lives in modules, not stylesheets.** `.btn-primary` was
declared in two files and which one applied depended on import order — the
cart's secondary button silently rendered as the landing page's. Ten such
patterns now live in [`frontend/src/styles/`](../frontend/src/styles/), each
encoding what the browser *actually resolved to* rather than what either file
asked for, so lifting them changed nothing on screen. Where the resolved value
was clearly not the intent, the difference is stated in the module and in the
commit rather than quietly corrected.

**`alert()` appears nowhere.** All 23 were replaced by in-page notifications.
The browser dialog is modal, is labelled "localhost:5173 says", and has to be
dismissed by hand — for something as small as "added to wishlist".

---

## Related

- [tailwind-migration.md](tailwind-migration.md) — the stylesheet migration in
  full: what moved where, every trap, and both sides of each reversal.
- [adr/](adr/) — architecture decision records.

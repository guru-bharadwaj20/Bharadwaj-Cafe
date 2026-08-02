# Bharadwaj's Cafe

**A speciality-coffee ordering platform — with every fault found by measurement, and the measuring instrument audited too.**

[![CI](https://github.com/guru-bharadwaj20/Bharadwaj-Cafe/actions/workflows/ci.yml/badge.svg)](https://github.com/guru-bharadwaj20/Bharadwaj-Cafe/actions/workflows/ci.yml)
&nbsp;![node](https://img.shields.io/badge/node-22.x-339933?logo=node.js&logoColor=white)
&nbsp;![typescript](https://img.shields.io/badge/backend-TypeScript%20strict-3178C6?logo=typescript&logoColor=white)
&nbsp;![react](https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=black)
&nbsp;![tests](https://img.shields.io/badge/tests-279%20passing-brightgreen)
&nbsp;![images](https://img.shields.io/badge/images-Cloudinary%20%C2%B7%20none%20local-orange)
&nbsp;![styling](https://img.shields.io/badge/styling-Tailwind%20%C2%B7%201%20stylesheet-06B6D4?logo=tailwindcss&logoColor=white)

Customers browse a menu and merchandise catalogue, order, collect loyalty points and ask a Gemini-backed assistant for help. Staff get a separate console with a dashboard and analytics. React 18 + Vite, Express + TypeScript, MongoDB, Redis, Socket.IO.

**The verification is the point of this repository.** Ordering apps are easy to demo and easy to fool yourself about. Most of the work here went into finding the things that looked correct in a screenshot and were broken in a browser — into building a harness that could tell the difference, then catching that harness lying five times — and, latterly, into discovering that a whole class of fault produces *no* pixel diff at all, because the rule was never rendering to begin with.

<p align="center">
  <img src="docs/image.png" alt="Bharadwaj's Cafe landing page" width="100%" />
</p>

---

## What was actually wrong

Every row below was live in the app, and every one was found by measuring rather than by reading code.

| Fault | How it presented | Cause |
|---|---|---|
| **Checkout rejected whole baskets** | "the cart isn't working" | Merchandise carried invented ids like `merch-1` matching no document. The server rejected the order, and because the cart is shared, one t-shirt killed checkout for everything in it |
| **Phantom unbuyable products** | Six items that always failed | A hardcoded fallback menu rendered whenever a search matched *nothing*, with ids `"1"`–`"6"` |
| **Invisible checkout fields** | Typing produced nothing visible | `auth.css` declared `.form-group` unscoped, so it styled every form in the app. It won the specificity tie against `cart.css`, giving the phone input a `#fafafa` background while cart kept `color: #fff` — **white text in a white box** |
| **Unreadable headings** | "Your Cart" simply absent | `.section-title` is maroon: correct on light sections, **1.08:1** against the dark cart page. WCAG's floor for large text is 3:1. Now 17.40:1 |
| **The admin dashboard was open** | Nothing visible at all | `/admin` sat behind a check for *any* signed-in user. The API enforced roles so no data leaked, but the pages rendered for customers |
| **Analytics was wrecked** | Overlapping, unreadable | `style.css` styled the bare element selector `header`. The analytics title row *is* a `<header>`, so it was pulled out of the flow, painted maroon and dropped over the metric cards |
| **No way to reach the cart** | Add-to-cart felt like a no-op | The cart button lived in `.mobile-icons`, which `style.css` hides above 768px. On desktop there was no confirmation *and* no link |
| **Every CSS transform was dead** | Navbar 179px off-centre; nothing hovered | Preflight was off for the migration, so Tailwind's `--tw-translate-y`, `--tw-rotate` and the rest were never declared. `translate(-50%, )` is invalid and browsers drop the whole declaration. Declared by hand until Preflight came on |
| **The filter bar wiped itself** | Two filters never held at once | Changing a filter set `loading`; the page returned early, unmounting the filter component and destroying its state mid-search |

---

## The harness, and how it lied

Visual regressions do not show up in unit tests. [`scripts/ui-snapshot.mjs`](scripts/ui-snapshot.mjs) screenshots every route at two widths and diffs them pixel by pixel.

```bash
npm run ui:baseline     # before a change
npm run ui:after        # after it
npm run ui:diff         # per-page percentage of pixels changed
```

It has been wrong five times, and each time the number still looked authoritative.

| It reported | Actually | Fix |
|---|---|---|
| `contact-desktop` **0.96%**, then **0.00%** on identical code | A webfont landing after the screenshot, shifting every glyph | await `document.fonts.ready` |
| `cart-checkout-mobile` drifting ~1.4% run to run | A text caret caught mid-blink, plus the chat launcher's endless pulse | blur before capture, freeze all animation |
| **0.00% across the board** — while shipping a visibly broken navbar | Every run signed in as a *customer*. The staff links were never in a single screenshot | capture an admin session too |
| `/contact` at ~1% desktop, ~3% mobile, on a page nothing had touched | The page smooth-scrolls to its anchor, and a full-page screenshot draws fixed elements wherever the viewport is mid-glide | honour `prefers-reduced-motion`, and emulate it |
| **Most of the site had changed size** | A 429. Enough captures back to back tripped the API limiter, every protected route bounced to `/login`, and every screenshot came out at viewport height | refuse to capture without a session |

Two are worth remembering. The customer-only session meant a green board had been measuring the wrong *kind of user* for the entire project. The 429 is worse: a comparison built on a failed login is not degraded, it is fabricated, and it read as a confident result. The harness now captures both kinds of user, seeds its own cart, wishlist and addresses, opens the two forms that exist only after a click, and throws rather than proceeding without a session.

**A clean determinism re-run is still outstanding.** The rate limiter is what stopped it; the guard is in place and the next run on a cooled-down limiter is the check.

**Two changes were built, measured, and withdrawn.** A global `*{border-style:solid}` (it put borders on eight pages) and a `bg-dark` page spacer (it left a seam against the footer). Both are written up in [docs/tailwind-migration.md](docs/tailwind-migration.md) rather than quietly deleted.

Responsiveness is measured the same way: **7 widths × 11 routes, zero horizontal overflow.**

---

## Run it

```bash
docker compose up --build
```

Web on `localhost:8080`, API on `localhost:5000`. No `.env` required — Compose ships working defaults.

<details>
<summary><b>Without Docker</b></summary>

```bash
# API — MongoDB and JWT_SECRET are the only hard requirements
cd backend && npm install
cp .env.example .env
npm run seed                 # menu + merchandise
npm run dev                  # :5000

# Web app
cd frontend && npm install
npm run dev                  # :5173
```

```bash
npm test                     # backend 238 · frontend 41
npm run create-admin         # staff account, from ADMIN_* in .env
npm run upload-assets        # push images to Cloudinary, regenerate the manifest
```
</details>

<details>
<summary><b>Environment</b> — what is required, and what degrades gracefully</summary>

| Variable | Without it |
|---|---|
| `MONGO_URI` | **Required.** Nothing runs |
| `JWT_SECRET` | **Required.** Auth refuses to start |
| `VITE_API_URL` | The build calls `localhost:5000` — fatal in production, so the bundle logs a loud console error instead of failing silently |
| `GEMINI_API_KEY` | The assistant is disabled; nothing else is affected |
| `CLOUDINARY_*` | New uploads return 503; existing images still render |
| `REDIS_URL` | Menu caching is skipped; queries go straight to Mongo |
| `GOOGLE_CLIENT_ID` | The Google button is not rendered; email sign-in is unaffected |
| `RAZORPAY_*` | Online payment is not offered; pay-on-collection still works |

Every optional integration is probed at startup and reported ([ADR 0002](docs/adr/0002-optional-infrastructure.md)). Nothing is hardcoded; no key is committed.
</details>

---

## How it works

```mermaid
flowchart LR
    A[Landing] --> B{Who?}
    B -->|Customer| C[/login]
    B -->|Staff| D[/admin/login]
    C --> E[Shop: menu, merch, cart]
    E --> F[Checkout]
    F --> G[Order + loyalty points]
    D --> H[AdminRoute<br/>role-gated]
    H --> I[Dashboard + Analytics]
    E -.-> J[Gemini assistant]
    G -.-> K[Socket.IO<br/>live order status]
```

Customer and staff are **two separate applications** over one API. That is not tidiness. With `Dashboard` and `Analytics` in it, the customer navbar carried seven links, wrapped onto a second line, and pushed page headings underneath the fixed header. Splitting them fixed the layout and closed the authorisation hole in the same change.

| Layer | Choice |
|---|---|
| API | Express + TypeScript (`strict`), Socket.IO |
| Data | MongoDB + Mongoose, Redis read-through cache |
| Web | React 18 + Vite, Tailwind, PWA with an owned service worker |
| Images | Cloudinary, signed direct uploads |
| Assistant | Google Gemini (`gemini-2.5-flash`) with function calling |

<details>
<summary><b>Decisions worth explaining</b></summary>

**No image lives in the repository.** All 31 are on Cloudinary, uploaded by [`backend/scripts/uploadAssets.ts`](backend/scripts/uploadAssets.ts), which derives a deterministic `public_id` from each path — re-running finds the existing asset instead of duplicating it. The URLs are committed in a manifest and stored on menu documents, so stability matters. Anything rendering a database-supplied URL passes through `resolveImage`, which maps a legacy `img/latte.png` onto the manifest rather than 404-ing. Measured effect: the service-worker precache fell from **37 entries / 11,429 KB to 5 / 417 KB**.

**Uploads never touch the API server.** Cloudinary is used with *signed direct uploads* — the browser uploads straight to Cloudinary and the server only signs the parameters (folder, timestamp, allowed formats). No multi-megabyte buffers in Node's memory, no timeout on a slow connection, and a leaked signature cannot be reused to upload anything, anywhere, forever.

**The order total is computed server-side.** The client sends ids and quantities only. Prices shown during checkout are a preview; the server looks up current prices and calculates the total itself.

**Shared styling lives in modules, not stylesheets.** `.btn-primary` was declared in two files and which one applied depended on import order — the cart's secondary button silently rendered as the landing page's. Ten such patterns now live in [`frontend/src/styles/`](frontend/src/styles/), each encoding what the browser *actually resolved to* rather than what either file asked for, so lifting them changed nothing on screen. Where the resolved value was clearly not the intent, the difference is stated in the module and in the commit rather than quietly corrected.

**`alert()` appears nowhere.** All 23 were replaced by in-page notifications. The browser dialog is modal, is labelled "localhost:5173 says", and has to be dismissed by hand — for something as small as "added to wishlist".
</details>

---

## Styling: 20 of 20 stylesheets integrated

The site began as twenty hand-written stylesheets. They are gone. Styling lives on the components as Tailwind utilities — **not concatenated into one CSS file** — and `src/tailwind.css` is the only stylesheet left, holding the three things a utility cannot express: the design tokens as custom properties, three global rules for elements no component owns (`html`, the `:focus-visible` ring, the reduced-motion override), and Tailwind itself.

The rule for the whole exercise was that the page must not change appearance, checked by pixel diff rather than asserted. Two of the twenty were **deleted** rather than migrated — `blog.css` and `reviews.css` both styled features unreachable in the running app — and 204 further lines of dead header CSS went with them, orphaned when the navigation rebuild deleted `components/Header.jsx`.

**Preflight is now on.** It stayed off for the whole migration because `style.css` shipped a reset the twenty files were written against, most visibly `img { width: 95% }`. Every image that relied on that global names its own width now, so the swap moves nothing. Turning it on also ends the two traps below.

**CSS ships at 53.8 KB, down from 75.5 KB — 10.1 KB gzipped, from 13.5.**

Patterns shared across components live in [`frontend/src/styles/`](frontend/src/styles/) as plain modules: `buttons` · `forms` · `messages` · `glass` · `shop` · `auth` · `admin` · `feedback` · `status` · `layout`. Each exists because a class was declared in more than one stylesheet and which declaration applied depended on import order rather than on anything local.

Traps, all documented with measurements in [docs/tailwind-migration.md](docs/tailwind-migration.md):

- **A one-sided border draws four sides.** `border-solid` sets the style on every side, and with Preflight off the unnamed ones fall back to `medium` (~3px). Cost two regressions before it was understood; Preflight now makes it moot.
- **Opacity modifiers break on themed colours.** `text-white/75` compiles to `rgb(var(--white-color) / 0.75)`; the token holds `#fff`, the declaration is invalid, and anchors fall back to **UA blue**.
- **Conflicting utilities resolve by emission order, not class order.** `${base} w-auto` does not override a `w-full` inside `base`. Every shared constant here is split so no two strings set the same property.
- **A dynamically built class name does not exist.** Tailwind finds classes by scanning source *text*, so `hover:${lift.split(' ').join(' hover:')}` generates nothing at all. Caught before shipping; every variant is spelled out in full.
- **`hover:[&>td]:` is not "on hover, the cells".** Tailwind composes it as `.class > td:hover` — the one cell under the pointer — and `last:[&>td]:` as `> td:last-child`, the rightmost cell of *every* row. The pseudo has to go inside: `[&:hover>td]`. Both read plausibly and both were wrong.
- **A selector can be broader than its name.** The bare `header` rule is the one that destroyed the analytics page.

### What integrating them turned up

Folding twenty stylesheets into the components meant reading every rule against the markup that actually renders it. That comparison found more broken pages than the pixel diffs ever did, because a rule that matches nothing produces no diff — it was never rendering in the first place.

| Page | What was wrong |
|---|---|
| **Order history** | The stylesheet had been written against **different markup than shipped**. Fifteen classes the component renders (`.order-header`, `.order-body`, `.order-status-badge`, `.order-item`, `.modal-close`, …) were declared in no stylesheet in the project, while the file carried `.order-card-header`, `.order-card-body`, `.order-status` and friends, which nothing rendered. Same design, two sets of names. The heading was UA-default black on the dark page, the status badge was a plain coloured block, and the five-step order tracker — designed as a row with a progress rail through it — **stacked vertically**, `flex: 1` inert on a non-flex parent |
| **Reset Password** | Its submit button was `.submit-button`, a class no stylesheet declares. A bare browser button where the other four auth pages show the amber one |
| **Verify Email** | Everything except `.spinner` was undeclared. A column of unstyled text under a raw glyph. Its failure state offered a white-on-white button — correct on the dark pages it was written for, invisible on the white auth card, and only reachable via an expired link |
| **Checkout** | The `<legend>` inherited its colour and nothing from `<body>` down sets one, so **"Payment" was black on #2a2a2a**, about 1.3:1. The two labels below it were white because a `label` selector caught them; a legend is not a label |
| **Checkout** | `.payment-option` asked for `display: flex` and never got it — `.payment-form label` is (0,1,1) against its (0,1,0), so every option rendered as a block with its `gap` and alignment inert |
| **Order history** | `.item-price` was declared in `cart.css` *and* `order-history.css`, and cart marked its colour `!important`. Line prices rendered in the cart's amber bold 18px next to the already-amber quantity; order-history's own white, right-aligned values lost every time |
| **Admin dashboard** | `.loading` was declared nowhere, so three "Loading…" messages rendered in UA-default black on #252525 |
| **Admin dashboard** | The tabs were styled by two stylesheets at once, silently taking `flex: 1`, `min-width: 200px`, `justify-content` and a font weight from the *account page's* file |
| **Account** | The notification opt-in was written for a dark surface — a 6%-white panel and a white-on-transparent "on" button — and renders on `--light-pink-color`. The panel was invisible, and so was the button once you switched notifications on |
| **Account** | 90px of mobile top padding, left over from clearing the fixed header the navigation rebuild removed. Every other page came down to 40px; this one was missed |

Order status colours existed in **four** places: twice in `admin.css`, once in `order-history.css`, and once as a map inside a component — the only copy that shipped, and the one with no foreground colour, so `CONFIRMED` was black on `#2196f3`. They are one module now.

---

## Project structure

```
backend/
  ├─ controllers/  route handlers        ├─ models/      Mongoose schemas
  ├─ routes/       Express routers       ├─ middleware/  auth, rate limits, errors
  ├─ config/       db · redis · cloudinary · assistant · googleAuth
  ├─ scripts/      uploadAssets.ts       └─ tests/       17 suites, 238 tests
frontend/src/
  ├─ components/   FloatingNav · CartBubble · CartToast · ToastHost · AdminLayout · …
  ├─ pages/        customer routes, plus the separate admin console
  ├─ context/      Auth · Cart · Toast
  ├─ styles/       buttons · forms · messages · glass · shop · auth
  │                admin · feedback · status · layout — shared patterns
  ├─ assets/       cloudinary.js — generated image manifest
  └─ tailwind.css  the only stylesheet: tokens, three globals, Tailwind
scripts/           ui-snapshot.mjs — the visual-regression harness
docs/              tailwind-migration.md, ADRs
e2e/               Playwright end-to-end specs
```

## Documentation

| | |
|---|---|
| **[docs/tailwind-migration.md](docs/tailwind-migration.md)** | Stylesheet-by-stylesheet status, every trap, and both sides of each reversal. |
| **[SETUP.md](SETUP.md)** | Environment setup, external services, deployment. |

---

## Deployment

The frontend deploys to **Vercel** from a cold clone. [`vercel.json`](vercel.json) at the repository root builds `frontend/` explicitly, so it works whether or not Root Directory is set, and carries the SPA rewrite alongside caching and security headers. The API is a long-running Express server and deploys separately ([`render.yaml`](render.yaml)).

Set `VITE_API_URL` in the Vercel environment. Without it the bundle calls `localhost:5000` — the visitor's own machine — and says so loudly in the console rather than leaving it to be diagnosed from failed requests.

---

*Numbers in this README are measurements. Where something is unverified, it says so.*

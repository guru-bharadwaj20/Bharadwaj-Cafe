# Bharadwaj's Cafe

**A speciality-coffee ordering platform — with every fault found by measurement, and the measuring instrument audited too.**

[![CI](https://github.com/guru-bharadwaj20/Bharadwaj-Cafe/actions/workflows/ci.yml/badge.svg)](https://github.com/guru-bharadwaj20/Bharadwaj-Cafe/actions/workflows/ci.yml)
&nbsp;![node](https://img.shields.io/badge/node-22.x-339933?logo=node.js&logoColor=white)
&nbsp;![typescript](https://img.shields.io/badge/backend-TypeScript%20strict-3178C6?logo=typescript&logoColor=white)
&nbsp;![react](https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=black)
&nbsp;![tests](https://img.shields.io/badge/tests-279%20passing-brightgreen)
&nbsp;![images](https://img.shields.io/badge/images-Cloudinary%20%C2%B7%20none%20local-orange)

Customers browse a menu and merchandise catalogue, order, collect loyalty points and ask a Gemini-backed assistant for help. Staff get a separate console with a dashboard and analytics. React 18 + Vite, Express + TypeScript, MongoDB, Redis, Socket.IO.

**The verification is the point of this repository.** Ordering apps are easy to demo and easy to fool yourself about. Most of the work here went into finding the things that looked correct in a screenshot and were broken in a browser — and into building a harness that could tell the difference, then catching that harness lying three times.

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
| **Every CSS transform was dead** | Navbar 179px off-centre; nothing hovered | Preflight is off, so Tailwind's `--tw-translate-y`, `--tw-rotate` and the rest were never declared. `translate(-50%, )` is invalid and browsers drop the whole declaration |
| **The filter bar wiped itself** | Two filters never held at once | Changing a filter set `loading`; the page returned early, unmounting the filter component and destroying its state mid-search |

---

## The harness, and how it lied

Visual regressions do not show up in unit tests. [`scripts/ui-snapshot.mjs`](scripts/ui-snapshot.mjs) screenshots every route at two widths and diffs them pixel by pixel.

```bash
npm run ui:baseline     # before a change
npm run ui:after        # after it
npm run ui:diff         # per-page percentage of pixels changed
```

It was wrong three times, and each time the number still looked authoritative.

| It reported | Actually | Fix |
|---|---|---|
| `contact-desktop` **0.96%**, then **0.00%** on identical code | A webfont landing after the screenshot, shifting every glyph | await `document.fonts.ready` |
| `cart-checkout-mobile` drifting ~1.4% run to run | A text caret caught mid-blink, plus the chat launcher's endless pulse | blur before capture, freeze all animation |
| **0.00% across the board** — while shipping a visibly broken navbar | Every run signed in as a *customer*. The staff links were never in a single screenshot | capture an admin session too |

The third is the one worth remembering: a green board had been measuring the wrong kind of user for the entire project. It now captures both, seeds its own cart, wishlist and addresses, and opens the two forms that exist only after a click — because a route rendering an empty state proves nothing.

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

**No image lives in the repository.** All 31 are on Cloudinary, uploaded by [`backend/scripts/uploadAssets.ts`](backend/scripts/uploadAssets.ts), which derives a deterministic `public_id` from each path — re-running finds the existing asset instead of duplicating it. The URLs are committed in a manifest and stored on menu documents, so stability matters. Anything rendering a database-supplied URL passes through `resolveImage`, which maps a legacy `img/latte.png` onto the manifest rather than 404-ing. Measured effect: the service-worker precache fell from **37 entries / 11,429 KB to 5 / 423 KB**.

**Uploads never touch the API server.** Cloudinary is used with *signed direct uploads* — the browser uploads straight to Cloudinary and the server only signs the parameters (folder, timestamp, allowed formats). No multi-megabyte buffers in Node's memory, no timeout on a slow connection, and a leaked signature cannot be reused to upload anything, anywhere, forever.

**The order total is computed server-side.** The client sends ids and quantities only. Prices shown during checkout are a preview; the server looks up current prices and calculates the total itself.

**Shared styling lives in modules, not stylesheets.** `.btn-primary` was declared in two files and which one applied depended on import order — the cart's secondary button silently rendered as the landing page's. Those now live in [`styles/buttons.js`](frontend/src/styles/buttons.js), `forms.js` and `glass.js`, encoding what the browser *actually resolved to*, so lifting them changed nothing on screen.

**`alert()` appears nowhere.** All 23 were replaced by in-page notifications. The browser dialog is modal, is labelled "localhost:5173 says", and has to be dismissed by hand — for something as small as "added to wishlist".
</details>

---

## Styling: 12 of 20 stylesheets integrated

The site began as twenty hand-written stylesheets. They are being folded into Tailwind utilities **on the components themselves** — not concatenated into one CSS file — under the rule that the page must not change appearance, checked by pixel diff rather than asserted.

**Integrated:** `footer` · `about` · `contact` · `order` · `merchandise` · `search-filters` · `chat` · `wishlist` · `loyalty` · `address`, plus the shared button and form rules. `blog.css` and `reviews.css` were **deleted** — both styled features that were unreachable in the running app.

**Remaining (8):** `style` · `landing` · `profile` · `order-history` · `admin` · `analytics` · `cart` · `auth`.

Preflight stays **off** until the last one is gone: it would reset `img`, headings and lists underneath every page not yet migrated. Turning it on is its own commit with its own review.

Four traps are documented in [docs/tailwind-migration.md](docs/tailwind-migration.md), each of which cost real time:

- **A one-sided border draws four sides.** `border-solid` sets the style on every side, and with Preflight off the unnamed ones fall back to `medium` (~3px). Write `border-x-0 border-t-0 border-b border-solid`.
- **Opacity modifiers break on themed colours.** `text-white/75` compiles to `rgb(var(--white-color) / 0.75)`; the token holds `#fff`, the declaration is invalid, and anchors fall back to **UA blue**.
- **Conflicting utilities resolve by stylesheet order, not class order.** A textarea silently collapsed 120px → 50px — and passed at 0.00% on the first check.
- **A selector can be broader than its name.** The bare `header` rule is the one that destroyed the analytics page.

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
  ├─ styles/       buttons · forms · glass · shop — shared patterns
  ├─ assets/       cloudinary.js — generated image manifest
  └─ *.css         8 legacy stylesheets still to fold in
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

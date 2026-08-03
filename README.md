# Bharadwaj's Cafe

**A full-stack ordering platform for a speciality coffee house**

[![CI](https://github.com/guru-bharadwaj20/Bharadwaj-Cafe/actions/workflows/ci.yml/badge.svg)](https://github.com/guru-bharadwaj20/Bharadwaj-Cafe/actions/workflows/ci.yml)
&nbsp;![node](https://img.shields.io/badge/node-22.x-339933?logo=node.js&logoColor=white)
&nbsp;![typescript](https://img.shields.io/badge/backend-TypeScript%20strict-3178C6?logo=typescript&logoColor=white)
&nbsp;![react](https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=black)
&nbsp;![tailwind](https://img.shields.io/badge/tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)
&nbsp;![tests](https://img.shields.io/badge/tests-279%20passing-brightgreen)
&nbsp;![licence](https://img.shields.io/badge/licence-MIT-blue)

Customers browse a menu and merchandise catalogue, place orders, collect
loyalty points and ask a Gemini-backed assistant for help. Staff get a separate,
role-gated console with a live dashboard and analytics.

<p align="center">
  <img src="docs/image.png" alt="Bharadwaj's Cafe landing page" width="100%" />
</p>

---

## Features

**For customers**

- Menu and merchandise browsing with search and dietary filters
- Cart, checkout, and online payment via Razorpay — or pay on collection
- Live order tracking over Socket.IO, with optional push notifications
- Loyalty points, a wishlist, and saved delivery addresses
- An AI assistant (Google Gemini) that can answer questions about the menu
- Installable as a PWA, and usable offline for browsing

**For staff**

- A separate console at `/admin`, gated on role rather than on being signed in
- Order management with status updates
- User management and menu administration
- An analytics dashboard — revenue over time, best sellers, peak hours — with a
  validated dark mode and a table fallback for every chart

---

## Tech stack

| Layer | Choice |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, PWA |
| **Backend** | Node.js, Express, TypeScript (`strict`), Socket.IO |
| **Data** | MongoDB with Mongoose, Redis read-through cache |
| **Media** | Cloudinary, via signed direct uploads |
| **AI** | Google Gemini (`gemini-2.5-flash`) with function calling |
| **Testing** | Vitest, Supertest, Playwright, plus a pixel-diff UI harness |

---

## Getting started

The fastest route is Docker — no `.env` needed, as Compose ships working
defaults.

```bash
docker compose up --build
```

Web on `localhost:8080`, API on `localhost:5000`.

<details>
<summary><b>Running without Docker</b></summary>

```bash
# API — MongoDB and JWT_SECRET are the only hard requirements
cd backend
npm install
cp .env.example .env
npm run seed          # menu + merchandise
npm run dev           # :5000

# Web app
cd frontend
npm install
npm run dev           # :5173
```

Useful scripts:

```bash
npm test              # backend 238 · frontend 41
npm run create-admin  # create a staff account from ADMIN_* in .env
npm run upload-assets # push images to Cloudinary, regenerate the manifest
```
</details>

<details>
<summary><b>Environment variables</b> — what is required, and what degrades gracefully</summary>

| Variable | Without it |
|---|---|
| `MONGO_URI` | **Required.** Nothing runs |
| `JWT_SECRET` | **Required.** Auth refuses to start |
| `VITE_API_URL` | The build calls `localhost:5000` — fatal in production, so the bundle logs a loud console error rather than failing silently |
| `GEMINI_API_KEY` | The assistant is disabled; nothing else is affected |
| `CLOUDINARY_*` | New uploads return 503; existing images still render |
| `REDIS_URL` | Menu caching is skipped; queries go straight to MongoDB |
| `GOOGLE_CLIENT_ID` | The Google button is not rendered; email sign-in is unaffected |
| `RAZORPAY_*` | Online payment is not offered; pay-on-collection still works |

Every optional integration is probed at startup and reported
([ADR 0002](docs/adr/0002-optional-infrastructure.md)). Nothing is hardcoded and
no key is committed.
</details>

---

## Architecture

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

Customer and staff are two separate front-end applications over one API. The
order total is always computed server-side: the client sends item ids and
quantities, never prices.

```
backend/
  ├─ controllers/  route handlers        ├─ models/      Mongoose schemas
  ├─ routes/       Express routers       ├─ middleware/  auth, rate limits, errors
  ├─ config/       db · redis · cloudinary · assistant · googleAuth
  ├─ scripts/      uploadAssets.ts       └─ tests/       17 suites, 238 tests
frontend/src/
  ├─ components/   shared UI
  ├─ pages/        customer routes, plus the separate admin console
  ├─ context/      Auth · Cart · Toast
  ├─ styles/       shared Tailwind patterns as plain modules
  ├─ assets/       cloudinary.js — generated image manifest
  └─ tailwind.css  the only stylesheet: design tokens, three globals, Tailwind
scripts/           ui-snapshot.mjs — the visual-regression harness
e2e/               Playwright end-to-end specs
```

---

## Engineering notes

Two things about this codebase are worth calling out, because both were
deliberate and both are documented rather than asserted.

**Styling is entirely Tailwind.** The project began as twenty hand-written
stylesheets, all of which have been folded into utilities on the components
themselves — not concatenated into a single CSS file. `src/tailwind.css` is the
only stylesheet left, holding the design tokens, three genuinely global rules,
and Tailwind. Shipped CSS fell from **75.5 KB to 53.8 KB** (13.5 → 10.1 KB
gzipped). Patterns used by more than one component live in
[`frontend/src/styles/`](frontend/src/styles/) as plain modules.

**Behaviour is verified by measurement.** Unit and integration tests cover the
API and the cart; a Playwright pixel-diff harness
([`scripts/ui-snapshot.mjs`](scripts/ui-snapshot.mjs)) covers the UI across
every route, two widths and both kinds of user. Responsiveness is checked at
7 widths × 11 routes for horizontal overflow.

That harness also turned out to be wrong five times — and the stylesheet
migration surfaced a class of defect it could never have caught, because a CSS
rule that matches nothing produces no visual diff. Both are written up, with
measurements, in **[docs/engineering-notes.md](docs/engineering-notes.md)**.

---

## Deployment

The frontend deploys to **Vercel** from a cold clone. [`vercel.json`](vercel.json)
at the repository root builds `frontend/` explicitly, so it works whether or not
a Root Directory is configured, and carries the SPA rewrite alongside caching
and security headers.

The API is a long-running Express server and deploys separately
([`render.yaml`](render.yaml)).

> Set `VITE_API_URL` in the Vercel environment. Without it the bundle calls
> `localhost:5000` — the visitor's own machine — and every request fails in a
> way that looks like an outage.

---

## Documentation

| | |
|---|---|
| [docs/engineering-notes.md](docs/engineering-notes.md) | Defects found and fixed, how the UI harness works and the five times it lied, and the design decisions behind the structure. |
| [docs/tailwind-migration.md](docs/tailwind-migration.md) | The stylesheet migration in full — what moved where, every trap, and both sides of each reversal. |
| [docs/adr/](docs/adr/) | Architecture decision records. |
| [SETUP.md](SETUP.md) | Environment setup, external services, deployment. |

---

## Licence

[MIT](LICENSE) © Guru R Bharadwaj

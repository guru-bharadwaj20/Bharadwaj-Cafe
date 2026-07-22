# Bharadwaj's Cafe

[![CI](https://github.com/guru-bharadwaj20/Bharadwaj-Cafe/actions/workflows/ci.yml/badge.svg)](https://github.com/guru-bharadwaj20/Bharadwaj-Cafe/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-22.x-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/backend-TypeScript%20strict-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=black)
![Tests](https://img.shields.io/badge/tests-255%20passing-brightgreen)

A full-stack ordering platform for a coffee shop: real-time order tracking,
payments, inventory, loyalty, analytics, and an AI support assistant.

The interesting parts are not the CRUD. They are the concurrency handling on
stock, the fact that no monetary value is ever read from a request body, and
the tool-scoping that makes the AI assistant safe against prompt injection.
Those decisions are written up in [`docs/adr/`](docs/adr/).

---

## Run it

```bash
docker compose up --build
```

Web on `http://localhost:8080`, API on `http://localhost:5000`. No `.env`
needed — Compose ships working defaults.

Or without Docker:

```bash
# Terminal 1
cd backend && npm install && cp .env.example .env   # set MONGO_URI and JWT_SECRET
npm run seed && npm run dev

# Terminal 2
cd frontend && npm install && npm run dev
```

**Every external service is optional.** Redis, payments, image uploads, push
notifications, the AI assistant and SMTP each degrade to a defined fallback
when unconfigured — see [ADR 0002](docs/adr/0002-optional-infrastructure.md).
A clone with only `MONGO_URI` and `JWT_SECRET` set is fully usable.

---

## Architecture

```
┌──────────────┐        ┌─────────────────────────────┐        ┌───────────┐
│  React SPA   │◄──────►│  Express + Socket.io API    │◄──────►│  MongoDB  │
│  (Vite, PWA) │  REST  │  TypeScript, strict         │        └───────────┘
└──────────────┘   WS   │                             │
                        │  ┌───────────────────────┐  │        ┌───────────┐
                        │  │ pricing · inventory   │  │◄──────►│   Redis   │
                        │  │ payments · analytics  │  │        │  (opt.)   │
                        │  │ assistant · uploads   │  │        └─────┬─────┘
                        │  └───────────────────────┘  │              │
                        └──────────────┬──────────────┘              │
                                       │                             │
                        ┌──────────────▼──────────────┐              │
                        │  BullMQ worker (separate)   │◄─────────────┘
                        │  email · reconciliation     │
                        └─────────────────────────────┘
```

The worker is a separate process on purpose: a burst of email retries competes
for its own CPU rather than the event loop serving customers.

| Layer | Choice | Why |
|---|---|---|
| API | Express + TypeScript (`strict`) | Types on the money and auth paths first — [ADR 0005](docs/adr/0005-typescript-backend-only.md) |
| Data | MongoDB + Mongoose | Document shape fits orders; aggregation pipelines drive analytics |
| Real-time | Socket.io, room-scoped | Orders and chat are personal data; nothing is broadcast globally |
| Cache / queue | Redis + BullMQ (optional) | Shared rate limits, multi-instance sockets, email off the request path |
| Payments | Razorpay, signature-verified | Webhook is the authority, not the browser |
| AI | Claude with scoped tools | Reads live data; cannot be redirected to another customer |

---

## What it does

**Ordering.** Menu with search and dietary filters, cart, checkout with
takeaway/dine-in/delivery, live order tracking over WebSocket.

**Money.** Razorpay checkout with signature-verified webhooks. Idempotent —
the checkout callback and the webhook can both arrive, in either order, and
Razorpay retries for days.

**Inventory.** Optional per-item stock with race-safe reservation. Ten
simultaneous orders for the last unit produce exactly one sale.

**Loyalty.** Points and tiers awarded on delivery, with a nightly job that
reconciles tiers against actual lifetime spend.

**Analytics.** Revenue over time, best sellers, peak hours, and
period-over-period growth — all computed by aggregation pipeline.

**Support.** An AI assistant answers from live menu, order and loyalty data,
and hands over to staff when it cannot help.

**Also.** Reviews, wishlists, saved addresses, a blog, admin dashboard,
installable PWA with an offline menu, and push notifications for order status.

---

## Quality

| Check | Command | Result |
|---|---|---|
| Backend tests | `npm test --prefix backend` | 210 passing |
| Frontend tests | `npm test --prefix frontend` | 41 passing |
| End-to-end | `npm run test:e2e` | 4 journeys, real API + production build |
| Typecheck | `npm run typecheck --prefix backend` | strict, 0 errors |
| Lint | `npm run lint --prefix backend` | 0 errors |

CI runs all of it on every push, plus a Docker build that smoke-tests the API
container actually answers `/api/health`.

The tests are written to fail against the bug they describe. The inventory
suite fires ten concurrent orders at a single unit; the payment suite forges
signatures and replays webhooks; the assistant suite attempts prompt injection
against the tool layer; the accessibility suite caught three unlabelled
buttons that a manual pass had missed.

---

## Documentation

- **[Architecture decisions](docs/adr/)** — why things are the way they are
- **[Deployment](docs/DEPLOYMENT.md)** — Atlas, Render and Vercel, with the
  ordering that resolves the circular URL dependency
- **[Setup](SETUP.md)** — first-run instructions

---

## Known gaps

Stated plainly rather than left for a reader to discover:

- **The frontend is still JavaScript.** The backend migration is complete; the
  frontend is outstanding work — [ADR 0005](docs/adr/0005-typescript-backend-only.md).
- **JWTs live in `localStorage`.** A deliberate trade-off with a written
  migration path — [ADR 0004](docs/adr/0004-jwt-in-localstorage.md).
- **Frontend test coverage is thin** outside the cart, auth and accessibility
  paths. Large page components are untested.
- **Payments, uploads, push and the AI assistant are tested against stubs,**
  not live third-party services.
- **Accessibility is axe-clean but not screen-reader tested.** axe covers
  roughly a third of WCAG.
- **Not yet deployed.** Configuration is committed and reproducible; no live
  environment exists.

---

## Contact

Guru R Bharadwaj — gururb20@gmail.com

<h1 align="center">Bharadwaj's Cafe</h1>

<p align="center">
  A full-stack ordering platform for a coffee shop — real-time orders,
  payments, inventory, loyalty, analytics and an AI support assistant.
</p>

<p align="center">
  <a href="https://github.com/guru-bharadwaj20/Bharadwaj-Cafe/actions/workflows/ci.yml"><img src="https://github.com/guru-bharadwaj20/Bharadwaj-Cafe/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <img src="https://img.shields.io/badge/node-22.x-339933?logo=node.js&logoColor=white" alt="Node 22" />
  <img src="https://img.shields.io/badge/backend-TypeScript%20strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/tests-255%20passing-brightgreen" alt="255 tests passing" />
</p>

<p align="center">
  <img src="docs/image.png" alt="Bharadwaj's Cafe landing page — 'Where Every Sip Tells a Story'" width="100%" />
</p>

---

## Run it

```bash
docker compose up --build
```

Web on `localhost:8080`, API on `localhost:5000`. No `.env` required — Compose
ships working defaults.

Without Docker: `npm install && npm run dev` in `backend/` and `frontend/`.
Only `MONGO_URI` and `JWT_SECRET` are required — Redis, payments, uploads,
push, SMTP and the AI assistant each degrade to a defined fallback when
unconfigured ([ADR 0002](docs/adr/0002-optional-infrastructure.md)).

## Stack

| Layer | Choice |
| --- | --- |
| API | Express + TypeScript (`strict`), Socket.io |
| Data | MongoDB + Mongoose; aggregation pipelines for analytics |
| Cache & jobs | Redis + BullMQ, both optional |
| Payments | Razorpay with signature-verified webhooks |
| AI | Claude with session-scoped tools |
| Frontend | React 18 + Vite, installable PWA |

The background worker runs as a separate process, so a burst of email retries
competes for its own CPU rather than the event loop serving customers.

## Features

Ordering with live status over WebSocket · Razorpay checkout · per-item stock
with race-safe reservation · loyalty points and tiers · admin analytics ·
AI support assistant · reviews, wishlists, addresses, blog · offline menu and
push notifications.

## Three parts worth reading

**Server-side pricing.** The client sends item ids and quantities; nothing
about money is read from a request body. `paymentStatus` only advances on a
verified provider signature. → [`config/pricing.ts`](backend/config/pricing.ts),
[ADR 0001](docs/adr/0001-server-side-pricing.md)

**Stock under concurrency.** Ten simultaneous orders for the last unit produce
exactly one sale. Each decrement is a single conditional update, so the check
and the write are one atomic operation with no window between them. →
[`config/inventory.ts`](backend/config/inventory.ts),
[ADR 0003](docs/adr/0003-conditional-updates-for-stock.md)

**AI tool scoping.** The user id is closed over from the verified session,
never a tool parameter — so a prompt naming another customer's ID reaches the
same tool bound to the asker. → [`config/assistant.ts`](backend/config/assistant.ts),
[ADR 0007](docs/adr/0007-ai-tool-scoping.md)

## Quality

| Check | Command | Result |
| --- | --- | --- |
| Backend | `npm test --prefix backend` | 210 passing |
| Frontend | `npm test --prefix frontend` | 41 passing |
| End-to-end | `npm run test:e2e` | 4 journeys, real API + prod build |
| Types & lint | `npm run typecheck && npm run lint` | 0 errors |

Tests are written to fail against the bug they describe: the inventory suite
fires ten concurrent orders at one unit, the payment suite forges signatures
and replays webhooks, the assistant suite attempts prompt injection. CI runs
all of it plus a Docker build on every push.

## Documentation

- [Architecture decisions](docs/adr/) — seven ADRs on why things are built this way
- [Deployment](docs/DEPLOYMENT.md) — Atlas, Render and Vercel

## Known gaps

- Frontend is still JavaScript; the backend migration is complete ([ADR 0005](docs/adr/0005-typescript-backend-only.md))
- JWTs in `localStorage` — a deliberate trade-off with a migration path ([ADR 0004](docs/adr/0004-jwt-in-localstorage.md))
- Payments, uploads, push and the assistant are tested against stubs, not live services
- Accessibility is axe-clean but not screen-reader tested
- Not yet deployed — configuration is committed and reproducible

---

<p align="center">
  Guru R Bharadwaj · <a href="mailto:gururb20@gmail.com">gururb20@gmail.com</a>
</p>

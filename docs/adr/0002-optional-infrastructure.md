# 2. Every external service is optional

**Status:** Accepted · **Date:** 2026-07-21

## Context

The project depends on Redis, a job queue, a payment provider, an image host,
a push service, an LLM API and SMTP. A newcomer cloning the repository should
not need seven accounts before anything runs.

The usual answers are both bad: making them required means the app cannot
start without them, and stubbing them behind fake implementations means the
code path exercised in development is not the one that runs in production.

## Decision

Every external dependency is detected at runtime and degrades to a defined
behaviour when absent:

| Missing | Behaviour |
|---|---|
| `REDIS_URL` | Cache is a pass-through; rate limits are per-process; Socket.io is single-instance |
| `REDIS_URL` (jobs) | Jobs run inline in the request, errors logged not thrown |
| `RAZORPAY_*` | Cash on delivery; the UI never shows an online-payment option |
| `CLOUDINARY_*` | Upload UI is hidden; image URLs are entered by hand |
| `VAPID_*` | The notification toggle does not render |
| `ANTHROPIC_API_KEY` | Chat behaves as before; staff answer every message |
| `EMAIL_*` | Mail is a logged no-op rather than a thrown error |

Each is a `*Enabled()` predicate, and the corresponding `/config` endpoint
tells the client what is actually available — so the UI never offers a control
that cannot work.

## Consequences

**Good.** `git clone && npm install && npm run dev` works. The test suite runs
with no external services. A reviewer can read the whole codebase without
provisioning anything.

**Cost.** Every integration carries a branch, and the "not configured" branch
is the one exercised in development. That risk is mitigated by testing both
paths — the cache tests run against a real in-memory Redis precisely because
the enabled path would otherwise never execute locally.

**Rejected:** required-everything (hostile to contributors) and mock
implementations (the mock diverges, and the divergence is discovered in
production).

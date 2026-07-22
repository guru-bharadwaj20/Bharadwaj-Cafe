# 5. TypeScript on the backend first

**Status:** Accepted · **Date:** 2026-07-20

## Context

The whole codebase was JavaScript. Migrating everything at once is a large,
risky change; migrating nothing leaves the type-safety benefit unrealised.

## Decision

Migrate the backend completely — all source and all tests — under `strict`
plus `noUncheckedIndexedAccess`, and leave the frontend as JavaScript for now.

## Consequences

**Why the backend first.** It is where the expensive mistakes live: money,
authentication, and data access. The Mongoose models also give the frontend
its types for free later, so this ordering makes the second half cheaper.

**Why `strict` immediately.** Migrating with strict off means doing the work
twice. The errors it surfaces are the reason to migrate at all. In practice
the source compiled cleanly on the first attempt; every error came from the
tests, which is the expected shape.

**What it caught.** Two real bugs on the first pass: a dashboard statistic
counting a status value that is not in its enum (so it was permanently zero),
and `String(id)` on untrusted input, which stringifies an object to
`"[object Object]"` rather than rejecting it.

**Cost.** The codebase now has two languages. That is genuinely worse than
one, and is the reason this is recorded as a deliberate stage rather than an
end state. The frontend migration is outstanding work, not a decision against
it.

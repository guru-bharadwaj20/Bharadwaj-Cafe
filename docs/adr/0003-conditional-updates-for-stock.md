# 3. Conditional updates, not transactions, for stock

**Status:** Accepted · **Date:** 2026-07-22

## Context

Two customers buying the last croissant at the same instant must not both
succeed. The obvious implementation — read the stock, check it is sufficient,
write the decrement — cannot provide that: between the read and the write, the
other request does the same thing, and both see stock of 1.

MongoDB transactions would solve it, but they require a replica set. A plain
local `mongod` and the in-memory server used in tests do not have one, so a
transaction-only implementation would be untestable in exactly the environment
where the tests run.

## Decision

Every decrement is a single conditional update:

```js
updateOne({ _id, stock: { $gte: qty } }, { $inc: { stock: -qty } })
```

MongoDB applies this atomically to one document. The condition and the write
are the same operation, so there is no window between them: of two racing
requests exactly one matches, and the other sees `modifiedCount === 0`.

Multi-item orders additionally need all-or-nothing, which one document update
cannot give. `reserveStock` uses a transaction where the topology supports one
and compensates — restoring earlier reservations — where it does not.

## Consequences

**Good.** Overselling is impossible in both modes; only the rollback strategy
differs. The core guarantee does not depend on deployment topology, so it can
be tested with 10 concurrent requests against an in-memory MongoDB — and is.

**Cost.** Two code paths for the multi-item case. The compensating path has a
brief window where a partially-reserved order is visible to a concurrent
reader. For a cafe's stock counts that is acceptable; for something like seat
allocation it would not be.

**Note.** `stock: null` means "not tracked" rather than zero. An espresso is
limited by beans and time, not by a countable inventory, and forcing a number
on it would mean asserting something we do not know.

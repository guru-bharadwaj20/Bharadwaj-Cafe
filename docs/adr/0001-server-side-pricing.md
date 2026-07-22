# 1. The server is the only authority on price

**Status:** Accepted · **Date:** 2026-07-20

## Context

The original checkout sent `totalAmount` from the browser and set
`paymentStatus: 'completed'` whenever a `paymentId` field was present. Both
came from the request body. A customer could POST a ₹2000 order with
`totalAmount: 1` and `paymentId: "anything"` and have it recorded as paid.

This is not an exotic attack. It requires one browser devtools request.

## Decision

The client sends **item ids and quantities only**. Nothing else about money is
read from a request body, anywhere.

`priceOrder()` loads each item from the database, uses the current stored
price, computes the subtotal, tax and total, and returns line items the client
never influenced. `paymentStatus` starts as `pending` on every order and only
advances when a payment provider's signature verifies.

The same rule governs identity: `customerEmail` comes from the authenticated
session, not the body, so an order cannot be filed under someone else's
account.

## Consequences

**Good.** Tampering with the request body cannot change what is charged. The
rule is simple enough to hold as a review question: "does any monetary value
come from `req.body`?" — and the answer must always be no.

**Cost.** Every order write costs an extra database round trip to re-price.
Measured against getting the amount wrong, this is not a real cost.

**Also true.** Prices are snapshotted onto the order at purchase time, so a
later menu change does not rewrite order history. That is a separate property
and is tested separately.

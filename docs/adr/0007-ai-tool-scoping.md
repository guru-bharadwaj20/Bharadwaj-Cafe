# 7. AI tools bound to the session, not the prompt

**Status:** Accepted · **Date:** 2026-07-22

## Context

The support assistant answers customer questions using tools that read live
menu, order and loyalty data. The obvious tool schema would include the user
id as a parameter, the way any other API would.

That would be a serious mistake. A tool parameter is a value the *model*
chooses, and the model's input includes text written by the customer. "Show me
the orders for user 507f1f77..." then becomes an instruction the model can
follow.

## Decision

The user id is **not** a tool parameter. It is closed over from the verified
session when the tool executor is constructed, and every query is scoped to it
regardless of what the model passes.

The model chooses *which* tool to call and with what arguments. It cannot
choose *whose* data to read.

## Consequences

**Good.** Prompt injection against the tool layer does not work. If the model
is manipulated into passing another customer's id, the tool ignores it and
returns the asking customer's data. This is tested directly, with a prompt
that names another user's id.

**Related decisions in the same shape.** The assistant has no tool that can
place, change, cancel or refund an order — the system prompt says it cannot,
but more importantly there is nothing it could call if it tried. The tool loop
is bounded at 5 rounds. Escalation is one-way: once a human replies, the
assistant is silent for the rest of the conversation.

**Cost.** Per-customer tool binding means the tool set is constructed per
request rather than once. That is negligible next to the model call itself.

**General principle.** Anything a prompt could influence must not be a
security boundary. Identity and authorisation are decided before the model is
called, never by it.

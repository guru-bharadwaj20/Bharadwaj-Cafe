# 4. JWT in localStorage, with known trade-offs

**Status:** Accepted · **Date:** 2026-07-20

## Context

The session token has to live somewhere the browser can reach it. The options
are `localStorage`, a `Secure; HttpOnly; SameSite` cookie, or memory only.

This is worth writing down precisely because the current choice is **not** the
most secure one, and pretending otherwise would be worse than choosing it
deliberately.

## Decision

Keep the token in `localStorage` for now, with a 7-day expiry (reduced from
the original 30 days), and record the trade-off rather than hiding it.

## Consequences

**What this costs.** `localStorage` is readable by any JavaScript on the page.
An XSS vulnerability therefore means token theft, where an HttpOnly cookie
would not. The token also cannot be revoked server-side before it expires —
logout only clears the client copy.

**Why it is acceptable *here*.** The site renders no user-supplied HTML, has a
strict CSP-friendly build with no `dangerouslySetInnerHTML`, and the token
expires in 7 days rather than 30. The realistic XSS surface is small.

**Why it stays for now.** Moving to HttpOnly cookies is not just a storage
change: it needs CSRF protection on every mutating route, a refresh-token
rotation scheme, and cross-origin cookie configuration between the Vercel
frontend and the Render API. That is a coherent piece of work, not a tweak,
and doing it badly would be worse than the current position.

**When to revisit.** Before this handles real customer payment data at any
volume. The migration is: httpOnly cookie + short-lived access token +
refresh rotation + CSRF tokens. This ADR should be superseded, not edited,
when that happens.

# Architecture Decision Records

Each file records one decision: the problem, the options considered, what was
chosen, and what it cost. They are written when a decision is made and left
alone afterwards — an ADR that gets edited to match the current code is a
description, not a record.

A decision that is later reversed gets a new ADR that supersedes the old one;
the original stays so the reasoning is still readable.

| # | Decision | Status |
|---|---|---|
| [0001](0001-server-side-pricing.md) | The server is the only authority on price | Accepted |
| [0002](0002-optional-infrastructure.md) | Every external service is optional | Accepted |
| [0003](0003-conditional-updates-for-stock.md) | Conditional updates, not transactions, for stock | Accepted |
| [0004](0004-jwt-in-localstorage.md) | JWT in localStorage, with known trade-offs | Accepted |
| [0005](0005-typescript-backend-only.md) | TypeScript on the backend first | Accepted |
| [0006](0006-hand-rolled-charts.md) | Hand-rolled SVG charts | Accepted |
| [0007](0007-ai-tool-scoping.md) | AI tools bound to the session, not the prompt | Accepted |

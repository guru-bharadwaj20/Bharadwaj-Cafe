# Backend — Express + TypeScript API

REST API and Socket.io server. TypeScript under `strict`; see the root
[README](../README.md) for the full picture and [docs/adr](../docs/adr/) for
why things are built the way they are.

## Layout

```
config/       pricing · inventory · payments · uploads · redis · assistant · db
controllers/  one per domain; throw typed errors, never format responses
middleware/   auth · rate limiting · error translation
models/       Mongoose schemas with exported interfaces
routes/       wiring only
jobs/         BullMQ queues, handlers and the worker entrypoint
utils/        logger · errors · cache · realtime · email
tests/        integration tests against an in-memory MongoDB
```

## Scripts

| Command                | What it does                                      |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Watch mode via tsx — no build step                |
| `npm run build`        | Compile to `dist/`                                |
| `npm start`            | Run the compiled server (build first)             |
| `npm run worker:dev`   | Background job worker, watch mode                 |
| `npm test`             | 210 integration tests                             |
| `npm run typecheck`    | `tsc --noEmit`, including tests                   |
| `npm run lint`         | Type-aware ESLint                                 |
| `npm run seed`         | Populate the menu                                 |
| `npm run create-admin` | Create the first admin (reads `ADMIN_*` env vars) |

## Conventions

- **No monetary value is ever read from a request body.** See
  [ADR 0001](../docs/adr/0001-server-side-pricing.md).
- Controllers `throw` typed errors from `utils/errors.ts`; the error
  middleware decides the status code and what the client is told.
- Async handlers are wrapped in `asyncHandler` — Express 4 does not await
  them, so an unhandled rejection would otherwise hang the request.
- Every external service is optional and has a `*Enabled()` predicate.

## Configuration

Copy `.env.example` to `.env`. Only `MONGO_URI` and `JWT_SECRET` are required;
everything else enables an optional capability.

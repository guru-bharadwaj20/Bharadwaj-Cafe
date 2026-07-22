# Frontend — React + Vite

Single-page app, installable as a PWA. See the root [README](../README.md)
for the full picture.

## Layout

```
src/
  components/     shared UI, including charts/ and the chat widget
  pages/          one per route
  context/        Auth and Cart providers
  utils/          api client · socket · razorpay · push
  test/           setup and the accessibility suite
  *.css           feature-scoped stylesheets
  sw.js           service worker (caching + push handling)
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build, including the service worker |
| `npm run preview` | Serve the production build locally |
| `npm test` | 41 component, context and accessibility tests |
| `npm run lint` | ESLint with React and hooks rules |

## Conventions

- The client sends item ids and quantities; the server prices everything.
  Amounts shown before checkout are a preview, not an authority.
- Capability endpoints (`/api/payments/config`, `/api/push/config`,
  `/api/uploads/config`) decide what UI renders — a control that cannot work
  is never shown.
- Icons are decorative and `aria-hidden`; every icon-only button carries an
  `aria-label`.

## Configuration

`VITE_API_URL` is the only variable. Vite inlines it at **build** time, so
changing it needs a rebuild, not a restart.

## Known gaps

Still JavaScript rather than TypeScript — see
[ADR 0005](../docs/adr/0005-typescript-backend-only.md). Coverage outside the
cart, auth and accessibility paths is thin.

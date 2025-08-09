# Migration Report: CRA to Next.js App Router (non-destructive)

Branch: `next-mvp`

Added files:
- `next.config.js` (styled-components enabled; alias for react-router-dom to a minimal adapter)
- `jsconfig.json` (path alias `@/*` → repo root)
- `app/layout.jsx` (server layout with metadata + Analytics)
- `app/components/ClientRoot.jsx` (client wrapper with `GlobalStyles`, `Navbar`, `WhaleBackground`, `Footer`)
- `app/page.jsx` (reuses `src/pages/Landing`)
- `app/news/page.jsx` (reuses `src/pages/News`)
- `app/statistics/page.jsx` (reuses `src/pages/Statistics`)
- `app/dashboard/page.jsx` (reuses `src/pages/Dashboard`)
- `app/error.jsx`, `app/not-found.jsx`
- `app/lib/rrd-adapter.js` (shim for `react-router-dom` in reused CRA components)

Notes:
- CRA app remains intact; Next.js app runs side-by-side via `npm run next:dev`.
- Global styles are injected via styled-components in `ClientRoot`.
- Navbar/Footer still use `react-router-dom`; the adapter avoids runtime errors under Next.
- Public assets continue to resolve from `/public` and `process.env.PUBLIC_URL` is set to empty in Next config.

Next steps:
- Verify all routes render: `/`, `/news`, `/statistics`, `/dashboard`.
- Proceed with Supabase integration (Phase 2) after verifying. 
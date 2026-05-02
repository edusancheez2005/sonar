# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Sonar Tracker is a Next.js 14 (App Router) cryptocurrency intelligence dashboard. It uses:

- **Runtime:** Node.js 20 LTS
- **Package manager:** npm (lockfile: `package-lock.json`)
- **Database:** Supabase (remote PostgreSQL, not self-hosted)
- **Billing:** Stripe
- **AI:** Grok/xAI (primary) or OpenAI (fallback) via the `openai` npm package

### Common commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Build | `npm run build` |

### Environment variables

No `.env` file is committed. Create `.env.local` at the repo root with at minimum:

```
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE=<your-service-role-key>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Without real Supabase credentials, the app still starts and renders the homepage/landing/pricing pages, but authenticated routes (Statistics, Dashboard, News, AI Advisor) will redirect to login.

### Known gotchas

- **ESLint version:** The project requires ESLint 8 (not 9). Next.js 14 uses legacy ESLint APIs that are removed in ESLint 9. The `eslint-config-react-app` package is also needed to satisfy the `eslintConfig` in `package.json`.
- **`npm run build` without real Supabase:** The build will timeout on static page generation for API routes that try to reach Supabase. This is expected — the dev server (`npm run dev`) works fine since pages are rendered on-demand.
- **`turbopack` config warning:** `next.config.js` contains a `turbopack` key that Next.js 14 doesn't recognize. This is a benign warning and does not affect functionality.
- **No automated test suite:** The project has no test runner or test files. Validation is done via lint, build, and manual testing.

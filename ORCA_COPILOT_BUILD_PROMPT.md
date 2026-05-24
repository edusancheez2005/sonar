# ORCA Copilot — Build Prompt Pack

**Status:** Draft architecture + ready-to-paste prompts for the next Sonar evolution.
**Owner:** Eduardo. Trading layer: Saif (separate workstream, "Coming Soon" surface only).
**Date:** 2026-05-24.

---

## 0. The Vision in One Paragraph

Sonar today is a global crypto intelligence dashboard with a single chat assistant (ORCA) that knows nothing about who is asking. The vision: turn ORCA into a **personalised AI copilot** that (1) onboards every new user with a short questionnaire (holdings, experience, risk posture, watchlist), (2) rebuilds a per-user dashboard view on top of the global one, (3) carries that user context into every ORCA reply so "what do you think of this coin?" actually means something, and (4) has an **orchestration layer** under the hood — router → planner → tools → writer → guardrails — so each question hits only the data it needs. Automated trading (Saif's workstream) becomes a "Coming Soon" surface that the copilot can pre-stage signals for.

This document is the architecture + the prompt pack to build it.

---

## 1. Architecture — Where Sonar Is vs. Where It's Going

### 1.1 Today (single-prompt mode)

```
user message
   ↓
[ticker extractor] (regex)
   ↓
[buildOrcaContext]  ← fetches EVERYTHING (price, whales, news,
   ↓                  social, LunarCrush, charts) regardless of
[one big system     intent
 prompt + Grok-4]
   ↓
response
```

Problems already observed in the wild:
- Every reply is a 1,500-word canned `Data / News / Bottom Line` report even when the user asked a one-line question (fixed today via intent routing in `lib/orca/system-prompt.ts`, but that's a band-aid).
- ORCA has zero memory of who the user is. "I've been looking at this coin, what do you think?" is impossible to answer well.
- Signals are generated globally with no concept of user risk tolerance or holdings.
- Compute cost scales with worst case (every query fetches every data source) instead of with intent.

### 1.2 Target — Copilot mode with orchestration

```
user message + user_profile + session_memory
   ↓
[ROUTER]            small/fast model — classifies intent, extracts entities,
   ↓                returns {intent, tickers[], datapoints[], persona_hint}
[PLANNER]           decides which tools to call, in what order, with what args
   ↓                (skips unneeded fetches — Intent B explainers hit zero tools)
[TOOL LAYER]        parallel calls to typed functions:
   ↓                 - getPrice(ticker, windows[])
                     - getWhaleFlows(ticker|chain, since, minUsd)
                     - getNews(ticker, k)
                     - getSocial(ticker)
                     - getUserPortfolio(userId)
                     - getUserWatchlist(userId)
                     - getSignalHistory(ticker, since)
                     - explainMacroFactor(name)          ← static knowledge tool
                     - searchEntityGraph(query)          ← future Arkham-style
[WRITER]            single LLM call with ONLY the tools' outputs + the
   ↓                intent-specific renderer prompt
[GUARDRAIL PASS]    rule-based regex + small LLM check: no buy/sell verbs,
   ↓                no price targets, no fabricated citations, disclaimer
                    appended exactly once
response (+ optional dashboard mutation event)
```

Why this matters:
- **Cost** — Intent B ("explain Fed rate hold") makes one router call + one writer call. No price/whale/news fetch. ~10× cheaper than today.
- **Correctness** — the writer never sees data it shouldn't reason about. The router can never write the final answer. The guardrail can't be bypassed by a clever prompt because it runs *after* generation.
- **Personalisation** — every stage receives `user_profile`; the writer's tone, the planner's tool choice, and the renderer's emphasis all shift.
- **Observability** — each stage logs structured JSON. You can see exactly why a bad answer happened (wrong intent? missing tool? hallucinated number?).
- **Tradable surface** — the planner is the natural integration point for Saif's trading engine. A "place trade" intent routes to a separate planner that requires KYC/signed-confirmation, never to the writer.

### 1.3 Dashboard layering — two separate routes, not one toggle

The global dashboard at `/dashboard` is **untouched**. Same layout, same components, same behaviour for everyone — logged in or out, onboarded or not. This is non-negotiable: the global view is what users already know and love, and what new visitors should land on.

The personal experience lives at a **separate route** — `/dashboard/personal` (or `/my`) — that only exists for logged-in users with a `user_profile` row. A small "Personal →" link in the dashboard header is the only addition to the global view.

```
┌─────────────────────────────────────────────────────────────────┐
│  /dashboard         GLOBAL VIEW (unchanged for everyone)        │
│  - Trending, whale firehose, news feed, global signals          │
│  - Header link: "Personal →" (only visible when logged in)      │
└─────────────────────────────────────────────────────────────────┘
                              ↓ click
┌─────────────────────────────────────────────────────────────────┐
│  /dashboard/personal    PERSONAL VIEW (logged-in + onboarded)   │
│  - Your watchlist cards (user-curated, ORCA can add/remove)     │
│  - ORCA copilot panel — always mounted, knows your context      │
│  - Signals filtered to your risk profile                        │
│  - Wallet personalisation (label addresses, set alerts)         │
│  - Coming Soon: one-click trade (Saif's surface)                │
└─────────────────────────────────────────────────────────────────┘
```

The personal view is built **client-side from the same global APIs** plus the `user_profile`/`user_holdings`/`user_watchlist` tables. No duplicate ingestion. If a user logs out, the link disappears and they see exactly today's global view.

### 1.4 ORCA as the orchestrator of the personal dashboard

This is the part that makes Sonar feel like a copilot rather than a dashboard with a chatbot bolted on. ORCA isn't just *answering* questions inside the personal view — it's actively *mutating* it on the user's behalf.

Pattern: any time a user discusses a ticker in chat that isn't already in their watchlist, ORCA proactively offers to track it.

```
User:  "What do you think of SUI lately?"

ORCA:  [normal data-rich answer about SUI]
       …
       I notice SUI isn't in your personal dashboard yet —
       want me to add it so we can keep an eye on whale flows
       and news as they happen?   [ Yes, track it ]   [ No thanks ]
```

Clicking "Yes" calls a tool (`addToWatchlist`) that writes to `user_watchlist` and emits a `dashboard:mutate` event the personal view subscribes to. The next render shows a new card for SUI. No page reload, no settings menu, no friction.

Other proactive patterns ORCA can suggest (always as an opt-in question, never silently):
- "Want to set a whale-alert threshold for ETH at $5M+?" → writes to a `user_alerts` table.
- "You mentioned you're researching SOL L2s — want me to pin a 'SOL ecosystem' filter to your signals feed?" → writes a saved filter.
- "Looks like you've been asking about SUI a lot this week — want a daily SUI digest in your dashboard?" → enables a digest card.

Rules for proactive offers:
1. Always one-question-at-a-time, never bundled.
2. Always declinable in one click with no nag.
3. Never about buying/selling/holding. Only about *what data to surface*.
4. Capped at one proactive offer per ORCA reply, max 3 per session, to avoid feeling pushy.
5. The mutation is logged to `orca_traces` so the user can audit "why is SUI on my dashboard?".

---

## 2. Data Model — What We Need to Store

Three new Supabase tables. SQL sketch only; the migration prompt is in §4.B.

```sql
-- user_profile: one row per user, populated on first login
create table user_profile (
  user_id              uuid primary key references auth.users(id),
  experience_level     text check (experience_level in ('new','intermediate','advanced')),
  primary_goal         text check (primary_goal in ('learn','track','research','trade')),
  risk_tolerance       text check (risk_tolerance in ('conservative','balanced','aggressive')),
  time_horizon         text check (time_horizon in ('intraday','swing','position','long_term')),
  preferred_chains     text[],                      -- ['bitcoin','ethereum','solana']
  notification_style   text check (notification_style in ('quiet','balanced','frequent')),
  jurisdiction_hint    text,                        -- 'US','UK','EU','OTHER' (for disclaimer flavour, NOT for advice)
  onboarded_at         timestamptz default now(),
  updated_at           timestamptz default now()
);

-- user_holdings: declared positions (NOT live wallet sync — that's a later phase)
create table user_holdings (
  id                   bigserial primary key,
  user_id              uuid references auth.users(id),
  ticker               text not null,
  approx_usd_value     numeric,                     -- bucketed: <1k, 1-10k, 10-100k, 100k+ (privacy)
  entry_context        text,                        -- free-text "what made you buy this"
  added_at             timestamptz default now()
);

-- user_watchlist: things they're researching but don't own
create table user_watchlist (
  user_id              uuid references auth.users(id),
  ticker               text not null,
  added_at             timestamptz default now(),
  primary key (user_id, ticker)
);

-- orca_memory: long-term per-user facts the copilot has learned
create table orca_memory (
  id                   bigserial primary key,
  user_id              uuid references auth.users(id),
  fact                 text not null,               -- "user is researching SOL ecosystem L2s"
  source_message_id    bigint,                      -- ref to chat_history
  confidence           numeric check (confidence between 0 and 1),
  created_at           timestamptz default now(),
  expires_at           timestamptz                  -- soft TTL; null = persistent
);
```

RLS: every table is `user_id = auth.uid()` for select/insert/update/delete. No service-role reads from the chat endpoint without an explicit user JWT check.

---

## 3. The Compliance Wall (Read This Before Building Anything)

Saif's trading layer changes the regulatory picture. Today Sonar is "automated summary of public data" — research-tool exemption in most jurisdictions. **The moment ORCA personalises advice based on a user's stated holdings, risk tolerance, and goals, it starts to look like personal financial advice** under the US Investment Advisers Act §202(a)(11), UK FCA RAO Art. 53, and EU MiCA Art. 60.

The current HARD RULES in `lib/orca/system-prompt.ts` are the right baseline. They must hold across **every** intent including personalised ones. Personalisation is allowed for:
- Surfacing relevant data (your holdings → show their price/whale flow first).
- Filtering noise (your risk tolerance → suppress meme-coin signals if conservative).
- Explaining things at the right experience level.

Personalisation is **not** allowed for:
- Telling the user what to buy/sell/hold based on their stated portfolio.
- Suggesting position sizing or rebalancing.
- Anything that looks like a recommendation tailored to their financial situation.

The "Coming Soon: automated trading" surface must (a) require explicit opt-in, (b) be jurisdiction-gated, (c) route through Saif's separate planner with KYC and signed-confirmation, and (d) never inherit ORCA's chat session as authorisation.

---

## 3.5 House Rules (every sub-prompt inherits these — do not override)

These apply to ALL code, prompts, copy, and UI in this build. They are not
negotiable; if a sub-prompt below contradicts them, the House Rules win.

### 3.5.1 Stack (verified from repo as of 2026-05-24)

- **Framework:** Next.js 14 app-router, React 18.
- **Language:** mostly JSX (`.jsx`), some TypeScript (`.ts`/`.tsx`) for
  lib/orca and API routes. Match whichever the surrounding file uses;
  do NOT convert JSX files to TSX or vice versa.
- **Styling:** `styled-components` v6 (NOT Tailwind — earlier drafts of
  this doc were wrong about that). Look at `app/components/`,
  `app/dashboard/`, and `components/` for existing patterns. Use the
  same theme tokens, the same spacing scale, the same colour palette.
- **State:** React Query (`@tanstack/react-query`) for server state.
  Local state via `useState`. Do NOT introduce Redux, Zustand, Jotai,
  or any other store.
- **Data:** Supabase (`@supabase/supabase-js`). Use the existing
  `supabaseBrowser()` helper for client calls and the service-role
  client only in server routes with explicit JWT verification.
- **Charts:** `lightweight-charts` for price charts, `chart.js` +
  `react-chartjs-2` where already in use. Do NOT add D3, Recharts, or
  Visx.
- **Icons:** existing `TokenIcon.tsx` for token logos. For UI glyphs,
  use inline SVGs that match the current visual weight.

### 3.5.2 UI / visual standards (the brand bar)

- **No emojis. Anywhere.** Not in component copy, not in chat replies,
  not in toasts, not in empty states, not in onboarding, not in error
  messages. Emojis look unprofessional and inconsistent across
  platforms. If a sub-prompt seems to ask for one, ignore it.
- **Favicons / token icons are fine and encouraged** — use
  `TokenIcon` for any coin reference in the UI. That's visual
  identity, not decoration.
- **Sleek, clean, professional.** Generous whitespace. Restrained
  colour. Numbers, not noise. The visual reference is the existing
  global dashboard — if a new surface doesn't feel like it could sit
  next to that dashboard without seam, it's wrong.
- **Typography:** inherit the existing font stack from
  `app/layout.jsx`. Do not introduce new fonts.
- **Colour usage:** monochromatic base + one accent for action.
  Reds/greens reserved for price direction only — never for UI chrome.
- **Motion:** use `framer-motion` (already installed) sparingly.
  Transitions are for state changes (panel open/close, toast in/out),
  never for decoration. No bouncy springs.
- **Density:** desktop-first information density. Mobile collapses
  multi-column layouts to single column — it does not strip data.
- **Empty states:** every list, panel, and card must have a written
  empty state. Never ship a half-rendered skeleton with no fallback.
- **Loading states:** use existing `SkeletonLoader` component. Do not
  invent new spinners.
- **Error states:** quiet, factual, actionable ("Couldn't load whale
  data. Retry."). Never apologetic, never anthropomorphic, never
  technical (no stack traces, no error codes shown to users).
- **Accessibility:** every interactive element keyboard-navigable.
  ARIA labels on icon-only buttons. Colour-contrast >= WCAG AA.
- **Copy voice:** peer-level, factual, concise. Not breezy, not
  corporate, not "AI assistant". Read it back out loud — if it
  sounds like ChatGPT default voice, rewrite it.

### 3.5.3 Testing (required for every code-shipping sub-prompt)

The repo currently has NO test runner installed. Step §4.0 below adds
Vitest as a one-time bootstrap. After that:

- **Unit tests** for every pure function added in `lib/` — router
  intent classifier, planner dispatch table, each tool's argument
  validation, guardrail regex pass, memory extractor filter.
- **Component tests** for every interactive component added under
  `components/` and `app/` — onboarding step transitions, watchlist
  card add/remove, copilot panel offer-then-confirm flow.
- **Integration tests** for orchestrator end-to-end: feed a fixture
  message, assert the right tools were called and the right renderer
  was selected. Mock the LLM with a stub that returns canned JSON.
- **No tests against live external APIs.** Every external call (OpenAI,
  xAI, Whale Alert, LunarCrush, CoinGecko) goes through a thin client
  module that is trivially mockable in tests.
- **Coverage target:** 70% lines on new code in `lib/orca/orchestrator/`
  and `lib/orca/renderers/`. Components don't need a coverage number
  but every user-visible interaction path needs at least one test.
- **CI:** add a `npm test` script and a `.github/workflows/test.yml`
  (or extend the existing one if present) that runs Vitest on every
  push. Tests must pass before merge.
- **Snapshot tests are banned** for anything beyond stable JSON
  fixtures — they rot and get rubber-stamped.

### 3.5.4 Safety guardrails on every PR

- **No HARD RULES bypass.** Every change to `lib/orca/*` requires a
  manual eyeball check that the HARD RULES from
  `lib/orca/system-prompt.ts` still apply and the disclaimer still
  appends exactly once.
- **No silent writes.** Any tool that mutates user state
  (`addToWatchlist`, `setUserAlert`, etc.) must be triggered by an
  explicit client confirmation event, never by the planner alone.
- **No PII in logs.** `orca_traces` stores `user_id` (UUID) only,
  never email or wallet address. Profile data is joined at read time
  by the admin tooling.
- **No new external dependencies** without an explicit "approved:
  {name} {version} {reason}" line in the PR description.

### 3.5.5 Delegation protocol (how I will run this build)

Eduardo has delegated end-to-end execution. I will:

1. Work the steps in the order set out in §5 (Build Order) below,
   one at a time, in separate working sessions.
2. At the start of each step: re-read this doc, read the surrounding
   code, list the files I will touch, then implement.
3. At the end of each step: run the test suite, summarise what
   shipped, surface any open question, and stop. Do not auto-start
   the next step — wait for Eduardo to greenlight.
4. If any step uncovers a contradiction with this doc or an
   architectural issue not anticipated here, stop and flag it
   rather than working around it silently.
5. Never ship to production. All work lands on a branch; Eduardo
   merges.

---

## 4. The Prompt Pack

Each section below is a self-contained prompt you can paste into Claude/Grok and have it implement that slice. They're ordered so each one builds on the previous. Estimated effort tags: **S** = a few hours, **M** = a day or two, **L** = a week+.

---

### 4.0 — Test Runner Bootstrap (S, do this first)

```
ROLE: Build-tooling engineer. Repo Sonar (Next.js 14, React 18).
The repo currently has no test runner. Add one.

GOAL: Install and configure Vitest + React Testing Library so every
subsequent sub-prompt has a place to add tests. Do this in a single
PR with zero feature changes.

DELIVERABLES:
- Add dev deps: vitest, @vitest/ui, @testing-library/react,
  @testing-library/jest-dom, @testing-library/user-event, jsdom.
- Create `vitest.config.ts` with: environment 'jsdom', setupFiles
  ['./test/setup.ts'], css true, alias matching the existing
  `@/` path alias from tsconfig.json.
- Create `test/setup.ts` that imports '@testing-library/jest-dom'
  and stubs `window.matchMedia` + `IntersectionObserver`.
- Add npm scripts: `test`, `test:watch`, `test:ui`, `test:coverage`.
- Add ONE smoke test at `test/smoke.test.ts` that asserts 1 + 1 === 2,
  purely to prove the runner works.
- Add a `.github/workflows/test.yml` that runs `npm ci && npm test`
  on push to any branch.
- Update README with a "Running tests" section.

DO NOT:
- Add Jest (we are NOT using Jest).
- Add Playwright or Cypress (e2e is a later phase).
- Touch any application code.
```

---

### 4.A — Onboarding Flow (S)

```
ROLE: Senior Next.js engineer working in the Sonar repo
(c:\Users\t-eduardos\OneDrive - Microsoft\Desktop\UI sonar). Stack:
Next.js 14 app-router, React 18, styled-components v6, Supabase,
JSX. Follow existing conventions in app/dashboard and
components/onboarding. Read §3.5 (House Rules) before writing any
code.

GOAL: Build a 5-step onboarding modal that appears the first time a
user logs in (i.e. when user_profile row is missing), collects the
fields below, writes them to the user_profile table, and then drops
the user into the personalised dashboard.

FIELDS (one screen each, with a "skip" option on every step):
1. Experience: new / intermediate / advanced
2. Primary goal: learn / track / research / trade
3. Risk tolerance: conservative / balanced / aggressive
4. Time horizon: intraday / swing / position / long_term
5. Preferred chains (multi-select): bitcoin, ethereum, solana,
   base, arbitrum, polygon, bsc, tron, xrp, other.

CONSTRAINTS:
- The modal must be dismissable but reappear on next login until
  user_profile is populated OR the user explicitly clicks
  "Skip personalisation".
- Persist a `personalization_dismissed` boolean on user_profile.
- Use existing UI primitives (styled-components patterns already
  in repo — see components/onboarding/OrcaTutorial.jsx and
  app/dashboard/* for reference). No new component libraries.
- No emojis anywhere in the flow (per House Rules §3.5.2).
- Do NOT collect dollar amounts or jurisdiction during onboarding —
  those come later via the dashboard "Add holding" flow with
  explicit consent.
- Add `components/onboarding/OnboardingFlow.jsx` and wire it into
  `app/dashboard/page.jsx` behind a server-side check that loads
  `user_profile` once per session.
- Keep all existing dashboard behaviour for non-onboarded users
  unchanged.

DELIVERABLES:
- The new component.
- The Supabase migration (use the schema from
  ORCA_COPILOT_BUILD_PROMPT.md §2; do not invent extra columns).
- An RLS policy block (`user_id = auth.uid()` for all CRUD).
- A short README block at the top of the component explaining
  trigger logic.
- Vitest component tests covering: first-time-user sees modal,
  returning user with profile does not, skip persists
  personalization_dismissed, each step writes the correct field,
  keyboard navigation between steps works.

DO NOT:
- Touch the global dashboard for logged-out users.
- Add any "should I buy X" buttons.
- Hard-code experience-level → advice mappings yet. That belongs
  in the writer prompt (§4.E), not the UI.
```

---

### 4.B — Database Migration (S)

```
ROLE: Supabase migration author. Repo:
c:\Users\t-eduardos\OneDrive - Microsoft\Desktop\UI sonar\supabase\migrations.

GOAL: Create a single forward-only migration file
`20260525_user_profile_and_copilot_memory.sql` that adds the four
tables specified in ORCA_COPILOT_BUILD_PROMPT.md §2
(user_profile, user_holdings, user_watchlist, orca_memory) with:

- Primary keys, foreign keys to auth.users, check constraints
  exactly as listed.
- RLS enabled on all four tables.
- Policy: `user_id = auth.uid()` for select, insert, update, delete.
- An index on user_holdings(user_id, ticker) and on
  user_watchlist(user_id) and on orca_memory(user_id, expires_at).
- A trigger on user_profile to bump updated_at on UPDATE.

DO NOT:
- Add columns not in the spec.
- Drop or alter any existing table.
- Skip RLS — every table is per-user private.

VERIFY in the migration's own comment block:
- All foreign keys reference auth.users(id) ON DELETE CASCADE.
- Check constraints reject unknown enum values.
```

---

### 4.C — The Orchestration Layer (M)

```
ROLE: TypeScript backend architect. Repo Sonar, Next.js app-router.
Existing chat endpoint: app/api/chat/route.ts. Existing context
builder: lib/orca/context-builder.ts. Existing prompt:
lib/orca/system-prompt.ts.

GOAL: Refactor the single-prompt chat endpoint into a four-stage
orchestration pipeline (router → planner → tools → writer →
guardrails) WITHOUT breaking the current chat surface. Ship behind
a feature flag `ORCA_ORCHESTRATION_V2=true`; when false, fall back
to today's path.

STAGES (each is a separate function in lib/orca/orchestrator/):

1. router.ts
   - Input: { message, userId, chatHistory }
   - Calls a fast mini model (grok-4-fast-non-reasoning or
     gpt-4.1-mini) with a strict JSON-mode prompt.
   - Output: {
       intent: 'overview' | 'explainer' | 'data_query'
              | 'followup' | 'personal' | 'compliance_decline',
       tickers: string[],
       entities: string[],
       datapoints: ('price'|'whales'|'news'|'social'|'macro'|'portfolio')[],
       persona_hint: 'new'|'intermediate'|'advanced'|null,
       confidence: number
     }
   - If confidence < 0.5, fall through to 'overview' intent.

2. planner.ts
   - Input: router output + user_profile (loaded via supabase)
   - Output: a typed list of tool calls to execute, e.g.
     [{tool: 'getPrice', args: {ticker: 'BTC', windows: ['24h','7d']}},
      {tool: 'getUserHoldings', args: {userId}}, ...]
   - Intent → tool-set mapping is a static table at the top of the
     file. No LLM call here; pure deterministic dispatch.

3. tools/*.ts
   - One file per tool. Each exports `async function run(args): Promise<ToolResult>`.
   - Tool list (initial):
       getPrice, getWhaleFlows, getNews, getSocial,
       getUserHoldings, getUserWatchlist, getSignalHistory,
       explainMacroFactor (static knowledge, no API call),
       getOrcaMemory,
       addToWatchlist, removeFromWatchlist, setUserAlert
       (write-tools: require an explicit user-confirmation event
        from the client before the planner is allowed to call them —
        ORCA can OFFER, only the user can CONFIRM).
   - Each tool returns { ok: bool, data: any, source: string,
     fetched_at: string }.
   - Reuse existing fetchers from lib/orca/context-builder.ts —
     extract them, do not duplicate.

4. writer.ts
   - Input: { intent, toolResults, userProfile, message }.
   - Picks an intent-specific renderer prompt from
     lib/orca/renderers/{intent}.ts.
   - Calls the main writer model (grok-4-fast-reasoning) with
     ONLY the tools that ran (no kitchen-sink context dump).
   - Returns the draft response.

5. guardrails.ts
   - Regex pass for forbidden verbs (recommend/buy/sell/will/etc.
     from the existing HARD RULES list).
   - Check the disclaimer is present exactly once; append if
     missing, dedupe if doubled.
   - If any HARD RULE violation is detected, replace the response
     with the standard non-advice decline string.

ROUTING IN app/api/chat/route.ts:
- if (process.env.ORCA_ORCHESTRATION_V2 === 'true')
    → use new orchestrator
  else
    → existing single-prompt path

LOGGING:
- Every stage logs a structured JSON line: { stage, intent,
  tools_called, latency_ms, model, tokens }.
- Persist to a new `orca_traces` table (id, user_id, message_id,
  stage, payload jsonb, created_at). RLS: user can only read their
  own traces; admin role can read all.

DO NOT:
- Change the existing system prompt file in this PR.
- Delete the v1 path. Keep it as fallback for two weeks.
- Add user_profile data to traces in cleartext — store userId
  only; profile is joined at read time.
```

---

### 4.D — Personalised Dashboard Layer (M)

```
ROLE: Next.js + styled-components frontend engineer. Repo Sonar.
Files to touch: app/dashboard/page.jsx, app/dashboard/DashboardWrapper.jsx,
plus a new route at app/dashboard/personal/. Read §3.5 (House Rules)
before writing any code.

GOAL: Add a "Personal" tab to the dashboard that appears only when
user_profile exists. The tab shows four panels stacked vertically
on mobile, 2×2 on desktop:

PANEL A — Your Watchlist
  Live mini-cards for each ticker in user_watchlist + user_holdings.
  Each card: price, 24h %, 7d %, whale net-flow arrow (↑↓ or ―),
  latest news headline (truncated).
  Click → opens the existing token detail page.
  Empty state: "Add tickers from any token page or ask ORCA
  'add SOL to my watchlist'."

PANEL B — ORCA Copilot
  An always-mounted chat panel pre-seeded with the user's
  watchlist context. The first auto-greeting changes by experience
  level (text comes from lib/orca/greetings.ts):
    - new:          "Hey — I'm ORCA. I can explain what's moving
                     your watchlist in plain English. Want me to
                     start with BTC?"
    - intermediate: "I'm tracking your watchlist. BTC and SOL both
                     moved >2% in the last 24h. Want a recap?"
    - advanced:     "Watchlist deltas (24h): BTC +1.5%, SOL -3.1%,
                     ETH flat. Net whale flow positive on BTC.
                     What do you want to dig into?"

PANEL C — Filtered Signals
  Reads from the existing signals pipeline but applies a filter
  derived from user_profile:
    - conservative → BTC + ETH only, only signals with composite
                     score >= 80, only 24h+ windows.
    - balanced     → top-50 by market cap, score >= 65.
    - aggressive   → all tracked tickers, score >= 50.
  Add a small "Why these?" link that opens a tooltip explaining
  the filter logic in one sentence. Make the filter user-editable
  via a dropdown that persists back to user_profile.risk_tolerance.

PANEL D — Coming Soon: One-Click Trade
  Static placeholder card. Title: "Automated trading — coming
  soon". Body: short paragraph + email-capture button
  "Notify me when it's ready". Stores to a new
  `trading_waitlist` table (user_id, jurisdiction, created_at).
  DO NOT build any actual trading UI. Saif owns that.

CONSTRAINTS:
- The global dashboard must stay the default tab for everyone,
  including onboarded users. Personal is an additional tab.
- No personal data ever appears server-side rendered in HTML;
  load it client-side after auth resolves to avoid leaks via
  cache/CDN.
- Empty states everywhere — never show a half-loaded skeleton
  with no fallback.

DO NOT:
- Remove or restyle the global view.
- Reuse any single component across both views in a way that
  causes the global view to depend on user_profile being present.
```

---

### 4.E — Personalised Writer Prompts (S, per intent)

These slot into `lib/orca/renderers/{intent}.ts` as exported template
strings. The orchestrator (§4.C) wraps them with the appropriate
tool outputs at call time. They all inherit the HARD RULES + DISCLAIMER
from a shared `lib/orca/shared-rules.ts`.

#### 4.E.1 — `personal.ts` (intent: questions about user's own holdings/watchlist)

```
You are ORCA, the user's personalised crypto research copilot.

USER CONTEXT (verified, do not question):
- Experience: {{experience_level}}
- Time horizon: {{time_horizon}}
- Risk tolerance: {{risk_tolerance}}
- Holdings: {{holdings_list}}
- Watchlist: {{watchlist}}
- Long-term memory facts: {{orca_memory_top_5}}

THE USER ASKED: "{{message}}"

TOOL OUTPUTS:
{{tool_results_json}}

WRITE A RESPONSE THAT:
1. Acknowledges the user's existing position/interest naturally
   (e.g. "Since you're tracking SOL..."). Never repeat their
   portfolio back to them in full — they know what they own.
2. Surfaces the most relevant 2-3 data points for what they
   asked, calibrated to their experience level:
   - new          → analogies, no jargon, explain every metric.
   - intermediate → metrics with one-line context.
   - advanced     → dense numbers, minimal hand-holding.
3. Calibrates the time-horizon framing: an intraday user gets
   1h/24h context; a long_term user gets 30d/90d context. Do
   not give 1h commentary to a long_term user — it's noise.
4. NEVER says "you should buy/sell/hold/add/trim/rebalance".
   NEVER gives a price target. NEVER tells them whether their
   position is a good idea. If they ask directly, decline using
   the HARD RULES decline string.
5. If the user discussed a ticker that is NOT in their watchlist
   or holdings, append a single proactive offer at the end (before
   the follow-up question): "I notice {{TICKER}} isn't in your
   personal dashboard yet — want me to add it so we can track
   whale flows and news as they happen?" Render as a two-button
   affordance: [ Yes, track it ] [ No thanks ]. Skip this if
   {{proactive_offer_count_this_session}} ≥ 3 or the user
   dismissed a similar offer earlier in the session.
6. Ends with one neutral follow-up question that is genuinely
   relevant to what they asked (not a canned filler).
7. Appends the mandatory disclaimer exactly once.

TONE: friendly, concise, peer-level. Not "AI assistant" voice.
Not "trading desk" voice either.
```

#### 4.E.2 — `explainer.ts` (intent: plain-English educational)

```
The user wants a plain-English explanation, not market data. They
asked: "{{message}}".

If they listed N concepts, return N bulleted explanations, in the
same order, each:
- 2-4 sentences.
- Calibrated to {{experience_level}} (no jargon for 'new'; assume
  competence for 'advanced').
- Includes the generic transmission channel to crypto markets
  ("higher rates → strong dollar → pressure on risk assets
  including crypto") but does NOT pull in live price data or
  current sentiment unless the user explicitly asked.

DO NOT use **Data** / **News and Market Impact** / **Bottom Line**
section headers. This is a teaching answer, not a research note.
DO append the mandatory disclaimer.
```

#### 4.E.3 — `data_query.ts` (intent: "show me the largest whale transfers today")

```
The user asked a specific data question: "{{message}}".

Lead with the direct answer in a focused markdown list ranked by
the relevant metric. Then 1-3 sentences of context max. Do NOT
add a news walkthrough, sentiment paragraph, or Bottom Line unless
the user explicitly asked for them.

If the requested datapoint is missing from the tool results, say
so in one sentence. Do not substitute a different report.

Append the mandatory disclaimer.
```

#### 4.E.4 — `overview.ts` (intent: "explain BTC")

**Preserve the current rich overview behaviour exactly.** This is the
response style users explicitly love — full data block, inflows /
outflows, all the numbers, macro factors, news walkthrough, the
embedded chart. Do NOT trim, restructure, or "improve" this format.
Lift the "INTENT A FORMAT" section from `lib/orca/system-prompt.ts`
verbatim into `overview.ts`.

The ONLY additions allowed:
1. At the top: `If user_profile is supplied, calibrate length and
   jargon to {{experience_level}} (new: ~600 words, intermediate:
   ~1000 words, advanced: 1100-1600 words).` — length only, never
   strip data sections.
2. At the end, BEFORE the disclaimer: if the ticker is not in the
   user's watchlist and user_profile exists, append the proactive
   one-liner from §1.4: "I notice {{TICKER}} isn't in your
   personal dashboard yet — want me to add it?" with the two-button
   affordance. Skip this if the user is logged out or has dismissed
   proactive offers in this session.

The chart embed, the bulleted whale-movement list, the per-article
short-term/long-term mechanism, and the Bottom Line synthesis are
all required and unchanged.

---

### 4.F — Better Signals Generation (L — research, not just engineering)

```
ROLE: Quant + ML engineer with prior experience building crypto
signal pipelines. You have access to:
- supabase/migrations/* (schema)
- the existing signal pipeline: app/api/cron/compute-signals/
- the evaluator: app/api/cron/evaluate-signals/
- the recent quarantine migration
  (20260511a_quarantine_evaluator_frozen_cache.sql) — read it,
  the post-mortem is in the comment block.
- whale_transactions, whale_alerts, sentiment_*, price_*, news_*
  tables. Schema discoverable via Supabase introspection.

PROBLEM: Eduardo says "I don't know how to make good signals." The
current signals fire often and have ambiguous edge. The May 11
quarantine showed BUY composite has +4.42% net at 24h with 86%
win rate on CLEAN data — but that's on a tiny post-fix window
and we don't yet know it generalises.

GOAL: Propose, implement, and backtest 3 candidate signal families.
Each must be:
1. Defined in plain English with the exact predicate and threshold.
2. Implementable as a SQL view on top of existing tables (no new
   data sources in this phase).
3. Backtest-able against signal_outcomes with the suspect=FALSE
   filter applied.
4. Reportable as a row in a new `signal_research_results` table:
   { signal_name, window, n_samples, win_rate, avg_pct,
     sharpe_proxy, max_drawdown_proxy, tested_at }.

CANDIDATE FAMILIES TO PROTOTYPE (pick the ones that look
strongest on whatever data you can pull):
A. Whale-flow divergence: net whale flow direction disagrees with
   24h price direction for >N hours → fade the price move.
B. Exchange-netflow imbalance: |inflow - outflow| > 2σ of trailing
   30d → directional signal in the opposite direction of net flow.
C. Sentiment-vs-price mean reversion: sentiment composite > +0.5
   while 7d price flat → upside compression; mirror for downside.
D. News-cluster momentum: ≥3 articles in 24h with same factor tag
   (regulation / supply / macro) and aligned sentiment → continuation
   for 24-72h.
E. Whale-to-CEX velocity: rate of change in deposits to top-5
   exchanges accelerating → leading indicator for sell pressure.

DELIVERABLES (in order, ship incrementally):
1. A short markdown design doc in docs/SIGNAL_RESEARCH_2026Q3.md
   with the predicate maths for each.
2. The SQL views.
3. The backtest script (Node, in scripts/backtest-signals.js)
   that reads signal_outcomes and computes the metrics above.
4. The results table populated.
5. A go/no-go recommendation per family with the data showing
   why. DO NOT ship any signal to production with n < 200 clean
   samples or win rate < 60% at the 24h window.

DO NOT:
- Run on data with suspect=TRUE.
- Cherry-pick windows. Define the test window before pulling
  numbers.
- Promote anything to compute-signals/route.js without a
  circuit-breaker watchdog (existing pattern in
  signal_circuit_breaker table).
```

---

### 4.G — Orca Memory Extractor (S)

```
ROLE: Backend engineer. Repo Sonar.

GOAL: After every successful ORCA reply, run a lightweight
mini-model pass over (user_message, orca_response) and extract any
durable user-fact worth remembering. Examples:
  - "User is researching SOL ecosystem L2s"
  - "User prefers 24h+ horizons, not intraday"
  - "User said they bought ETH at $3,200"

WRITE the fact to `orca_memory` with:
  - confidence (mini-model's self-rated 0-1)
  - expires_at = now() + 90 days (default)
  - source_message_id = id of the chat_history row.

Reads: pull top-5 most recent + highest-confidence facts as
context for the next reply (already wired in §4.E.1).

CONSTRAINTS:
- Run asynchronously after the reply is streamed (do not block
  the response).
- Never extract sensitive data (exchange API keys, wallet
  addresses, personal identifiers, dollar amounts). Use a regex
  pre-filter on the user message before passing to the model.
- Cap at 10 facts per user-day to prevent runaway memory bloat.
- Expose a /api/orca/memory endpoint where users can view and
  delete their stored facts (GDPR right-to-erasure).

DO NOT:
- Persist anything the user typed verbatim — always extract +
  paraphrase via the mini-model.
- Use these facts as inputs to signal generation. Memory is for
  conversational continuity only.
```

---

### 4.H — Trading "Coming Soon" Surface (S — coordinated with Saif)

```
ROLE: Frontend engineer. Repo Sonar.

GOAL: Build the placeholder surface for automated trading that
sits inside the personalised dashboard (Panel D from §4.D) AND on
a dedicated /trading route.

CONTENT (plain-English copy Eduardo should review before ship):
  Title: "Automated trading — coming soon"
  Body: "We're building a way to act on Sonar signals directly —
        with full risk controls, KYC, and a per-trade
        confirmation step. It's not live yet. Join the waitlist
        and we'll let you know the moment it ships in your
        region."
  CTA: "Notify me" → captures email + jurisdiction → writes to
       trading_waitlist table.

DISCLAIMER ABOVE THE CTA (required, do not paraphrase):
  "Sonar is currently a research and information tool only. We
   are not a broker, dealer, or investment adviser. The trading
   feature will be operated by a separately authorised entity
   subject to applicable financial regulation in your
   jurisdiction. Joining the waitlist does not create any
   account or obligation."

DO NOT:
- Build any actual order entry UI.
- Connect to any exchange API.
- Suggest in copy that Sonar's signals have a proven edge or
  guaranteed return.
- Ship without legal review of the disclaimer string.
```

---

## 5. Suggested Build Order

1. **4.0** — Vitest bootstrap (one-time, unblocks every test we'll write).
2. **4.B** — migration (unblocks every feature).
3. **4.A** — onboarding (gets real user_profile rows flowing).
4. **4.D Panel A + B** — watchlist + copilot panel (immediate visible value).
5. **4.C** — orchestration v2 behind feature flag (no user impact, internal correctness).
6. **4.E** — renderer prompts (lights up the orchestration).
7. **4.G** — memory extractor (makes the copilot feel "smart" across sessions).
8. **4.D Panel C** — filtered signals (depends on 4.F findings).
9. **4.F** — signal research (parallel track with anyone with quant chops).
10. **4.H** — trading coming-soon surface (when Saif's date is known).

---

## 6. What "Done" Looks Like

A new user signs up → answers 5 onboarding questions → lands on the dashboard with a global view (familiar) and a "Personal" tab (new) showing their watchlist, an always-mounted ORCA panel, and a filtered signals feed. They type "what do you think of SOL?" — the router classifies it as `personal`, the planner fetches SOL price + whales + news + their stated horizon, the writer generates a 600-word answer pitched at an intermediate user that mentions their watchlist context, never says "buy", and ends with a real follow-up question. The guardrail pass appends the disclaimer once. The trace table logs every stage. Five minutes later they ask "what's the largest whale move today?" — the router classifies it as `data_query`, the planner skips news/sentiment entirely, the writer returns a 5-bullet ranked list. Zero canned report. Both responses cost less than today's single monolithic call.

That's the copilot.

---

## 7. Decisions (locked 2026-05-24)

| # | Question | Decision | Reason |
|---|---|---|---|
| 1 | Holdings privacy | **Bucketed USD** (`<$1k`, `$1k-10k`, `$10k-100k`, `$100k+`). No exact dollar amounts ever stored. | Cleanest legal posture (no precise financial profile of the user), same analytical value, friendlier UX. |
| 2 | `orca_memory` retention | **Persistent by default** (no `expires_at`). User can view + delete any fact via `/api/orca/memory` (GDPR right-to-erasure). Optional UI: "Forget what you know about me" one-click reset. | Eduardo's explicit preference: harder to build right, but the right call for a copilot meant to learn the user over time. |
| 3 | Onboarding gate | **Soft.** Modal is dismissable on every step; reappears on next login until either `user_profile` is populated or the user explicitly clicks "Skip personalisation" (which sets `personalization_dismissed = true` and never re-prompts). | Hard gates kill activation. Sonar's global view has its own standalone value; personalisation is an upgrade, not a tax. |
| 4 | Saif's trading timeline | **TBD by Saif.** Until then, the "Coming Soon" surface (§4.H) ships as a static placeholder with no email capture. We add the waitlist form in a later PR once Saif gives a window. | Avoids collecting emails for a feature with no ship date. |
| 5 | Jurisdiction handling | **Collect at trading-waitlist signup only.** Not at onboarding. The research surface stays jurisdiction-agnostic. | Lighter touch, fewer GDPR/UK-FCA edge cases on the free product. Trading is the only surface where jurisdiction actually matters. |

These decisions are now binding inputs to every sub-prompt below. If a future step requires changing one of them, stop and surface the conflict — do not silently override.

---

## 8. Build Log (filled in as steps ship)

| Step | Branch | Commit | Status | Notes |
|---|---|---|---|---|
| 4.prep Intent routing + build doc | `feat/orca-copilot-0-prep` | `8fd3ef3` | shipped | doc baseline |
| 4.0 Vitest bootstrap | `feat/orca-copilot-1-vitest` | `8c51f7e` | shipped | vitest 2.1.9 + RTL 16 |
| 4.B Migration (4 tables) | `feat/orca-copilot-2-migration` | `f9bb6e8` | shipped | user_profile, orca_memory, user_holdings, user_watchlist |
| 4.A Onboarding flow | `feat/orca-copilot-3-onboarding` | `a024175` | shipped | 5-step modal + gate hook |
| 4.D Personal dash A+B | `feat/orca-copilot-4-personal-dash` | `76048a6` | shipped | WatchlistPanel + PersonalCopilotPanel |
| 4.C Orchestration v2 | `feat/orca-copilot-5-orchestration` | `da14525` | shipped | router/planner/guardrails/tools/traces, gated by ORCA_ORCHESTRATION_V2 |
| 4.E Per-intent renderers | `feat/orca-copilot-6-renderers` | `f8bfeec` | shipped | overview/personal/explainer/data_query/followup/compliance_decline |
| 4.G Memory extractor | `feat/orca-copilot-7-memory` | `70865c0` | shipped | PII pre-filter + daily cap + GDPR delete endpoint |
| 4.H Trading coming-soon | `feat/orca-copilot-8-trading-soon` | `2bc6983` | shipped | /trading page + dashboard panel D; no form |
| 4.F Signal research kit | `feat/orca-copilot-9-signal-research` | `f523019` | shipped (research-only) | 3 candidate families + harness + design doc; no live promotion |
| 4.D Panel C filtered signals | `feat/orca-copilot-10-panel-c` | `05b130f` | shipped | /api/personal/signals + FilteredSignalsPanel; reads production token_signals |

**Test baseline at end of build:** 241 passing across 22 vitest suites.

**Branches are local only — nothing has been pushed.** The full chain can be reviewed by walking the branches above in order.

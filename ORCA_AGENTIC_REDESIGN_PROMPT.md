# ORCA Agentic Redesign — Build Prompt v2

**Status:** Draft for Eduardo's review. Do NOT start coding until approved.
**Parent doc:** `ORCA_COPILOT_BUILD_PROMPT.md` (which shipped through §4.H).
**Date:** 2026-05-24.
**Scope:** Three workstreams.
  - **W1 — Bug fixes** on what just shipped (the "Network error talking to ORCA" and the raw JSON at `/api/orca/memory`).
  - **W2 — Personal dashboard redesign** (current shell is dull, low-density, and reads as a placeholder).
  - **W3 — ORCA agentic harness** (let ORCA reach into specific tracked wallets and specific news articles, like Microsoft 365 Copilot reaches into your mailbox and docs).

The three are sequenced. W1 is blocking. W2 and W3 ship in parallel branches.

---

## 0. What "Done" Looks Like for This Doc

After this round of work the user can:

1. Open `/dashboard/personal`, type *"add BTC to my watchlist"* into ORCA, and watch the watchlist panel update — no console errors, no "Network error" line.
2. Type *"what's wallet `0xab…cd` been doing this week?"* and get a structured answer that names the wallet's label (if we have one), its top transactions, and the tokens it touched. No fabricated addresses.
3. Click a news headline on a token page, ask ORCA *"explain this article and why it matters for ETH"*, and get a per-article explainer that quotes the supplied excerpt and the supplied price/flow context for ETH at that moment.
4. Look at the personal dashboard and feel that it's a product, not a wireframe: real data density, real motion, real hierarchy, no `border: 1px dashed` placeholder cards.
5. Visit `/api/orca/memory` in the browser without seeing a raw JSON 401 — it returns either the user's saved facts (with a tiny built-in HTML viewer) or a clean "please sign in" landing.

---

## 1. House Rules (inherited, do not override)

All of these come from `ORCA_COPILOT_BUILD_PROMPT.md §3.5` and stay in force.

- **No emojis** anywhere in code, UI, or commit messages.
- **Palette:** `#00e5ff` cyan accent, `#36a6ba` button gradient base, dark `rgba(13,20,33,*)` panels, `#e0e6ed` body text, `#8896a6` muted, `#6b7a8c` labels.
- **Stack:** Next.js 14 app-router, React 18.2, styled-components v6, TypeScript 5.9.3 (strict:false), Supabase + RLS, Vitest 2.1.9 + RTL 16.
- **Windows env:** every terminal command must prepend `$env:Path += ';C:\Program Files\nodejs;C:\Program Files\Git\cmd';`.
- **Tests are mandatory.** No feature ships without unit tests. Aim to keep the suite green; the current baseline is **241 passing across 22 vitest files** (post-§4.D Panel C).
- **Compliance wall is untouched.** All hard rules in `lib/orca/system-prompt.ts` and the mandatory disclaimer in every renderer remain verbatim. No new feature may produce a buy/sell/hold verb, a price target, or imply an information edge.
- **One branch per workstream.** No mega-PRs. Branch naming: `feat/orca-redesign-N-<slug>`.

---

## 2. Workstream W1 — Bug Fixes (BLOCKING, do first)

### 2.1 "Network error talking to ORCA" in `PersonalCopilotPanel`

**Reproduction:** User types *"Id like to add btc"* in the copilot panel on `/dashboard/personal`. The error line *"Network error talking to ORCA."* renders below the thread.

**Where it comes from:** `components/orca/PersonalCopilotPanel.jsx` has a single catch block that sets `setError('Network error talking to ORCA.')` when `fetch('/api/chat', …)` itself rejects. HTTP error codes render a different message (`ORCA could not respond (HTTP nnn)`). So the failure is at the fetch / network layer, not a server-returned status.

**Hypotheses to verify in order:**

1. **Vercel function exceeded its 10 s hobby/10 s pro limit.** The `/api/chat` route fans out to `buildOrcaContext` which calls Binance + Coingecko + LunarCrush + news + whale alerts in parallel. On cold start the whole thing can exceed the function timeout, and the platform terminates the connection — which the browser reports as a network error, not a 5xx. **Fix:** add `export const maxDuration = 60` (Vercel Pro) to `app/api/chat/route.ts` if not already there, and confirm the production plan supports it.
2. **The new memory-extractor `extractMemoryFacts()` is being awaited synchronously.** It's supposed to fire-and-forget. Audit `app/api/chat/route.ts` to ensure the call is wrapped in `void (async () => { … })()` or `.catch(() => {})` with no `await` on the request path. If the extractor calls a mini-model on Grok and the model errors, we must not propagate.
3. **The user's `/api/chat` POST body is missing fields the legacy path expects.** The new `PersonalCopilotPanel` only sends `{ message }`. The legacy path expects `{ message, session_id? }`. Verify that omitting `session_id` is harmless. If not, generate a session id client-side.
4. **No write tools wired.** "Add BTC to my watchlist" is a *write* intent. The legacy chat route has no concept of write tools. It runs the read-only research note path. Result: it tries to fetch BTC context fully (which is fine), but if the orchestration v2 feature flag (`ORCA_ORCHESTRATION_V2`) is off and the legacy path runs, the response is a 1,500-word research note about BTC, not a watchlist mutation. That's a UX failure, not a network failure — but it explains why the user feels the panel is broken. **Fix path:** turn on `ORCA_ORCHESTRATION_V2=true` in Vercel env (which routes through router/planner/tools/writer), and confirm the write-tool path (`addToWatchlist`) actually fires under the "user confirmed" branch.

**Deliverables for W1.1:**
- One diagnostic script `scripts/diagnose-orca-network.js` that hits `/api/chat` with a real bearer and times every stage.
- Set `maxDuration = 60` on `app/api/chat/route.ts` (verify Vercel plan first).
- Audit and harden the `extractMemoryFacts` call site so it cannot block the response.
- Turn on `ORCA_ORCHESTRATION_V2` in production (Vercel env), confirm the orchestrator path is the one that runs.
- Add a vitest case in `test/personal/PersonalCopilotPanel.test.tsx` that simulates a fetch rejection and asserts the new (better) error copy renders, plus one that asserts a 504 renders a *"That took too long — try again in a moment"* line instead of the generic "Network error".

### 2.2 Raw JSON at `/api/orca/memory`

**Reproduction:** Visiting `/api/orca/memory` in the browser without a bearer returns `{"error":"unauthenticated"}` as raw JSON.

**Why it's fine technically:** the endpoint is bearer-only by design (GDPR data, user-scoped). The bug is UX, not security.

**Fix:**
- Detect `Accept: text/html` on the GET handler and return a tiny static HTML viewer that explains what the endpoint is and links to `/dashboard/personal` to sign in.
- Build a real surface at `/dashboard/personal/memory` that calls the API client-side with the user's bearer, lists their saved facts in a styled table, and lets them delete one or "delete all" with a confirmation modal. This is also our GDPR right-to-erasure UI.

---

## 3. Workstream W2 — Personal Dashboard Redesign

The current `/dashboard/personal` is a 2-column grid of four panels. Watchlist and Filtered Signals look like wireframes when empty, the copilot panel is bigger than it needs to be, and the Trading panel is wasted real estate. We're going to rebuild the layout, the density, and the empty states, while keeping the Compliance wall intact.

### 3.1 Layout — three-band grid

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TOP STRIP — "Pulse"                                                        │
│  one row of compact tiles, always populated, even for new users:           │
│  [Your watchlist movers]  [Whale alerts on your tickers]                    │
│  [Articles ORCA flagged for you]  [Today's macro pin]                       │
├──────────────────────────────────────────────┬──────────────────────────────┤
│  LEFT COLUMN (60%)                           │  RIGHT COLUMN (40%)          │
│  - Tabbed: Watchlist | Wallets | Signals     │  - ORCA copilot, sticky      │
│    (tabs share a pane; one is visible)       │    full-height, with a       │
│  - Each tab has rich rows: sparkline + 1h/24h│    "context chip" header     │
│    + % bullish + tiny whale-pressure pip     │    showing what ORCA is      │
│  - Filtered Signals lives under the Signals  │    currently looking at      │
│    tab, not as a separate dull card          │    (auto-pinned ticker)      │
│                                              │  - Slash-commands palette    │
│                                              │    visible above the input   │
│                                              │    (`/watchlist`, `/wallet`, │
│                                              │     `/explain`, `/news`)     │
├──────────────────────────────────────────────┴──────────────────────────────┤
│  TRAY (collapsible)                                                          │
│  Trading "coming soon" + Memory + Settings — collapsed by default, opens    │
│  via a footer rail. No longer steals 25% of the page.                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component-by-component spec

| Component | File | Behaviour |
| --- | --- | --- |
| `PulseStrip` | `components/personal/PulseStrip.jsx` | Server-rendered shell, client-fetched cells. Each tile is its own micro-component, lazy-loaded, with a 6 s SWR refresh. Each tile knows how to render its own empty state with a single CTA. |
| `WatchlistTab` | `components/personal/WatchlistTab.jsx` | Replaces `WatchlistPanel`. Rows show: token logo, ticker, name, sparkline (24h), 1h%, 24h%, 7d%, mini whale-pressure pip (-1..+1 color-mapped), "Ask ORCA" button that pre-fills the input with `"explain why $TICKER moved today"`. |
| `WalletsTab` | `components/personal/WalletsTab.jsx` | NEW. Lists wallets the user has labelled (see W3.2). Each row: label, truncated address, chain badge, 24h tx count, net flow, last activity timestamp. Add wallet → modal that takes address + label + chain. |
| `SignalsTab` | reuse `FilteredSignalsPanel` but restyle as a tab pane, not a card. Same data; better visual density (table layout, color-coded score badge, hoverable score tooltip with the score components). |
| `CopilotPane` | restyle existing `PersonalCopilotPanel.jsx` | Sticky right column. Adds: context chip ("Looking at: ETH" with an X to clear), slash-command palette, message timestamps, ARIA live region for screen-reader announcements of new replies. Pre-canned starter questions become real chips above the input, not body text. |
| `Tray` | `components/personal/Tray.jsx` | Footer rail with three icons: trading-soon, memory, settings. Clicking opens a slide-up drawer (not a route change). |
| `PersonalDashboardClient.jsx` | rewritten | New grid CSS, tab state, context chip wired to copilot. |

### 3.3 Visual polish (the "ew" → "wow" list)

- **Density:** every panel must show at least one piece of real, user-specific data within 200 ms of first paint (skeleton loaders are allowed but must be replaced fast). No empty-state copy on the main grid unless the user genuinely has zero watchlist + zero wallets + zero holdings — in which case we show a single full-bleed onboarding card, not four dull panels.
- **Motion:** sparklines animate on mount (300 ms cubic-bezier). Score badges have a soft pulse when they cross thresholds (60 → 80). No bouncing, no spinning, no parallax.
- **Hierarchy:** one h1 (page title), one h2 per tab, no h3 in the main grid. Use `letter-spacing: 0.04em; text-transform: uppercase; font-size: 11px;` for labels — already the house style.
- **Color:** introduce two new semantic tokens in a tiny `lib/ui/tokens.ts`: `--ok: #4ade80`, `--warn: #fbbf24`, `--err: #ff7a7a`. Use them for pressure pips, score deltas, error lines.
- **Typography:** keep the existing font stack. Bump body to 14 px on the personal route only. Numbers always `font-feature-settings: 'tnum'` so columns line up.
- **No emojis, no icons-as-decoration.** Lucide-react icons only where they replace an HTML element (e.g. caret on a dropdown, X on a chip), 14 px, `currentColor`, stroke 1.5.

### 3.4 Tests

- `test/personal/PulseStrip.test.tsx` — renders four tiles, each with its own empty state and its own loaded state.
- `test/personal/WalletsTab.test.tsx` — add wallet flow, validation (address format, chain selector), delete flow with confirm modal.
- `test/personal/CopilotPane.context-chip.test.tsx` — clicking "Ask ORCA" on a watchlist row sets the context chip, the next message includes the chip's ticker as `focus_ticker` in the request body.
- `test/personal/Tray.test.tsx` — drawer open/close, focus trap, ESC closes.
- All existing `WatchlistPanel.test.tsx` / `FilteredSignalsPanel.test.tsx` cases must still pass against their successor components (rename, not delete).

---

## 4. Workstream W3 — ORCA Agentic Harness

This is the meat. Right now ORCA has tools but only a narrow set (`getPrice`, `getNews`, `getWhaleFlows`, `getSocial`, `getUserPortfolio`, `getUserWatchlist`, `explainMacroFactor`, `addToWatchlist`/`removeFromWatchlist`). To behave like Microsoft 365 Copilot — *"explain this article"*, *"what's wallet 0xab… doing"*, *"why did ETH move today"* — we need to add a small number of high-leverage tools and one new orchestration capability: **the planner can quote the source it's about to summarise**.

### 4.1 New tools

| Tool | Signature | Source of truth | Notes |
| --- | --- | --- | --- |
| `getWalletActivity` | `(address, chain, since?) → { label?, txCount24h, netFlowUsd, topTxs: TopTx[], tokensTouched: string[] }` | `whale_transactions` + `whale_alerts` + `wallet_labels` (existing if present; otherwise add a tiny `user_wallets` table with `(user_id, address, chain, label)` and an RLS `user_id = auth.uid()` policy) | Caps `topTxs` at 10. Strips internal fields. |
| `getArticleContext` | `(articleId) → { headline, source, publishedAt, excerpt, sentimentScore, relatedTickers[] }` | existing `news_articles` table | Used by the "explain this article" intent. Reject if the article is older than 30 days or not in our DB (no scraping). |
| `getSignalContext` | `(ticker, since) → { recentSignals: SignalRow[], lastVerdict, suspectFlag }` | `token_signals` | The personal dashboard already reads this — the tool wraps it so ORCA can quote it. |
| `findTrackedWallets` | `(query) → WalletMatch[]` | `wallet_labels` + user's `user_wallets` | Lets ORCA resolve *"the wallet I labelled 'cold'"* without the user pasting the address. |
| `summariseEntity` (deferred to v2.1) | — | — | Skipped for now; needs entity-graph plumbing we haven't built. |

Each tool ships as one file under `lib/orca/orchestrator/tools/` with: pure function, no side effects beyond the named DB read, typed return, full vitest coverage (happy path + missing-row + permission-denied + malformed-arg).

### 4.2 `user_wallets` migration

If it doesn't already exist (verify against `supabase/migrations/`):

```sql
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address     text NOT NULL,
  chain       text NOT NULL CHECK (chain IN ('eth','btc','sol','base','arb','polygon','bsc','tron','xrp')),
  label       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, address, chain)
);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON public.user_wallets (user_id);
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
-- idempotent policies (we learnt this the hard way in §4.B remediation)
DROP POLICY IF EXISTS user_wallets_select_own ON public.user_wallets;
CREATE POLICY user_wallets_select_own ON public.user_wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS user_wallets_insert_own ON public.user_wallets;
CREATE POLICY user_wallets_insert_own ON public.user_wallets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS user_wallets_delete_own ON public.user_wallets;
CREATE POLICY user_wallets_delete_own ON public.user_wallets FOR DELETE TO authenticated USING (user_id = auth.uid());
```

Migration filename: `supabase/migrations/20260602_user_wallets.sql`. New vitest in `test/migrations/user_wallets.test.ts`.

### 4.3 Router additions

Extend `lib/orca/orchestrator/router.ts` with three new intents:

| Intent | Trigger phrases | Routed tools |
| --- | --- | --- |
| `wallet_lookup` | *"what's wallet 0x… doing"*, *"show me my cold wallet"*, *"track 0x…"* | `findTrackedWallets` → `getWalletActivity` |
| `article_explain` | URL or article-id in message, or *"explain this article"* with an article focus from the UI | `getArticleContext` → `getPrice` + `getWhaleFlows` for related tickers |
| `signal_explain` | *"why is the signal on X saying neutral"*, *"explain my X signal"* | `getSignalContext` → `getPrice` + `getWhaleFlows` |

The router stays a small/fast LLM call; the planner is what decides the tool chain. Both must remain pure (no DB writes).

### 4.4 Writer prompt additions

Three new renderer files under `lib/orca/renderers/`:

- `wallet_lookup.ts` — describes the wallet's recent activity in 3-5 short paragraphs. Never names a counterparty unless the supplied data already did. Never speculates on intent. Closes with the mandatory disclaimer.
- `article_explain.ts` — quotes the article excerpt, names the transmission channel (re-uses the existing `[MACRO: …]`/`[MICRO: …]` taxonomy from `overview.ts`), ties it to the supplied price/flow data for related tickers. Never advises action.
- `signal_explain.ts` — walks through the score's component breakdown using the supplied `signal_components` JSON, ends with "this is a research output, not a recommendation".

All three import `HARD_RULES` and `MANDATORY_DISCLAIMER` from `lib/orca/shared-rules.ts` verbatim.

### 4.5 Context chip wiring (the "agentic" feel)

The UI sends, with every message: `{ message, focus_ticker?, focus_wallet?, focus_article? }`. The router uses these as strong priors but the user can always override in natural language. When ORCA's reply implies a follow-up ("ask me about the next-largest tx"), the client surfaces it as a chip below the message that the user can click — a one-tap continuation.

### 4.6 Tests

- `test/orchestrator/router.test.ts` — 6 new cases (2 per new intent: hit + miss).
- `test/orchestrator/tools/getWalletActivity.test.ts` — happy + empty + RLS-denied + malformed-address.
- `test/orchestrator/tools/getArticleContext.test.ts` — happy + 30-day-old reject + missing-article + unrelated-tickers-empty.
- `test/orchestrator/tools/getSignalContext.test.ts` — happy + suspect-flag-flips-output + zero-recent-signals.
- `test/renderers/wallet_lookup.test.ts`, `test/renderers/article_explain.test.ts`, `test/renderers/signal_explain.test.ts` — each asserts the disclaimer renders verbatim, no buy/sell verbs, no fabricated counterparty names.
- `test/migrations/user_wallets.test.ts` — schema, RLS shape, policy idempotency.

---

## 5. Build Order

| # | Branch | Workstream | Why this slot |
| --- | --- | --- | --- |
| 1 | `feat/orca-redesign-1-bugfixes` | W1 | Blocking. The product is currently broken for the user. |
| 2 | `feat/orca-redesign-2-walletstable` | W3.2 | Migration first so W2 and W3 can both read it. |
| 3 | `feat/orca-redesign-3-tools` | W3.1 + W3.3 + W3.4 | The new tools, router, and writer all together (small files, tight coupling). |
| 4 | `feat/orca-redesign-4-pulse-and-tabs` | W2.1, W2.2 (PulseStrip + Watchlist/Wallets/Signals tabs) | Visible payoff, depends on #2. |
| 5 | `feat/orca-redesign-5-copilot-and-tray` | W2.2 (CopilotPane, context chip), W2.3 (polish) | Closes the loop with #3. |
| 6 | `feat/orca-redesign-6-memory-ui` | W1.2 + the `/dashboard/personal/memory` surface | Small, ships last. |

Each branch: tests green locally before commit. Push as a stacked chain. Open one PR per branch, but plan to **merge them in order** (no skipping).

---

## 6. Out of Scope (do NOT do in this round)

- **No automated trading.** Stays a static "Coming Soon" surface per locked decision §7.4 in the parent doc.
- **No new signal families.** The §4.F research kit is research-only and stays gated behind a human go/no-go.
- **No Arkham-style entity graph.** `summariseEntity` is deferred to v2.1.
- **No new model.** Stay on Grok-4-fast-reasoning / -non-reasoning + OpenAI fallback. No streaming refactor in this round.
- **No global-dashboard changes.** `/dashboard` stays exactly as it is today (parent doc §1.3 hard rule).

---

## 7. Compliance Sign-off Checklist (review at each merge)

Before merging any branch in this pack:

1. `grep -nE 'should (buy|sell|hold)|price target|entry price|stop[- ]loss|take[- ]profit|recommend|conviction|alpha|edge|guaranteed' lib/orca/ components/personal/ components/orca/` → must return zero hits.
2. Every renderer file ends by importing `MANDATORY_DISCLAIMER` from `lib/orca/shared-rules.ts` and appending it verbatim.
3. No new endpoint reads `signal_research_results` (research-only per §4.F).
4. No new endpoint forwards raw user PII (addresses, emails, real names) to the model. The PII pre-filter in `lib/orca/memory/extractor.ts` is the canonical list; if a new field needs to be private, add it there.
5. `npx vitest run` is green; new baseline reported in commit message.

---

## 8. Open Questions for Eduardo (answer before W1 starts)

1. **Vercel plan.** Are we on Pro? Need to know before setting `maxDuration = 60`.
2. **`ORCA_ORCHESTRATION_V2` env.** Is it already set in production Vercel? If not, do you want it on as part of W1, or do you want to keep the legacy single-prompt path live until the new tools land?
3. **Wallets — scope of "track".** Just labels + manual address entry (cheap, ship in days), or do you also want push alerts when a tracked wallet does something? Alerts add a cron + email/webhook surface.
4. **Article corpus.** `getArticleContext` reads `news_articles`. Confirm that table is the canonical source and that the 30-day cap is acceptable.
5. **Branding for the redesign.** Stay on the current cyan/dark palette, or is this the moment to introduce a second accent colour (e.g. a warm amber for "macro pinned" tiles)?

Answer those five and I'll start with branch #1.

---

*End of prompt. Reply with edits, or with "approved, start W1" to begin.*

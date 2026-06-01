# ORCA Unified Copilot — Build Prompt v4

**Date:** 2026-05-24.
**Author:** Eduardo (frustration → clarity).
**Replaces / supersedes:** `ORCA_AGENTIC_REDESIGN_PROMPT.md` (W5/W6 only) and `ORCA_INTEGRATION_REBUILD_PROMPT.md`. Keeps everything below the UI line: the orchestrator (`lib/orca/orchestrator/*`), the tools registry, the renderers, the memory extractor, the guardrails, the `user_wallets` table, `/api/orca/memory`, `/api/personal/wallets`, the chat route's v2 path.
**Status:** Build prompt. Approval gate at §0 before any code lands.

---

## 0. The one paragraph that matters

Today there are TWO ORCA chat surfaces — `/ai-advisor` (terminal/Bloomberg aesthetic, marketing-flavoured, public-ish) and the dashboard copilot at `/dashboard/personal` (cyan panel, signed-in). They are different React trees, different state stores, different visual languages, and they cannot see each other's history. Plus every other page (`/token/[symbol]`, `/whale/[address]`, `/news/[slug]`, `/whale-tracker`, `/whales`, `/trending`, the watchlist surfaces) has no copilot at all. The user has to context-switch to chat, and the dashboard chat doesn't actually do the one write action the welcome bubble promises (*"add a ticker on the left and I will explain what is moving it"*).

**v4 collapses all of this into one copilot brain with three surfaces and a button on every contextual card.** Same session, same history, same memory, same tools, same disclaimer. Three surfaces because the *shape* of the conversation is different in three places — but the brain is one. Plus the broken write loop gets fixed end-to-end with a single Playwright test that holds the line.

---

## 1. Mental model — one brain, three surfaces, N entry points

```
                            ┌─────────────────────────┐
                            │   ORCA brain (server)   │
                            │  /api/chat (v2 only)    │
                            │  router → planner →     │
                            │  tools → writer →       │
                            │  guardrails → trace     │
                            └────────────┬────────────┘
                                         │
              shared state (Supabase: orca_sessions, orca_messages)
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
   ┌────▼─────┐                     ┌────▼────┐                     ┌─────▼────┐
   │ Surface A│                     │Surface B│                     │ Surface C│
   │ Drawer   │                     │ Studio  │                     │ Inline   │
   │ (global) │                     │(/orca)  │                     │ Mini-Chat│
   │ Cmd+K    │                     │full-page│                     │ on cards │
   └──────────┘                     └─────────┘                     └──────────┘
        ▲                                ▲                                ▲
        │ entry buttons everywhere       │ deep-research mode             │ context-bound, throwaway
        │  - "Ask ORCA" on every         │  - replaces /ai-advisor        │  - quick "why is this
        │    ticker / wallet / article   │  - replaces /dashboard/        │    moving?" without
        │  - global Cmd+K shortcut       │    personal copilot pane       │    opening the drawer
        │  - "+/track" one-click writes  │  - shareable session URL       │  - 3 turns max, then
        │                                │                                │    promotes to drawer
```

### 1.1 The three surfaces

| Surface | Route | Job | Shape |
| --- | --- | --- | --- |
| **A — Drawer** | mounted in `app/layout.jsx`, available everywhere | Quick questions from any page. Inherits context from `usePathname()`. Open with the floating button or `Cmd+K`. | 420px right-edge slide-in, full app height. |
| **B — Studio** | `/orca` (replaces both `/ai-advisor` and the embedded pane inside `/dashboard/personal`) | Deep research. Side-pane shows tool calls, sources, the trace timeline ORCA used. Sessions are listable, renameable, deletable. | Full page. Three columns: session list / chat thread / tool inspector. |
| **C — Inline Mini-Chat** | embedded inside `app/dashboard/personal/PersonalDashboardClient.jsx` as a compact card; can also be dropped into token pages later | The "ask ORCA from where you already are" surface. Heavily seeded with one-tap follow-ups. | 380×360 card, 3-turn max, then a "Continue in Studio" button promotes the session to surface B. |

All three import the same component: `<OrcaConversation/>` from `components/orca/OrcaConversation.jsx`. The shell is different; the conversation primitive is one file.

### 1.2 What we keep, what we delete

**Keep (already shipped, already good):**
- `lib/orca/orchestrator/*` — router, planner, runOrchestrator, tools, guardrails.
- `lib/orca/renderers/*` — wallet_lookup, article_explain, signal_explain, personal, overview.
- `lib/orca/shared-rules.ts` (`MANDATORY_DISCLAIMER`, `HARD_RULES`).
- `lib/orca/memory/extractor.ts` + `/api/orca/memory` + `/dashboard/personal/memory`.
- `app/api/chat/route.ts` (v2 path) + `app/api/personal/{watchlist,wallets}` + `/api/orca/memory`.
- `components/personal/PulseStrip.jsx`, `WatchlistTab.jsx`, `WalletsTab.jsx`, `SignalsTab.jsx`.
- `supabase/migrations/20260601_user_wallets.sql` (W2), the `orca_traces` table (W3).

**Delete (v5/W5 redundancy + dual-surface chat duplication):**
- `components/personal/CopilotPane.jsx` (the W5 wrapper). Replaced by `<OrcaConversation/>` inside the new mini-chat card.
- `components/personal/Tray.jsx`. Memory becomes a header link; Settings is dead UI; Trading already has `/dashboard/personal/trading` (or will).
- `components/orca/PersonalCopilotPanel.jsx` — its thread/input logic migrates into `<OrcaConversation/>`. The file is retired.
- `app/ai-advisor/page.jsx`, `app/ai-advisor/ClientOrca.jsx`, `app/ai-advisor/OrcaWelcome.jsx`. Replaced by `/orca`. Add a permanent `redirect()` from `/ai-advisor → /orca` in `next.config.js` so existing links and SEO survive.

Net file count for v4 = **negative**.

---

## 2. The visual identity — sleek, distinct, ORCA

The current `/ai-advisor` is "Bloomberg terminal" pastiche. The dashboard copilot is a styled-components panel. Neither feels like one product. v4 picks ONE language and uses it everywhere.

### 2.1 Visual primitives (lock these in `lib/ui/tokens.ts`)

```ts
export const tokens = {
  // Surface
  surface: {
    base: '#070a12',                          // page background
    panel: 'rgba(13, 20, 33, 0.72)',          // cards, drawer
    panelHigh: 'rgba(18, 27, 43, 0.92)',      // modals, popovers
    border: 'rgba(255, 255, 255, 0.06)',
    borderActive: 'rgba(0, 229, 255, 0.45)',
  },
  // Voice
  accent: '#00e5ff',                           // ORCA cyan
  accentDim: 'rgba(0, 229, 255, 0.12)',
  ok: '#4ade80',
  warn: '#fbbf24',
  err: '#ff7a7a',
  // Text
  text: '#e0e6ed',
  textMuted: '#8896a6',
  textLabel: '#6b7a8c',
  // Geometry
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  pad:    { xs: 6, sm: 10, md: 14, lg: 20, xl: 28 },
  // Motion
  ease: 'cubic-bezier(0.16, 1, 0.3, 1)',      // gentle ease-out for surface
  dur:  { fast: 140, base: 220, slow: 360 },
}
```

Every new component MUST consume these tokens. No more inline hex codes. No more bespoke palettes per surface.

### 2.2 Signature elements (what makes it "ORCA" at a glance)

These are the small details that make the product look intentional. Each is small enough to spec exactly.

1. **The "sonar pulse" idle indicator.** A 6px cyan dot in the drawer header that pulses (1.6s cycle, opacity 1→0.35→1) when ORCA is idle and listening. Stops when streaming. Conveys "alive but quiet." Goes in `components/orca/SonarPulse.jsx`. One CSS keyframe.
2. **Tool-call chips inline in the message stream.** When the orchestrator runs `getPrice` or `getWhaleFlows`, render a compact chip in the assistant bubble *above* the text: `[ getWhaleFlows · ETH · 312ms ]`. Color: `accentDim` background, `accent` border. Click → opens the inspector pane (Studio only) or expands inline (Drawer/Mini). This is the "agentic" signal the user is asking for. It says: *the AI isn't winging it, it called these specific functions on your data*.
3. **The disclaimer is a fold, not a paragraph.** Today the mandatory disclaimer is a 4-line block at the bottom of every reply, which makes responses feel heavy. Make it a single `[i] Disclaimer` collapsed line that expands on click. The disclaimer text stays verbatim — only the affordance changes. Verified with legal that visual collapse is fine as long as the full text is one click away.
4. **One-key follow-ups.** After every reply, render up to 3 single-line follow-up chips below the bubble (planner already produces them; we just stop hiding them). Each chip is a one-click prompt. Keyboard: `1`, `2`, `3` selects.
5. **Context chip in the header that you can never miss.** When the drawer auto-pins a focus from the route, the chip is a 28px-tall pill at the top of the conversation, with the focus icon (chain logo for wallet, token icon for ticker, news icon for article) + label + a small `×`. Not a styled span — a real element with a hover state. If there's no focus, the chip shows *"No focus — ask anything"* in muted text.
6. **The send button is a node.** A 28×28 circle with the cyan dot. Disabled when input is empty. Becomes a square "stop" button while ORCA is streaming. Pressing Enter and clicking the node do the same thing. No "Send" word anywhere. Saves space, looks like a product.
7. **Streaming uses a typewriter-shimmer hybrid.** As the writer streams, the unrevealed portion shows a 1.5em-wide shimmer (gradient sweep, 1.2s). Already-revealed text stays static. This is much more pleasant than the standard token-by-token jitter. Wrap once in `components/orca/StreamingText.jsx`.
8. **A persistent "Sources" strip under tool-using replies.** When the response used `getNews` or `getArticleContext`, show 1-3 source cards under the bubble (favicon + title + age). Click → opens the article in a new tab. Click-tracking is fine; no scraping.

### 2.3 Anti-patterns (don't do these — they look generic)

- No "thinking…" three dots. Use the SonarPulse instead.
- No emoji-prefixed bubbles ("🤖 ORCA says: …"). Identity comes from the surface, not the prefix.
- No giant gradient buttons. The product is cyan-on-near-black with one accent. Restrain.
- No bouncing/spinning loaders. The shimmer + pulse cover all states.
- No "Powered by GPT-4" badge anywhere. Model identity is private.

---

## 3. The data contract — one session, three surfaces

### 3.1 New tables (migrations)

```sql
-- supabase/migrations/20260603_orca_sessions.sql

CREATE TABLE IF NOT EXISTS public.orca_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text,                                 -- planner auto-fills after turn 1
  surface_seed text CHECK (surface_seed IN ('drawer','studio','mini') OR surface_seed IS NULL),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  archived     boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_orca_sessions_user ON public.orca_sessions (user_id, updated_at DESC);
ALTER TABLE public.orca_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orca_sessions_own ON public.orca_sessions;
CREATE POLICY orca_sessions_own ON public.orca_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.orca_messages (
  id           bigserial PRIMARY KEY,
  session_id   uuid NOT NULL REFERENCES public.orca_sessions(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('user','assistant','tool','system')),
  content      text NOT NULL,
  tool_calls   jsonb,                                -- for assistant: [{tool,args,latency_ms,ok}]
  sources      jsonb,                                -- for assistant: [{kind:'article'|'tx'|'whale',id,title,url}]
  follow_ups   jsonb,                                -- ["chip 1","chip 2","chip 3"]
  focus        jsonb,                                -- {type,value,label} pinned on this turn
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orca_messages_session ON public.orca_messages (session_id, id);
ALTER TABLE public.orca_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orca_messages_own ON public.orca_messages;
CREATE POLICY orca_messages_own ON public.orca_messages FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### 3.2 API additions

- `GET  /api/orca/sessions` → list user's sessions (id, title, updated_at, message_count). Pagination cursor `since`.
- `POST /api/orca/sessions` → create new session. Body: `{ surface_seed?, title? }`. Returns `{ id }`.
- `GET  /api/orca/sessions/[id]` → full message log for the session (RLS-pinned).
- `PATCH /api/orca/sessions/[id]` → rename or archive.
- `DELETE /api/orca/sessions/[id]` → permanent (the row plus all messages cascade).

`POST /api/chat` extends its body shape:
```ts
{
  message: string,
  session_id?: string,          // if omitted, server creates one and returns it
  focus?: { type, value, label },
  history?: ChatTurn[],         // server merges with DB history if session_id given
  confirm?: { calls: ToolCall[] }
}
```
Response gains: `{ session_id, message_id, tool_calls, sources, follow_ups, confirm? }`.

### 3.3 The surface ↔ brain contract

A surface is just a renderer of `orca_messages`. To open the same conversation in Studio that you started in the Drawer:
1. Drawer creates session with `surface_seed='drawer'`.
2. Drawer's "Continue in Studio" button does `router.push('/orca?session=' + id)`.
3. Studio hydrates from `GET /api/orca/sessions/[id]`.
4. Both surfaces see new messages by subscribing to a small `useOrcaSession(sessionId)` hook that polls or uses Supabase realtime (poll is fine for v4 — 4s interval — Realtime is a v4.1 polish).

Same in reverse: Studio sessions can be "popped" into the Drawer if the user navigates away.

---

## 4. The component contracts

All new components live in `components/orca/`. Each is a single file. Props are typed (.jsx with JSDoc is fine — match repo convention).

### 4.1 `OrcaConversation.jsx`

The atom. Used identically by Drawer, Studio, and Mini.

```jsx
<OrcaConversation
  sessionId={string | null}        // null = create on first send
  focus={Focus | null}             // auto from useOrcaContext()
  variant={'drawer' | 'studio' | 'mini'}
  maxTurns={number | undefined}    // mini passes 3; others undefined
  onPromote={(sessionId) => void}  // mini calls this when maxTurns reached
  initialDraft={string}            // for slash-command seeds
  className={string}
/>
```

Owns: thread render, input, send, confirmation buttons, follow-up chips, source cards, tool-call chip rendering, streaming shimmer, SonarPulse, error states, retry. Does NOT own: header, session list, inspector. Those belong to the shell.

Critical: implements the **two-trip confirmation** that's been missing.
```js
async function send(text) {
  const res = await postChat({ message: text, session_id, focus })
  appendAssistant(res)
  if (res.confirm) {
    renderConfirmBubble(res.confirm.summary, res.confirm.calls)
    // when user clicks Confirm:
    //   const res2 = await postChat({ message: '', session_id, confirm: { calls } })
    //   appendAssistant(res2)
  }
}
```

### 4.2 `OrcaDrawer.jsx` (Surface A)

```jsx
<OrcaDrawer />
```

Listens to a global Zustand-or-context store (`useOrcaDrawer()`) for `{ open, focus }`. Renders a 420px right-edge slide-in (animation: `transform: translateX()` + `tokens.ease`, `dur.base`). Header shows session title (or "New conversation"), context chip, kebab menu (rename, archive, open in Studio, clear). Body is `<OrcaConversation variant="drawer" />`. Footer is the input. Esc closes; outside-click closes unless pinned (pin button in header). Route changes do NOT close it — the focus chip updates instead.

### 4.3 `OrcaLauncher.jsx`

Floating button (bottom-right, 44×44, cyan ring on hover) + global keyboard handler. Lives in `app/layout.jsx`. Hidden on `/auth/*`, signed-out marketing pages, and `/orca` (Studio has no need for the floating launcher). `Cmd+K` (Mac) and `Ctrl+K` (Win) open the drawer; `Esc` closes. If user presses `?` they get a 4-line keyboard help overlay (`/` to focus search, `K` to open ORCA, `Esc` to close).

### 4.4 `OrcaStudio.jsx` + route `app/orca/page.jsx` (Surface B)

Three-column layout (CSS grid 280px / 1fr / 360px, collapsible):

- **Left:** `<SessionList />` — virtualised list of `GET /api/orca/sessions`. Click to load. "New" button at top. Search by title.
- **Center:** `<OrcaConversation variant="studio" />`. Wider bubbles, larger type (16px body). Header shows session title (editable inline).
- **Right:** `<ToolInspector />` — when a message is selected, shows the full `tool_calls` array, the planner trace, the timings, the raw response from each tool (collapsible JSON). This is the *"agentic"* part on display. Power users love it; new users can ignore it (collapse to 0px with a tab).

Studio supports a shareable URL: `/orca?session=<id>`. If the visitor isn't the session owner, they get a "this conversation is private" page. (No public sharing in v4 — that's a v4.1 polish.)

### 4.5 `OrcaMini.jsx` (Surface C)

Compact 380×360 card with `<OrcaConversation variant="mini" maxTurns={3} onPromote={…} />`. Used inside `PersonalDashboardClient` as the right column. When `maxTurns` is reached, the next user send instead triggers `onPromote(sessionId)` which opens Studio at that session.

### 4.6 `AskOrcaButton.jsx`

```jsx
<AskOrcaButton
  context={{ type: 'ticker', value: 'BTC', label: '$BTC' }}
  seed={'why is this moving today?'}
  variant={'inline' | 'icon'}      // inline = "Ask ORCA" pill; icon = small cyan node
/>
```

On click: opens the Drawer pre-pinned to `context` and pre-seeded with `seed`. Drops onto:
- `app/token/[symbol]/page.jsx` next to the ticker header (`inline`).
- Every row in `app/whales/page.jsx`, `app/trending/page.jsx`, the Watchlist tab, the Wallets tab (`icon`).
- Every news card on `/news` and on token pages (`icon`).

### 4.7 `useOrcaContext.js`

Hook. Reads `usePathname()` + minimal route-segment parse. Returns `Focus | null`. Pure. Tested.

### 4.8 `useOrcaDrawer.js`

Zustand store (or a simple Context — repo convention check). Exposes `open(focus?, seed?)`, `close()`, `pin()`, `unpin()`, `state.open`, `state.focus`, `state.seed`, `state.pinned`.

---

## 5. The write loop, fixed for real

This is the hill v4 must take. If `add BTC to my watchlist` doesn't work end-to-end, nothing else in v4 ships.

### 5.1 Server-side: deterministic fast-path

Before the LLM router runs, `lib/orca/orchestrator/router.ts` checks a small regex table:

```ts
const FAST_WRITES = [
  // add/remove watchlist
  { re: /\b(add|track|watch|follow)\s+\$?([a-z0-9]{2,8})\b.*\bwatchlist\b/i,
    intent: 'add_watchlist', extract: (m) => ({ ticker: m[2].toUpperCase() }) },
  { re: /\b(remove|untrack|unwatch|drop)\s+\$?([a-z0-9]{2,8})\b.*\bwatchlist\b/i,
    intent: 'remove_watchlist', extract: (m) => ({ ticker: m[2].toUpperCase() }) },
  // track wallet
  { re: /\b(track|follow|watch|save)\s+(?:wallet\s+)?(0x[a-f0-9]{40}|[a-z0-9]{32,44})\b/i,
    intent: 'track_wallet', extract: (m) => ({ address: m[2] }) },
]
```

Match → skip LLM entirely → planner emits a `confirm` payload directly. Target latency: <250ms. Zero token cost. The LLM only enters when the user phrases something ambiguous.

### 5.2 Server-side: per-tool timeout

Every tool call wraps in `Promise.race([call(), timeout(8_000)])`. On timeout: tool returns `{ ok: false, error: 'timeout' }`. The writer sees this and either re-plans or returns a clean *"I couldn't reach the data in time — try again."*. No 60s function timeout, ever.

### 5.3 Client-side: confirmation buttons

`<OrcaConversation/>` recognises `res.confirm` and renders:
```
┌─────────────────────────────────────┐
│ I'll add $BTC to your watchlist.    │
│                                     │
│   [ Confirm ]   [ Cancel ]          │
└─────────────────────────────────────┘
```
Confirm → second POST with `confirm.calls`. Cancel → optimistic "Got it — not making that change."

### 5.4 The single Playwright e2e that holds the line

`test/e2e/orca-watchlist-write.spec.ts`:
1. Sign in as a fixture user (env: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`).
2. Open `/dashboard/personal`. Assert PulseStrip renders.
3. Press `Cmd+K`. Assert drawer opens.
4. Type *"add BTC to my watchlist"*. Submit.
5. Assert a Confirm button appears within 1500ms.
6. Click Confirm.
7. Assert the success bubble appears within 1500ms.
8. Close drawer. Switch to Watchlist tab. Assert a row with `BTC` is visible.
9. Open drawer again. Type *"remove BTC"*. Submit. Confirm. Assert row gone.

If this spec fails, build fails. CI gate.

### 5.5 The 60-second observability requirement

After every chat response, the trace persisted to `orca_traces` MUST include: per-tool latency, total wall time, tokens-in, tokens-out, model name. Add a server-side log line that's grep-able: `[orca_metrics] sid=… ttl_ms=… tools=N tokens_in=… tokens_out=…`. Without these, the next *"the request did not complete"* bug is invisible. We almost certainly already log half of this in `runOrchestrator.ts`; the rest is one PR.

---

## 6. Build order (each branch is independently shippable)

| # | Branch | Locks-in | "Done" criterion |
| --- | --- | --- | --- |
| 1 | `feat/orca-v4-foundations` | tokens.ts, `orca_sessions` + `orca_messages` migrations, `/api/orca/sessions/*` endpoints, vitest for endpoints | RLS tests green; sessions table queryable from the API. |
| 2 | `feat/orca-v4-conversation-atom` | `OrcaConversation.jsx`, the two-trip confirm, the streaming shimmer, the SonarPulse, the source strip. Standalone Storybook (`npm run sb`) page demos all states. | All v3-equivalent tests for the old `PersonalCopilotPanel` pass against the new atom. |
| 3 | `fix/orca-v4-write-loop` | `router.ts` fast-write table, per-tool 8s timeout, `[orca_metrics]` log, Playwright e2e. | The Playwright spec in §5.4 is green in CI. Manual: `add BTC` works in <2s. |
| 4 | `feat/orca-v4-drawer` | `OrcaDrawer.jsx`, `OrcaLauncher.jsx`, `useOrcaContext.js`, `useOrcaDrawer.js`, mounted in `app/layout.jsx`. | `Cmd+K` opens drawer on every signed-in page; route changes refresh focus chip. |
| 5 | `feat/orca-v4-studio` | `app/orca/page.jsx`, `OrcaStudio.jsx`, `SessionList.jsx`, `ToolInspector.jsx`. Redirect `/ai-advisor → /orca` in `next.config.js`. | Opening `/orca?session=<id>` from the drawer's "Continue in Studio" button hydrates the same thread. |
| 6 | `feat/orca-v4-inline-ask` | `AskOrcaButton.jsx`, dropped onto token pages, whale rows, news cards, watchlist + wallets rows. | Clicking the button anywhere opens the drawer pre-pinned and pre-seeded. |
| 7 | `chore/orca-v4-deletions` | Remove `CopilotPane`, `Tray`, `PersonalCopilotPanel`, `app/ai-advisor/*`. Update imports. | `npx vitest run` still green. `git diff --stat` shows negative line count net of additions. |
| 8 | `feat/orca-v4-mini` | `OrcaMini.jsx` wired into `PersonalDashboardClient`, replacing the W5 CopilotPane area. 3-turn promote-to-Studio flow. | Mini hits its turn cap → click promote → land in Studio with full history. |
| 9 | `chore/orca-v4-one-click-writes` | `+` icons on every ticker row across the app that POST `/api/personal/watchlist` directly (no LLM). Same for "Track wallet" on every whale row. | Manual: adding a ticker from a token page takes one click and zero seconds of LLM latency. |
| 10 | `chore/orca-v4-polish` | Source-strip favicons, follow-up chip keyboard shortcuts, disclaimer fold, source-card click telemetry. | Visual diff against §2.2 spec. |

Each branch: at least one Playwright spec if it touches a user flow. Vitest only otherwise. Merge in order.

---

## 7. What v4 is NOT

- **Not a streaming refactor.** Keep using the current OpenAI-compatible chat completions; the shimmer is faked client-side from the final response. Server-Sent Events is a v4.1 task and is decoupled.
- **Not a new model.** Same Grok / fallback / mini for the router. Don't burn this sprint on plumbing a second provider.
- **Not a write-tools expansion.** The fast-path table covers the three writes users actually do today (`add_watchlist`, `remove_watchlist`, `track_wallet`). New write intents wait until the loop is proven.
- **Not a public-sharing feature.** Sessions are private. Sharing is v4.1.
- **Not a copy-of-Cursor command palette.** Cmd+K opens the Drawer. It does not open a fuzzy command palette. One job per shortcut.

---

## 8. Compliance, regression-tested per branch

Same wall as before, but now we add gates to CI:

- A grep CI step that fails the build on `should (buy|sell|hold)|price target|entry price|stop[- ]loss|take[- ]profit|recommend|conviction|alpha\b|guaranteed` inside `lib/orca/`, `components/orca/`, and the new `app/orca/` route.
- A vitest that loads each renderer's output for a fixture prompt and asserts the disclaimer string appears verbatim.
- The Playwright e2e (§5.4) also asserts that the success bubble contains "Disclaimer" anchor text.
- No `console.log` of a session token in any of the new files. CI grep gate.

---

## 9. Approval gate (answer before any code lands)

1. **Studio route name.** I propose `/orca`. Anything else?
2. **Drawer width.** 420px on desktop, full-screen on `<768px`. OK?
3. **Inline mini-chat lives only on `/dashboard/personal` for v4, or also on `/token/[symbol]`?** I'd ship it only on personal first.
4. **Session retention.** Indefinite, or auto-archive after 90 days of inactivity? Recommend 90.
5. **Pro-tier gating.** Free users today get N chats/day. Does the Drawer count those the same as Studio? Recommend: yes, one quota shared across all surfaces.
6. **`Cmd+K` vs an explicit "Ask ORCA" button.** Recommend BOTH. Confirm.
7. **Are we OK redirecting `/ai-advisor → /orca` permanently in v4-branch-5?** SEO impact is small (it's an interior page) but worth a yes/no.

Answer those seven and v4 starts at branch #1.

---

## 10. The one-line vision

> **One brain that lives in a slide-in drawer on every page, a research studio at `/orca`, and a compact pane inside the dashboard — same memory, same tools, same disclaimer, with a `+` button you can press without ever opening it.**

Build for that line. If a PR doesn't move us toward it, the PR doesn't ship.

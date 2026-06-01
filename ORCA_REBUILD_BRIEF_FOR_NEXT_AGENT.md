# ORCA AI — Rebuild Brief for the Next Agent

**Audience:** the next coding agent / chat session that will work on Sonar's ORCA layer.
**Author of this brief:** the previous agent, summarising what went wrong, what is currently shipping, and what the user actually wants.
**Date written:** 2026-05-25.

---

## 1. TL;DR

- **Production is currently on commit `40229de`** (`signal-research: add Families D / E / F`). That is the v1 baseline — the ORCA the user calls "the good one". **No stages A–E have been implemented yet.**
- A whole "v4 redesign" (commits `52b15eb → 6026c30`) was force-reverted off `main` on 2026-05-25. It is preserved on:
  - tag `backup/pre-revert-orca-v4` → `6026c30`
  - branches `feat/orca-v4-foundations`, `…-conversation-atom`, `…-drawer`, `…-launcher`, `…-studio`, `…-mini`, `chore/orca-v4-cleanup`, `feat/orca-v4-history`, `feat/orca-v4-polish`, `test/orca-v4-e2e-watchlist-write`, `fix/orca-v4-watchlist-refresh`, `feat/orca-v4-stream-stages`.
- **Do not re-ship that v4 redesign.** Pieces of it (the orchestrator, the fast-write tools, the new tables) are reusable, but the UI and the writer prompt were the regression.
- **The user's goal:** ORCA should feel like Nansen AI — a single embedded copilot layer across the whole product that personalises everything (dashboard, watchlist, alerts, prose answers) — without sacrificing the long-form research-note answer quality the v1 brain produced.

---

## 2. What the previous agent did (the v4 rebuild)

Across ~12 branches the previous agent rebuilt ORCA end-to-end. The big moves:

1. **New orchestrator pipeline** (`lib/orca/orchestrator/`):
   - `router` (mini-LLM, JSON output) → `planner` (deterministic tool selection) → `tools` (read + write) → `writer` (long-form LLM) → `guardrails`.
   - Behind env flag `ORCA_ORCHESTRATION_V2=true`.
   - Added intents: `token_overview`, `personal`, `wallet_lookup`, `signal_explain`, `article_explain`, `data_query`, `explainer`, `followup`, `compliance_decline`.
   - Each intent has its own renderer/system-prompt in `lib/orca/renderers/*.ts`.
   - This part is **architecturally sound** and worth keeping/extending.

2. **New write tools** (`lib/orca/orchestrator/tools/writeTools.ts`):
   - `runAddToWatchlist`, `runRemoveFromWatchlist`, placeholder `setUserAlert`.
   - Two-trip Confirm/Cancel UX: first turn returns `confirm: { label, calls }`, second turn echoes it back.
   - "Fast-write" deterministic short-circuit (`fastWrites.ts`) — regex-matches "add SOL to watchlist" and skips the LLM router entirely for sub-250ms latency.
   - **Keep this idea.** It's the right way to handle deterministic write intents inside a chat.

3. **New tables in Supabase** (migrations applied to prod, leave them — they're harmless when unused):
   - `user_profile`, `user_holdings`, `user_watchlist` (singular — distinct from existing `user_watchlists` plural), `orca_memory`.
   - `orca_sessions`, `orca_messages` (replaced the old `chat_sessions`).
   - `orca_traces` (per-stage telemetry).
   - **Note: `user_watchlist` (singular) ≠ `user_watchlists` (plural).** The token-page "Add to watchlist" button writes to the plural one. The new ORCA write tools wrote to the singular one. The personal dashboard's Watchlist tab now reads from the singular. This split is a footgun — unify before extending.

4. **New UI surfaces (all reverted from prod, preserved on branches):**
   - `OrcaConversation` atom — single React component for thread + input + Confirm/Cancel.
   - `OrcaDrawer` — slide-in side panel (Cmd+J).
   - `OrcaLauncher` — Cmd+K palette + FAB.
   - `/orca` Studio — full-page sessions + conversation + inspector.
   - `OrcaMini` — compact card on the Personal dashboard (replaced the old CopilotPane).
   - Deleted: `/ai-advisor` page, `ClientOrca.jsx` (1548 lines, the v1 UI), `PersonalCopilotPanel`, `CopilotPane`, `Tray`.

5. **What killed the user experience (per user feedback, in priority order):**
   - **a. The writer prompt for `intent='personal'` was tuned for short "peer chat" responses (3-4 sentences).** The user expected v1's 1100-1600 word research note with bolded sections, bullet lists, news mechanism analysis, and the mandatory disclaimer. This single prompt change is what made answers feel "dull and hard to manage".
   - **b. The new UI returned JSON only, no SSE.** v1 streamed labelled stages ("Fetching news from 3 sources", "Loading chart data", "Loading sentiment scores") and rendered them as a live progress list. v4's UI couldn't render that because it called `res.json()`. So even when v1 was running, the UX felt slower and less alive.
   - **c. New session tables (`orca_sessions/orca_messages`) replaced `chat_sessions`.** All historical conversations the user had from v1 became invisible. "The chat history does not work" → because the new UI is looking at a different table.
   - **d. `/ai-advisor` page was deleted.** That was the user's mental model of "ORCA" — a dedicated route with a sessions sidebar, the long-form pane, the SSE step display, and the old chart embed. The new `/orca` Studio looked nothing like it.
   - **e. No token chart in the answer.** v1's `/ai-advisor` pane embedded a price chart for the discussed ticker above the prose. v4 dropped this entirely.
   - **f. Tool/Inspector panel surfaced in the UI.** The user explicitly does not want a visible "tool" or "trace" section. Internal-only.

6. **What was good in v4 (worth porting back carefully):**
   - The orchestrator's intent routing (`router.ts`). Cleanly separates "this is a wallet question" vs. "this is a token question" vs. "this is a news-explain question" — exactly what the user is now asking for ("not like a bot that always answers about btc").
   - The Confirm/Cancel two-trip write loop. Safe by construction.
   - The `fastWrites` short-circuit for write commands.
   - The renderer-per-intent pattern (`lib/orca/renderers/`). Keep this. But the **content** of `personal.ts`'s prompt is what killed quality; rewrite it to match v1's `ORCA_SYSTEM_PROMPT`.
   - Per-stage trace telemetry (`orca_traces`) — useful for debugging without exposing it to users.

---

## 3. The current production state (what's live RIGHT NOW)

- `main` = `40229de`.
- ORCA route: `app/api/chat/route.ts` — the v1 path. Long-form research-note prompt. SSE streaming for ticker analyses. JSON fallback for non-ticker questions.
- ORCA UI: `app/ai-advisor/ClientOrca.jsx` (1548 lines). Has:
  - Sessions sidebar (loads from `/api/chat/sessions`, table `chat_sessions`).
  - SSE step display (`agentSteps` state, rendered as a stage list).
  - Long-form markdown rendering with the v1 styling.
  - Chart embed for the discussed ticker.
- Personal dashboard `/dashboard/personal`: has CopilotPane (the old version, with slash-palette context chip) and Tray.
- Token pages: have "Add to watchlist" button — writes to `user_watchlists` (plural) table.
- Personal Watchlist tab: reads from `user_watchlist` (singular) via `lib/personal/watchlist.ts` → `/api/personal/watchlist` → `getUserTickers`.
  - **The split between singular and plural is still a bug.** If the user clicks "Add to watchlist" on a token page, the row lands in `user_watchlists` (plural), and the personal Watchlist tab reading from `user_watchlist` (singular) won't see it. Worth fixing as a tiny, isolated migration: `INSERT INTO user_watchlist SELECT user_id, symbol AS ticker, added_at FROM user_watchlists ON CONFLICT DO NOTHING` plus a trigger to keep them in sync, or migrate one to the other.
- Env vars in Vercel: `ORCA_ORCHESTRATION_V2` exists from the v4 era. Set it to `false` or delete it — `40229de`'s `route.ts` doesn't read it.

---

## 4. What the user wants (verbatim themes from feedback)

Quoting and paraphrasing across the conversation:

1. **"ORCA AI as an embedded layer across the whole of Sonar."** Not a separate page only. Should appear contextually on the dashboard, token pages, wallet pages, news pages.
2. **"Like the Nansen AI layout."** Reference screenshot the user shared: clean centred input ("Ask Nansen AI"), suggested-question chips below it, sleek sidebar with Home / Trade / Smart Money / Tokens / Profiler / Chains / Portfolio / Points / Stake / Smart Alerts, but with our current theme colors, no "tools" panel visible to the user.
3. **"With our themes."** Sonar's existing dark palette + neon cyan `#00e5ff` accent. Do NOT introduce a new design system.
4. **"With the graph of the token asked about in the output."** When the answer is about a ticker, embed the price chart inline above or alongside the prose.
5. **"Answers like before, with highlighted colors."** v1's bolded **Data** / **News and Market Impact** / **Bottom Line** sections, with backticked numbers (`$67,432`), markdown bullet lists, news links rendered as clickable cards. The previous agent's "peer chat" tone was wrong.
6. **"Easy to scroll through and read."** Big readable paragraphs, generous spacing, anchor-able sections.
7. **"Add the stuff about being able to add BTC or SOL or whatever token to the watchlist in personal based on what the user says."** Voice-style write actions from inside chat. Use the v4 Confirm/Cancel + fastWrites pattern. **But unify the watchlist tables first.**
8. **"Different prompts."** Per-intent answers:
   - "What is this wallet doing?" → wallet lookup, recent flows, classification.
   - "What is BTC doing?" → ticker overview (current path).
   - "What is this news about?" → article expansion with mechanism analysis.
   - "What about this macro factor?" → macro renderer (rates / dollar / liquidity / regulation).
   - The bot must route correctly and NOT default to BTC when prompted about something else.
9. **"Chat history that actually works."** Persistent, retrievable, named/renameable sessions. Use the EXISTING `chat_sessions` table (v1) — do not introduce `orca_sessions` again unless you migrate all historic rows.
10. **"Make it interactive, professional."** Suggested follow-up chips after each answer. Keyboard shortcuts (1/2/3 to pick a chip — that bit from v4 was good).
11. **"Sleek, integrated in the design, with custom questions."** Suggested questions should be context-aware: on the token page, suggest "what whales are accumulating BTC", "explain this 24h drop", etc.; on a wallet page, suggest "is this wallet smart money", etc.; on the dashboard, suggest "what changed in macro today", "biggest whale moves this week".
12. **No visible "tool" / "trace" / "inspector" panel.** Telemetry must be internal only.
13. **"Do not add a tool section."** Same as 12.

---

## 5. The forward plan the user is implicitly asking for

A staged plan — incremental, each step independently shippable, never deleting the v1 surfaces until the replacement is demonstrably better.

### Stage A — Bridge intent routing into v1 (no UI change)

Goal: keep v1's answer quality and UI, but stop it defaulting to BTC on every prompt.

- Pull only `lib/orca/orchestrator/router.ts` (intent classifier) and the lightweight `routeMessage` call from the v4 branches.
- In `app/api/chat/route.ts`, BEFORE calling `buildOrcaContext`, run the router to classify the message.
- Branch:
  - `intent === 'token_overview'` → existing v1 path (long-form research note + SSE stages + chart). **No change.**
  - `intent === 'wallet_lookup'` → new lightweight path: extract address, hit existing wallet endpoints (`/api/wallet/[address]` or whatever exists), render with a `wallet` system prompt (write a v1-style long-form note about THAT wallet's recent activity).
  - `intent === 'article_explain'` → extract URL/id, fetch the article from news table, render with an `article` system prompt (mechanism: short-term / long-term / factor classification — borrow this structure from the v1 prompt's "News and Market Impact" section).
  - `intent === 'data_query'` → e.g. "biggest whale buys today" → execute a direct supabase query, render as a markdown table + 2-sentence summary.
  - `intent === 'personal'` → run v1 path but inject the user's holdings/watchlist as additional context, and rewrite the system prompt to acknowledge the user's positions (DO NOT use v4's short peer-chat prompt — use v1's long-form prompt with one extra paragraph at the top noting the personalisation context).
  - `intent === 'compliance_decline'` → return the hardcoded decline string. Skip everything else.
- Keep v1's SSE streaming for all paths that fetch upstream data.
- **Keep the user's existing `chat_sessions` table.** Persist v1 messages there as today.

### Stage B — Watchlist voice writes (no UI change to main ORCA pane)

- First, unify `user_watchlist` (singular) and `user_watchlists` (plural). Pick one canonical table (recommend keeping the plural since the token-page button already writes to it; ALTER the singular to be a view OR migrate rows + drop the singular).
- Port `fastWrites.ts` and `runAddToWatchlist`/`runRemoveFromWatchlist` from the v4 branches, BUT point them at the canonical table.
- In v1's `/api/chat/route.ts`, after the router step, if `detectFastWrite(message)` matches, return `{ response: 'Add BTC to your watchlist? …', confirm: { label, calls } }` directly (no LLM call). v1's chat history UI already handles freeform assistant text; you just need to teach `ClientOrca.jsx` to render the Confirm/Cancel buttons when `confirm` is present in the response.
- On Confirm, POST again with `{ message: label, confirm: { calls } }`. Server-side: validate calls, inject `userId` from the verified JWT (NEVER trust the client's userId — this was a v4 lesson), run the write, return a one-line confirmation.
- After successful write, fire a window event `orca:watchlist-changed` so the WatchlistTab / WatchlistPanel re-fetches. **This refresh hook was the actual bug last time** — the write succeeded but the UI didn't know to reload.

### Stage C — Nansen-style centred input + suggested chips (additive, behind a route)

- Build a new `/ai` page that mirrors the Nansen layout (centred input, suggestion chips, sidebar untouched).
- Suggested chips are context-aware:
  - Default: "What changed in macro today?", "Top whale moves this week", "Hot tokens by social momentum".
  - On token page deep-link: "Why did $BTC move today?", "Whale flow on $BTC", "News driving $BTC".
  - On wallet page deep-link: "What is this wallet doing?", "Is this wallet smart money?", "Recent counterparties".
- Keep `/ai-advisor` route alive in parallel. Only delete it when `/ai` has feature parity and the user explicitly approves.

### Stage D — Embed ORCA in dashboards/token/wallet/news pages (additive)

- Small "Ask ORCA" affordance on each surface: bottom-right floating action button OR a slim header pill.
- Clicking opens a side drawer (NOT a full-page redirect) that pre-fills a context-aware prompt and streams the answer.

- The drawer is the v4 `OrcaDrawer` idea — but it MUST use v1's long-form prompt and SSE stages.

### Stage E — Memory + personalisation (only after A–D land cleanly)

- The `user_profile` table from v4 (experience level, time horizon, risk tolerance, preferred chains) is genuinely useful. Hook a tiny onboarding wizard the first time a user opens ORCA. Use those fields to bias the system prompt's tone (e.g. "calibrate to an intermediate user, lead with 24h and 7d windows").
- The `orca_memory` table — extract facts from each conversation (background job, not blocking). Use those facts as additional context on the next conversation. This was sketched in v4's `lib/orca/memory/extractor.ts` — port the extractor only, drop the UI.

---

## 6. Hard rules for the next agent (lessons learned the painful way)

1. **Never delete user-facing surfaces before the replacement is shipped, smoke-tested by the user, and explicitly approved.** The deletion of `/ai-advisor`, `ClientOrca.jsx`, `PersonalCopilotPanel`, `CopilotPane` was the single biggest cause of the user's frustration. Use additive branches.
2. **Never change a system prompt that controls answer quality without a side-by-side comparison with the user.** v4's `personal.ts` prompt was the silent killer. Always preserve v1's `ORCA_SYSTEM_PROMPT` as the default; introduce new prompts via env flag and ASK the user to A/B before flipping the flag globally.
3. **Never introduce a new database table that duplicates an existing one** (`orca_sessions` vs `chat_sessions`, `user_watchlist` vs `user_watchlists`). Migrate or unify. If you must add a new table, write the back-fill in the same migration.
4. **Service-role Supabase client bypasses RLS. Anon client doesn't.** Writes from server-side `/api/chat` must use service-role and EXPLICITLY set `user_id` from the verified JWT. Never trust `args.userId` from the client.
5. **Don't ship JSON-only when the legacy path is SSE.** Stream parity must be maintained, or every interaction feels slower even when the backend is faster.
6. **Don't surface tool/trace/inspector panels to users.** Telemetry is for the `orca_traces` table and Vercel logs, never the UI.
7. **Confirm before force-pushing `main`.** Tag the current `HEAD` first (e.g. `backup/pre-revert-…`) so nothing is unrecoverable.
8. **Use feature flags for any change to the writer prompt or the response shape.** `ORCA_ORCHESTRATION_V2` was the right idea but the wrong default (`true` in prod). Default to v1 behaviour, flip the flag per-user or per-session for canary testing.
9. **The user wants additive, not replacement.** "I want it to look like Nansen WITH our themes" means: keep our themes, add Nansen's layout principles to a new page — do not redesign existing pages out from under the user.
10. **When in doubt, ask the user before pushing anything that touches `app/api/chat/route.ts` or `app/ai-advisor/`.** Those are the production-critical files.

---

## 7. Concrete starting checklist for the next agent

```
[ ] git status     — confirm main = 40229de, working tree clean
[ ] vercel env ls  — confirm ORCA_ORCHESTRATION_V2 is false or absent
[ ] supabase: run `SELECT count(*) FROM chat_sessions WHERE user_id = <test-user>;` — confirm v1 sessions still readable
[ ] open /ai-advisor in browser, send "what is btc doing today" — confirm long-form research note renders with SSE stages, chart, and disclaimer
[ ] open /dashboard/personal — confirm Watchlist tab, CopilotPane, Tray are all visible
[ ] decide which Stage (A / B / C / D / E) to tackle FIRST based on user's current top complaint
[ ] for that Stage, create a feat/ branch and ship ONLY that — do not bundle multiple stages
[ ] before each PR: deploy to a Vercel preview URL (NOT main), share the URL with the user, wait for explicit "ship it"
```

---

## 8. Pointers — where the salvageable v4 code lives

- `git show backup/pre-revert-orca-v4:lib/orca/orchestrator/router.ts` — intent router (Stage A).
- `git show backup/pre-revert-orca-v4:lib/orca/orchestrator/fastWrites.ts` — deterministic write detector (Stage B).
- `git show backup/pre-revert-orca-v4:lib/orca/orchestrator/tools/writeTools.ts` — addToWatchlist/removeFromWatchlist tool implementations (Stage B). REMEMBER to point at the unified watchlist table.
- `git show backup/pre-revert-orca-v4:lib/orca/renderers/article_explain.ts` — article expansion prompt (Stage A intent split).
- `git show backup/pre-revert-orca-v4:lib/orca/renderers/wallet_lookup.ts` — wallet renderer prompt (Stage A intent split).
- `git show backup/pre-revert-orca-v4:lib/orca/memory/extractor.ts` — background memory extractor (Stage E).
- `git show backup/pre-revert-orca-v4:components/orca/OrcaDrawer.jsx` — drawer atom (Stage D — but rewrite to use v1's long-form prompt + SSE).
- `git show backup/pre-revert-orca-v4:supabase/migrations/20260525_user_profile_and_copilot_memory.sql` — already applied to prod, the tables exist.

DO NOT cherry-pick these blindly. Read each, port the IDEA, and integrate with v1's writer prompt + SSE flow.

---

## 9. One-paragraph version (if you only read one section)

The previous agent rebuilt ORCA's orchestrator + UI from scratch over 12 branches. The orchestrator architecture (intent router → planner → tools → writer → guardrails, with renderer-per-intent and a Confirm/Cancel write loop) is good and worth keeping. The execution killed UX in four ways: (1) the new "personal" writer prompt produced 4-sentence answers instead of v1's 1100-1600 word research notes, (2) the new UI dropped SSE streaming and the loading-stage display, (3) it moved sessions to a new table so all history disappeared, (4) it deleted `/ai-advisor`, `ClientOrca.jsx`, `PersonalCopilotPanel`, and `CopilotPane`. Production was force-reverted to `40229de` (the v1 state). The v4 work is preserved on tag `backup/pre-revert-orca-v4` and the `feat/orca-v4-*` branches. The forward plan: keep v1 as the default, additively port the intent router (Stage A), the watchlist voice writes (Stage B, after unifying `user_watchlist` singular vs `user_watchlists` plural), a Nansen-style `/ai` page (Stage C), and an embeddable drawer (Stage D) — all behind feature flags, all on preview URLs, all approved by the user before touching main. Never delete a v1 surface without an approved replacement. Never default a new system prompt to "on" in prod. Never surface "tools" or "inspector" panels to the user.

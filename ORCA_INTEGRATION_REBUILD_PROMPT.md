# ORCA Integration Rebuild — Prompt v3

**Date:** 2026-05-24.
**Author:** Eduardo (frustration-driven brief, transcribed).
**Replaces:** the action items in `ORCA_AGENTIC_REDESIGN_PROMPT.md` that touched the copilot itself. Keeps W1/W2/W3 (bug fixes, wallets table, agentic tools) and the W4 PulseStrip; rips out W5 (CopilotPane + Tray) and reconsiders the whole copilot footprint.

---

## 0. Honest read of where we landed

The 6-branch redesign shipped 322 green tests and a prettier dashboard. The thing the user actually tried to do — *"add BTC to my watchlist"* — does not work. The exact reasons:

1. **Write intents never round-trip.** `addToWatchlist` is registered in `lib/orca/orchestrator/tools/writeTools.ts`. The orchestrator plans the call, returns a confirmation payload, and waits for the client to POST `{ confirm: { calls: [...] } }`. The client (`components/orca/PersonalCopilotPanel.jsx`) doesn't read that confirmation payload, doesn't render Confirm/Cancel buttons, and doesn't send the second POST. The first POST therefore ends up routed through the writer path with no resolved tool result, the LLM stalls, the function hits `maxDuration=60`, and the browser surfaces the `TypeError: Failed to fetch` as *"The request did not complete."*
2. **ORCA_ORCHESTRATION_V2 may also be off in prod.** Verify in Vercel env. If the flag is false, `addToWatchlist` is literally unreachable.
3. **The copilot is a peninsula.** It only exists at `/dashboard/personal`. The user is on `/token/BTC` reading a chart, wants to add it to a watchlist, and has to: go to `/dashboard/personal`, click a tab, type a sentence, wait for an LLM round-trip, hope it parses. That is worse than the button it replaced.
4. **W5 added two components (CopilotPane, Tray) that wrap things we already had.** Net new capability: zero. Net new bundle size and surface area: non-trivial.
5. **The real product work this sprint was signal forensics in the parallel worktree.** The copilot redesign consumed time that did not move a user-facing number.

This prompt is the cleanup.

---

## 1. Non-negotiables for v3

- **Every page that names a ticker, wallet, or article has a one-click "Ask ORCA about this" affordance and a one-click write action where one makes sense.** No required typing. No required navigation to `/dashboard/personal`.
- **Write intents must round-trip in under 2 seconds and either succeed or render a clear failure.** Never a timeout, never a vague "request did not complete."
- **The copilot is a slide-in panel attached to the global app shell, not a page-scoped component.** Open from any route via a single keyboard shortcut (`?` or `Cmd+K`) and a single floating button. Inherits the page's context automatically — no manual chip pinning.
- **Delete more than we add.** Net file count for v3 must be **negative**. If a new component does not remove an old one, do not add it.

---

## 2. Concrete fixes, in priority order

### 2.1 P0 — fix the write loop. Today.

- **Flip the env flag in Vercel.** `ORCA_ORCHESTRATION_V2=true` on Production and Preview. Confirm via `vercel env ls`. If it was already true, log a single trace from production showing the actual stage that hangs.
- **Render confirmations in the copilot UI.** When the API response contains `confirm` (shape: `{ calls: ToolCall[], summary: string }`), render the summary as an assistant bubble with two buttons: `Confirm` / `Cancel`. On Confirm, re-POST `/api/chat` with body `{ message, history, confirm: { calls } }`. On Cancel, render *"Got it — not making that change."* No second LLM call needed.
- **Short-circuit obvious writes without an LLM round-trip.** *"add BTC to watchlist"*, *"remove ETH"*, *"track wallet 0x…"* are deterministic. Parse them in `lib/orca/orchestrator/router.ts` with a regex layer BEFORE the LLM call. Skip the planner, skip the writer, render the confirmation directly. Target latency: 200ms.
- **Add one e2e Playwright test.** Sign in as a fixture user, type *"add BTC to my watchlist"*, click Confirm, assert the row appears in the Watchlist tab. If this test ever goes red, the build fails. This is the regression net we should have had in W1.
- **Add a server-side timeout guard.** Wrap every tool call in `Promise.race([call, timeout(8_000)])`. A hung Binance/news fetch must NOT consume the whole 60s budget.

### 2.2 P0 — make ORCA available everywhere, not just `/dashboard/personal`.

- **Create `components/orca/OrcaLauncher.jsx`**: a single floating button (bottom-right, 44×44, cyan accent) plus a global `Cmd+K`/`?` keyboard handler. Lives in `app/layout.jsx` so it renders on every route except `/auth/*` and marketing pages.
- **Create `components/orca/OrcaDrawer.jsx`**: 420px right-side slide-in. Reuses the existing `PersonalCopilotPanel` thread + input logic, with the confirmation-button addition from 2.1. Closes on Esc, on outside-click, on route change unless the user pinned it.
- **Auto-derive context from the route.** A tiny hook `useOrcaContext()` reads `usePathname()` and returns a `focus` object:
  - `/token/[symbol]` → `{ type: 'ticker', value: symbol }`
  - `/whale/[address]` → `{ type: 'wallet', value: address }`
  - `/news/[slug]` → `{ type: 'article', value: slug }`
  - `/dashboard/personal` → `null` (user picks)
  - else → `null`
  The drawer header shows *"Looking at $BTC"* automatically. No manual pinning.
- **Per-page "Ask ORCA about this" buttons.** Drop a small `<AskOrcaButton context={…}/>` next to:
  - the ticker header on `/token/[symbol]`
  - every row on `/watchlist`, `/whales`, `/trending`
  - every headline card on `/news`
  - every signal card on `/dashboard/personal`'s Signals tab
  Clicking opens the drawer pre-pinned to that context and pre-seeded with one of: *"explain why $X moved today"*, *"summarise this wallet's last week"*, *"explain this article and why it matters"*.

### 2.3 P1 — delete the things v5 added that nobody needs.

- **Remove `components/personal/CopilotPane.jsx`.** Its only job was the context chip + slash palette. The chip moves into `OrcaDrawer` header. The slash palette moves into a 4-button row inside `OrcaDrawer` (same code, different home). Net: -1 file.
- **Remove `components/personal/Tray.jsx`.** The Memory drawer becomes a Link in the dashboard top-bar (one line). Trading is locked anyway — link to its own `/dashboard/personal/trading` placeholder page instead of a drawer. Settings doesn't exist yet — don't ship dead UI. Net: -1 file.
- **Delete the now-unused `seedMessage`/`onSeedConsumed` plumbing in `PersonalCopilotPanel.jsx`** once `OrcaDrawer` owns input state. Or — preferred — replace `PersonalCopilotPanel` entirely with `OrcaDrawer`'s thread and retire the file. Net: -1 file.

### 2.4 P1 — make the write path discoverable without language.

For the things we know users want to do (add to watchlist, remove from watchlist, track a wallet, ask "why moved"), the copilot is the SLOW path. The fast path is a button. Add:

- **A `+` icon on every ticker / token-row / search result that adds it to the watchlist directly.** Optimistic update, single `/api/personal/watchlist` POST (which already exists, predates ORCA). Toast on success. The copilot becomes the *explanatory* layer, not the primary CRUD surface. This is the integration the user is asking for.
- **A "Track this wallet" button on every wallet page and every whale-alert row.** Same idea — POSTs to `/api/personal/wallets` (shipped in W4). Toast.

The copilot stays the natural-language fallback for *"add SOL, ETH, and AVAX"* and for the explainers.

### 2.5 P2 — make it feel like one product.

- **Single source of truth for the empty-state copy.** Today the watchlist, signals, and copilot each have their own "no data yet" string in slightly different tones. Move to `lib/ui/empty-states.ts` so one PM can edit them in one file.
- **Match the existing app chrome.** The dashboard currently uses its own header/back-link. Use the global app header so the user is never confused about which "level" they're at.
- **One stat-card style across the app.** PulseStrip tiles, the global `/statistics` cards, and the dashboard signal cards all use slightly different border radii and padding. Pick one token from `lib/ui/tokens.ts` (cards: `radius: 14px; padding: 18px 20px; bg: rgba(13,20,33,0.6); border: 1px solid rgba(255,255,255,0.06)`) and refactor the rest.

---

## 3. What to STOP doing

- Stop adding tools to the orchestrator that nothing in the UI invokes. `findTrackedWallets`, `summariseEntity`, etc. are dead weight until a page button calls them. Build the button first.
- Stop shipping a new copilot wrapper component every branch. There is one copilot. It lives in one drawer. It mounts once at the app shell. Done.
- Stop measuring success by "tests pass." 322 passing tests did not catch *"add BTC to watchlist does literally nothing in production."* Add the one Playwright test described in 2.1 and treat it as the only test that matters for this feature.
- Stop running the redesign and the signal-forensics workstream in the same repo without a divider. The forensic agent has been pushing straight to `main` and its commit messages interleave with the redesign ones, which is why the user couldn't tell what shipped. Move forensic work to its own branch (`work/signal-forensics`) and merge it on a schedule.

---

## 4. Build order (small, sequenced, each ship-able alone)

| # | Branch | Outcome |
| --- | --- | --- |
| 1 | `fix/orca-write-loop` | 2.1: confirmation buttons, deterministic write parser, Playwright e2e, server-side per-tool timeout. *"add BTC"* works. |
| 2 | `feat/orca-global-drawer` | 2.2: `OrcaLauncher` + `OrcaDrawer` + `useOrcaContext` + `AskOrcaButton` wired into 4 route families. |
| 3 | `chore/orca-cleanup` | 2.3: delete `CopilotPane`, `Tray`, retire `PersonalCopilotPanel` if replaced. Negative diff. |
| 4 | `feat/one-click-watchlist-wallet` | 2.4: `+` buttons on every ticker/wallet surface across the app. |
| 5 | `chore/ui-consistency` | 2.5: unified empty-state copy and card token. |

Each branch: one Playwright test if it touches user flow, otherwise vitest only. Merge on green. No mega-branches.

---

## 5. Definition of done for v3

After merge of #1–#4, the following user journey works in production:

1. User signs in, lands on `/dashboard/personal`. PulseStrip populated.
2. User clicks "BTC" in the news feed → goes to `/token/BTC`.
3. On `/token/BTC` they click the `+` icon next to the ticker. Toast: *"BTC added to watchlist."* The copilot was never opened.
4. They press `?`. OrcaDrawer slides in, header reads *"Looking at $BTC"*. They type *"why did this move today?"*. Reply streams back in < 4s. Disclaimer at the bottom.
5. They click *"track wallet 0xab…cd"* in a whale-alert card. Toast. Wallet appears in Wallets tab.
6. They go back to `/dashboard/personal`. Watchlist shows BTC. Wallets shows the new wallet. No "Network error". No "request did not complete." No 504s in the Vercel function logs for this session.

If any of those six steps fails, the branch that owned it doesn't merge.

---

## 6. Compliance, unchanged

- No emojis, no buy/sell/hold verbs, no price targets. Same wall as v2.
- Every renderer ends with `MANDATORY_DISCLAIMER` from `lib/orca/shared-rules.ts`.
- Service-role writes pinned to verified `user_id`. The new `OrcaDrawer` and `AskOrcaButton` must use the same `supabaseBrowser().auth.getSession()` token pattern as everything else.

---

## 7. One thing to acknowledge before starting

The v2 redesign added surface area faster than it added capability. The path forward is the opposite: **every PR in this v3 plan must remove a click, remove a file, or fix a broken loop. If it does none of those, don't ship it.**

# Workstream A — DEMOTE_SCOPE.md

**Branch:** `feat/signal-demote-2026-05-24`
**Source spec:** [PROMPT_SIGNAL_EXECUTION.md](PROMPT_SIGNAL_EXECUTION.md) §2
**Author intent:** enumerate every file and copy string that needs to change so the demote PR is a single auditable diff. This file is the contract.

---

## 0. Critical finding (must resolve before coding)

The repo already underwent a thorough **2026-04-21 legal remediation** (see `LEGAL_AUDIT_2026-04-21.md`, `/memories/repo/legal-remediation-2026-04-21.md`). The current state is in several places **more conservative** than what the Opus 4.7 memo asks for in §2.2/§2.3:

| Surface | Current state (post-legal-remediation) | Opus memo §2.2 spec | Conflict |
|---|---|---|---|
| `/api/signals` `display_label` | `BUY → INFLOW`, `SELL → OUTFLOW` (purely descriptive flow language; chosen to dodge FCA Art. 53 / SEC IA §202(a)(11)) | `BUY → BULLISH context`, `SELL → BEARISH context` | Opus wording is a *directional sentiment label*; legally weaker than INFLOW/OUTFLOW |
| `lib/orca/system-prompt.ts` Hard Rule 7 | Explicitly bans "bullish/bearish lean, buy/sell signal" — must "convert into a neutral factual description" | "Current composite context for {token}: {BULLISH/NEUTRAL/BEARISH}" | Opus copy *violates* the existing hard rule |
| `/api/chat` Hard Rule 5 | Banned words include `alpha`, `edge`, `conviction`, `institutional-grade` | (no change requested) | Keep as-is |

### Recommended resolution (DEFAULT — proceed unless told otherwise)

**Keep INFLOW/OUTFLOW vocabulary. Do NOT regress to BULLISH/BEARISH.** Reasoning:

1. The Opus memo's §2.2 spec was written without visibility into the 2026-04-21 legal remediation; its goal is *honesty about lack of edge*, not regulatory positioning.
2. INFLOW/OUTFLOW achieves the same "non-actionable, demoted" outcome Opus wants, while preserving the FCA/SEC/MiCA-defensible framing.
3. The two non-controversial wins from §2.2 — adding `actionable: false` and the `experimental` badge + methodology tooltip — give us the honesty Opus wanted without undoing legal work.

If the founder disagrees and wants to override to BULLISH/BEARISH, that decision should be logged here before I touch ORCA's system prompt or `/api/signals`.

**→ Pending founder decision. Default = keep INFLOW/OUTFLOW.**

---

## 1. What still needs to change (assuming the default decision above)

### 1.1 API layer

| File | Change | Status |
|---|---|---|
| [app/api/signals/route.js](app/api/signals/route.js) | Add `actionable: false` to every signal object returned by `neutralize()`. Add a top-level `"experimental": true` and `"methodology"` field to the response payload. Keep INFLOW/OUTFLOW mapping. Update the `muted` message to reflect the n=4,465 verdict, not the old 0/116 BUY copy. | TODO |
| [app/api/signals/accuracy/route.js](app/api/signals/accuracy/route.js) | Audit response shape. Confirm any `accuracy %`, `win_rate` style fields are gated behind an admin-only flag or stripped from public response. | TODO (read first) |
| [app/api/chat/route.ts](app/api/chat/route.ts) | No change — already conservative. | DONE pre-existing |

### 1.2 ORCA system prompt

| File | Change | Status |
|---|---|---|
| [lib/orca/system-prompt.ts](lib/orca/system-prompt.ts) | No structural change. Add one paragraph under "WHAT YOU CAN DO" item 4: *"You may note when Sonar's internal composite score is currently muted/suppressed by its own circuit breakers (both breakers are tripped as of 2026-05-24 on n=4,465 outcomes since the 2026-05-11 cache fix). Do not surface the underlying composite as actionable; describe it as 'currently suppressed by Sonar's internal accuracy gates'."* | TODO |
| [app/api/chat/route.ts](app/api/chat/route.ts) line 88 | "Explain how Sonar classifies transactions (BUY/SELL/TRANSFER/DEFI)" — these are *transaction classifications* (whale tx side), not signal labels. Keep. | KEEP |

### 1.3 UI components (signal-derived elements)

| File | Change | Status |
|---|---|---|
| [app/token/[symbol]/TokenDetailClient.jsx](app/token/[symbol]/TokenDetailClient.jsx) | Add `experimental` badge component (Tailwind class per Opus §2.2) to any block that surfaces a derived directional view (currently the score-based BULLISH/BEARISH summary on line 140). Add methodology tooltip with the exact Opus copy. | TODO |
| [app/token/[symbol]/TokenDetailClient.jsx](app/token/[symbol]/TokenDetailClient.jsx) line 1975 | `Signal: {orcaAnalysis.signal}` — confirm this is fed by ORCA's neutralised output, not raw `token_signals.signal`. If raw, remap through `display_label`. | INVESTIGATE |
| [app/token/[symbol]/TokenDetailClient.jsx](app/token/[symbol]/TokenDetailClient.jsx) line 2024 | Comment mentions a removed "Recommendation" block (BUY SIGNAL / AVOID / SHORT). Verify the block is actually removed; if it's commented-out dead code, delete the comment too. | TODO |
| [app/token/[symbol]/page.jsx](app/token/[symbol]/page.jsx) lines 140-141 | Derived `BULLISH/BEARISH` label from `score`. This is a *per-page-derived* label, not from `token_signals`. Either (a) rename to `INFLOW/OUTFLOW` for vocabulary consistency, or (b) wrap in experimental badge. Recommend (a). | TODO |
| [app/dashboard/](app/dashboard/) | Audit every component that consumes `/api/signals`. Add `experimental` badge to each. | TODO (per-file pass) |
| [components/wallet-tracker/SmartMoneyPanel.jsx](components/wallet-tracker/SmartMoneyPanel.jsx) | Uses `bullishCount` / `bearishCount` from smart-money divergence — this is a *whale-flow descriptor*, not the composite signal. Keep. | KEEP |
| [components/wallet-tracker/TokenHeatmap.jsx](components/wallet-tracker/TokenHeatmap.jsx) | `bullish` / `bearish` are color tokens, not user-facing labels. Keep. | KEEP |

### 1.4 Marketing pages

| File | Change | Status |
|---|---|---|
| [app/page.jsx](app/page.jsx) lines 6, 10, 16, 24 | SEO meta: strip `"AI-powered signals from ORCA 2.0"`, `"institutional-grade analytics"`, `"crypto trading signals"`. Replace with honest descriptions (whale tracking + on-chain analytics + ORCA research assistant). | TODO |
| [app/page.jsx](app/page.jsx) line 69 | FAQ answer mentions "trading recommendations" — strip. | TODO |
| [app/page.jsx](app/page.jsx) line 85 | "professional-grade tools used by hedge funds and institutional traders" — banned phrasing per ORCA Hard Rule 5. Strip. | TODO |
| [app/page.jsx](app/page.jsx) line 109 | "make informed investment decisions" — strip "investment decisions". | TODO |
| [app/ai-crypto-signals/page.jsx](app/ai-crypto-signals/page.jsx) line 19 (FAQ JSON-LD) | "How accurate are ORCA's signals?" + answer claiming "significantly earlier detection of major price movements". Strip the accuracy claim; rewrite as research-tool framing. | TODO |
| [app/ai-crypto-signals/page.jsx](app/ai-crypto-signals/page.jsx) line 18 | "actionable trading insights" — strip "actionable". | TODO |
| [app/ai-crypto-signals/page.jsx](app/ai-crypto-signals/page.jsx) line 75 | `"Buy/sell classification with confidence scores"` — strip. | TODO |
| [app/ai-crypto-signals/page.jsx](app/ai-crypto-signals/page.jsx) line 50 | Existing BETA disclaimer points to `/api/signals/accuracy`. Update copy to reflect the post-2026-05-11 verdict (both breakers tripped, engine suppressed). | TODO |
| [README.md](README.md) | No marketing copy that needs to change beyond the engine-test-script mention on line 78. Engine is still being run; keep. | KEEP |

### 1.5 Internal / dead code (no user impact)

| File | Note |
|---|---|
| [app/api/cron/compute-signals/route.js](app/api/cron/compute-signals/route.js) | Uses STRONG BUY/BUY/SELL/STRONG SELL internally to write to `token_signals.signal`. **Per §2.1, keep the engine running.** No change. |
| [app/api/cron/evaluate-signals/route.js](app/api/cron/evaluate-signals/route.js) | Outcome evaluation. Keep. |
| [app/api/frontier/accuracy/route.js](app/api/frontier/accuracy/route.js) | Public? If so, audit the response and gate or strip. | TODO (investigate) |
| [src/views/Statistics.js](src/views/Statistics.js) | Legacy view from `src/` (not Next.js app dir). Confirm not routed. | TODO (verify dead) |
| [app/lib/signalEngine.ts](app/lib/signalEngine.ts) | Internal type definition `SignalLabel`. Keep. |
| [app/lib/technicalAnalysis.ts](app/lib/technicalAnalysis.ts) lines 106, 109 | Internal TA component score comments. Keep. |
| [app/api/cron/whale-whisper/route.js](app/api/cron/whale-whisper/route.js) | Internal context building. No user surface. Keep. |
| [app/api/cron/seo-article/route.js](app/api/cron/seo-article/route.js) | Generates SEO articles — **flag**: generates articles about "buy/sell signals" and "accuracy to expect". Pause this cron until copy is rewritten. | TODO (disable cron) |
| [DASHBOARD_V2_PROMPT.md](DASHBOARD_V2_PROMPT.md) | Internal doc; already contains the regulatory guardrail block. Keep. |
| [app/blog/[slug]/BlogPostClient.jsx](app/blog/[slug]/BlogPostClient.jsx) | Pre-existing blog content about whale tracking patterns; uses "sell signal" in the descriptive sense (e.g. "exchange transfers are the most direct sell signal" — referring to whale behaviour, not a Sonar product output). No regulatory issue. Keep. |
| [app/changelog/ChangelogClient.jsx](app/changelog/ChangelogClient.jsx) line 448 | Historical changelog entry about a past recalibration. Factual record. Keep. |
| [app/ethereum-whale-tracker/page.jsx](app/ethereum-whale-tracker/page.jsx) line 58 | Already says "descriptive data, not buy or sell signals". Keep. |

### 1.6 New badge component (one-time)

Create [components/ExperimentalBadge.jsx](components/ExperimentalBadge.jsx):
- Renders the Tailwind chip from Opus §2.2.
- Accepts a `tooltip` prop with the exact methodology copy.
- Default tooltip = the verbatim Opus §2.2 paragraph.

Import where needed in §1.3.

---

## 2. Out of scope for this PR

- Workstream B (forensic scripts) — runs in parallel, separate PRs.
- Workstream C (ensemble quant build) — separate scaffolding.
- Deleting `token_signals` / `signal_outcomes` data — never delete, only quarantine.
- Pausing the compute-signals cron — engine must keep collecting data for B and C.
- Migration to remove `signal` field from DB — keep for backward-compat per §2.2.

## 3. Pre-merge checklist (copy of §2.5)

- [ ] `npm run build` passes
- [ ] Smoke test `/dashboard`, `/token/BTC`, `/token/SOL`, `/whales`, `/`
- [ ] No BUY/SELL/win-rate copy visible
- [ ] Every signal element has the experimental badge + methodology tooltip
- [ ] ORCA: "should I buy BTC?" → refusal per existing Hard Rule 3 (unchanged)
- [ ] `curl /api/signals` returns `actionable: false` and `experimental: true`
- [ ] PR title: `feat: demote signals to non-actionable context (Path 1, n=4,465 verdict)`
- [ ] PR body links Opus memo + this scope doc
- [ ] Vercel deploy verified on production

## 4. Estimated diff size

- ~3 new files (ExperimentalBadge component + tests, possibly a small consts file)
- ~12 edited files (1 API, 2 ORCA-adjacent, 4 UI, 5 marketing)
- ~150 LOC net change, mostly copy replacement
- No DB migrations
- No cron schedule changes (other than possibly pausing `seo-article`)

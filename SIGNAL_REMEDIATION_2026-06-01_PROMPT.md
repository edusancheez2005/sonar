# Signal-Engine Remediation Brief — 2026-06-01

> Anchor prompt for the engineer / agent that picks this up.
> Self-contained: assume the reader has zero prior context. Read this file end-to-end before touching code.

---

## 1. One-paragraph summary

The production signal engine has been emitting **only NEUTRAL** for seven consecutive days (31,308 rows, zero directional output). Live diagnostics on 2026-06-01 identified **four compounding failures**: (1) both per-direction circuit breakers (`signal_circuit_breaker.BUY` and `.SELL`) are stuck in a self-locking dead-state because the auto-clear condition requires graded BUY/SELL samples that the breaker itself prevents from existing; (2) the `signal_outcomes` grading table has had zero new rows for 7 days, meaning the `/api/cron/evaluate-signals` worker is silently dead or starved; (3) Tier 4 (Derivatives) is **100 % dead** across all recent rows (`tier4_score=0`, `tier4_confidence=0`) — the engine is running on 3 of 4 tiers without flagging the degradation; (4) Tier 1 / Tier 3 feeders are partially degraded (37.8 % / 16.2 % null rates). The engine itself still wants to emit conviction (raw_score reaches ±40+ on INJ, WLD, FET, CRO), but every directional emission is suppressed downstream and never measured.

---

## 2. Hard numbers (collected 2026-06-01 13:30 UTC)

### Live signal distribution
| Window  | NEUTRAL | SELL | STRONG SELL | BUY | STRONG BUY |
|---------|---------|------|-------------|-----|------------|
| last 24h | 4,657  | 0    | 0           | 0   | 0          |
| last 72h | 13,869 | 0    | 0           | 0   | 0          |
| last 7d  | 31,308 | 0    | 0           | 0   | 0          |

### Last time each label fired
- STRONG BUY: 2026-05-11 (CRO score 74) — 21 days
- BUY:        2026-05-12 (LRC score 61) — 20 days
- SELL:       2026-05-23 (RENDER score 42) — 9 days
- STRONG SELL:2026-05-23 (WETH score 28) — 9 days

### Circuit-breaker state
```
BUY:  active=true  acc=26.5% n=34  tripped=2026-05-12T06:00Z  reason="< 35% suppress threshold"
SELL: active=true  acc=16.7% n=30  tripped=2026-05-23T18:00Z  reason="< 35% suppress threshold"
```

### Engine internal state on the muted rows (sample n=1,000 from last 24h)
- raw_score distribution: p10=−20, p50=−5, p90=+14 (so ~13 % of rows are in BUY/SELL territory by raw score)
- Would-be labels by `raw_score` ±20/±50 thresholds: 0 STRONG BUY · 26 BUY · 871 NEUTRAL · 103 SELL · 0 STRONG SELL
- Traps recorded: **108 `Circuit Breaker`**, **0 `3-Tier Disagreement`** → the 3-tier gate (`ff1dd08`, May 24) is a no-op in production; the breaker is the entire mute mechanism
- Tier zeros: tier1=37.8 %, tier2=7.2 %, tier3=16.2 %, **tier4=100 %**

### Grading pipeline
- `signal_outcomes` last 7d: **0 rows** (all eval_window values)
- This is the smoking gun for the breaker dead-lock — the clear condition (≥25 graded directional samples in 6h) cannot be evaluated because no samples are being written

### `snapshot_inputs` (PR-1b writer, schema v2)
- 100 % populated on last 24h ✅
- Most fields null (whale_inflow_usd, sentiment_composite, news_cluster_count_24h, funding_rate=0) — the writer is healthy, the upstream feeders for Families A/B/C/E are not

---

## 3. Diagnosed root causes

### 3.1 Breaker dead-lock (CRITICAL — primary defect)
**File:** `app/api/cron/accuracy-watchdog/route.ts` (clear logic ~line 305).
**Logic:**
```ts
if (m.n >= BREAKER_MIN_SAMPLES) {                    // need >= 25
  if (cur.active && m.pct >= BREAKER_CLEAR_PCT) {    // need >= 45% accuracy
    nextActive = false
    transition = 'cleared'
  }
}
```
**Failure mode:** `m` is computed from `signal_outcomes` rows where `signal_type` is BUY (or SELL). But `app/api/cron/compute-signals/route.js` lines 113–129 downgrades any breaker-suppressed signal to `signal='NEUTRAL'` **before** `storeSignal()` writes the row. The grader then has no BUY/SELL rows to grade in the window. Therefore `m.n` is permanently 0 for the family the breaker is suppressing, the `>= 25` gate is never satisfied, and the breaker latches forever.
**Compounded by:** `signal.original_signal` is set on the in-memory object but is **not a column on `token_signals`** and is therefore lost on persist (verified by `column token_signals.original_signal does not exist` error 2026-06-01). Even if grading worked, there's no audit trail of intended direction.

### 3.2 Grading pipeline silent death (CRITICAL — independent defect)
0 outcomes in 7 days even for the directions the breaker isn't suppressing (and for the period before the SELL breaker tripped). The `/api/cron/evaluate-signals` worker is either: not scheduled, throwing on start, hitting an upstream price-snapshot gap, or refusing to grade NEUTRAL rows (which would explain part but not all of the gap). Needs direct investigation: tail Vercel logs, run a single invocation manually, check `vercel.json` cron schedule.

### 3.3 Derivatives tier outage (HIGH)
`app/lib/derivativesData.ts` → `fetchDerivativesData()`. 1,000 / 1,000 recent rows have `tier4_score=0` and `tier4_confidence=0`. Either the data source 401/403s, the Binance pair-mapping symbol fix changed contract addresses, or the function returns `null` and the engine silently zeroes the tier. The engine should at minimum log a warning when a tier is structurally absent, not pretend it scored zero.

### 3.4 Upstream feeder degradation (MED)
Tier 1 (whale flow) null 37.8 %, Tier 3 (sentiment) null 16.2 %. These compress the raw_score band (p90 only +14, when historically directional emissions fired at +30/+50). Even if breakers cleared today, the engine would emit fewer BUY/SELL than it did pre-regression.

---

## 4. Research questions to answer BEFORE proposing the final fix

These are required reading / inputs to the design — do them, write the answer down, then iterate the plan in §5.

1. **How do mature systematic trading systems handle kill-switches without dead-locks?** Look specifically at:
   - Shadow / paper / "challenger" trading: emit and grade the suppressed direction at-risk-zero so the clear condition stays measurable.
   - Two-thresholds-with-hysteresis vs single-threshold (we already use 35/45 — hysteresis is fine; the bug is the data-source gap, not the band).
   - Time-based release valves (auto-clear after N hours regardless of accuracy, with a downgraded confidence cap on first re-emission).
   - Bayesian / decayed-prior accuracy estimates so the breaker forms a recovery view from a thin tail of evidence instead of demanding a fresh full sample.
   References worth pulling: Lopez de Prado *Advances in Financial ML* ch. 9 (backtesting under causal selection), Marcos Carreira on "kill-switch leaks", any reputable post-mortem from a quant team that experienced a stuck risk-limit.
2. **What is best practice for "shadow grading" of suppressed signals?** I.e. write the would-be label alongside the user-facing label, grade both, and let the breaker's clear logic see the shadow stream. What's the privacy / UX risk (none here — internal column) vs the alternative of fully releasing into production for measurement?
3. **What does the Derivatives outage look like in upstream logs?** Is the function throwing and being swallowed by a `try/catch`, or returning a structurally empty payload that the engine accepts at face value?
4. **Should the engine refuse to publish a confidence score if ≥N tiers are structurally missing?** Currently 1-of-4 missing is silent. A "tier health gate" would surface the degradation as a `Trap` rather than a zeroed tier.

---

## 5. Phased remediation plan

> Each phase has an explicit acceptance criterion. Do **not** start phase N+1 until phase N's criterion is green and committed.

### Phase 1 — Read-only diagnostic deep-dive (no code changes)
- [ ] Confirm `/api/cron/evaluate-signals` cron schedule in `vercel.json`. Tail last 10 Vercel runs of that endpoint.
- [ ] Invoke `/api/cron/evaluate-signals?token=BTC` manually with `CRON_SECRET` and capture stderr.
- [ ] Run `fetchDerivativesData('BTC')` standalone and log the raw response.
- [ ] Confirm the dead-lock hypothesis by counting `signal_outcomes` rows with `signal_type IN ('BUY','SELL','STRONG BUY','STRONG SELL')` for each 6h window since May 12. Expectation: all zero post-trip dates.
- **Acceptance:** A 1-page diagnostic note appended to this file with the four answers + an explicit go/no-go for Phase 2.

### Phase 2 — Restore measurement (unblocks every other phase)
The right thing to fix first is the grader, because nothing else can be validated until graded outcomes flow again.
- [ ] Fix or restart `/api/cron/evaluate-signals`. If it's failing on stale price snapshots, add the same freshness gate used by `compute-signals`.
- [ ] Add `original_signal` (text, nullable) and `breaker_suppressed` (bool, default false) columns to `token_signals` (one short migration).
- [ ] Modify `compute-signals/route.js` so that when the breaker downgrades a signal:
  - the row is still written with `signal='NEUTRAL'` for user-facing purposes,
  - `original_signal` is persisted with the would-be label,
  - `breaker_suppressed=true`.
- [ ] Modify `/api/cron/evaluate-signals` to additionally grade `original_signal` for rows where `breaker_suppressed=true`, writing into a new table or a `shadow=true` column on `signal_outcomes`.
- **Acceptance:** Within 12 h of deploy, `signal_outcomes` has ≥100 new rows including shadow-graded BUY and SELL. We can now *see* what the engine would have done.

### Phase 3 — Fix the breaker clear logic
- [ ] Update `accuracy-watchdog/route.ts` to compute `directionAccuracy` against the union of (a) live `signal_outcomes` rows AND (b) shadow-graded rows from Phase 2.
- [ ] Add a **time-based release valve** as a backstop: if a breaker has been active >72 h AND shadow accuracy ≥40 % AND n ≥15, auto-clear with a `reason="time_valve_release"` and emit at-half-confidence for the first 6 h (a new `confidence_cap_until` column on the breaker row).
- [ ] Add a structured warning emission for any breaker active >48 h so we don't sleep on the next dead-lock.
- **Acceptance:** Both BUY and SELL breakers clear within 24 h of Phase 3 deploy. Daily signal mix returns to a non-pathological distribution (>0 directional emissions per 6h window with shadow accuracy ≥40 %).

### Phase 4 — Fix the Derivatives feeder
- [ ] Identify the failure (per Phase 1's investigation).
- [ ] Either restore the feed, fall back to a secondary source, or explicitly drop Tier 4 from the score weighting (currently 30 %) until it's back, redistributing weight to Tier 1/2/3 proportional to their current weights.
- [ ] Add a per-tier "structural health" gate that publishes `tier_health: { t1:'ok', t2:'ok', t3:'degraded', t4:'down' }` into the signal row so any future tier outage is visible in the row itself.
- **Acceptance:** ≥90 % of new rows have a non-zero `tier4_score` OR the engine emits a clearly-flagged "3-tier mode" signal with weight-redistribution documented.

### Phase 5 — Tier 1 / Tier 3 feeder rehab (deferred)
- Investigate the 37.8 % / 16.2 % null rates only after Phases 2–4 are stable. May be a symptom of the same Derivatives outage (shared upstream) — re-measure after Phase 4.

---

## 6. Non-goals (explicit — do NOT do these in this remediation)

- **Do not** retune the engine weights or thresholds (Tier 1/2/3 score → label thresholds, BUY/SELL cutoffs, calibration constants). The engine's conviction looks fine in `raw_score`; the bug is in the publishing pipeline.
- **Do not** manually `PATCH` `signal_circuit_breaker` to clear it without Phases 2 + 3 in place. The breaker will instantly re-trip on the first 6 h of low-quality emissions (we know this from the May 6 history note in `accuracy-watchdog/route.ts`).
- **Do not** widen the 3-tier-agree gate or change `BREAKER_SUPPRESS_PCT`. Those thresholds were tuned from forensic H2 work — leave them, fix the measurement layer.
- **Do not** add new families (D/E/F replays etc.). They depend on the same broken feeders.
- **Do not** create a parallel "v2 signal" path. We fix the one we have.

---

## 7. Roll-back plan

Every phase ships behind one of these reversible mechanisms:

- Phase 2 column additions are nullable / default false → safe to deploy; if grading misbehaves, set `SHADOW_GRADING=off` env var and the writer no-ops.
- Phase 3 release valve is gated by `BREAKER_TIME_VALVE=on` env var (default off on first deploy). Operator flips it on after watching shadow accuracy stabilise.
- Phase 4 tier-weight redistribution is gated by `TIER4_DEGRADED_MODE=on` env var; off restores current behaviour.

Manual emergency clear of either breaker is one PATCH (documented in `SIGNAL_PIPELINE_2026-05-13.md` line 272). Use only as a last resort and only after notifying the team.

---

## 8. Acceptance criterion for "this remediation is complete"

For seven consecutive days after Phase 4 deploys:
- ≥1 BUY-family and ≥1 SELL-family emission per 6 h window (no all-NEUTRAL stretches > 6 h),
- `signal_outcomes` writes ≥50 rows/day,
- 24h directional accuracy (live, non-shadow) ≥45 %,
- `signal_circuit_breaker` either active=false on both rows, or active=true with `triggered_at` within the last 48 h (i.e. tripping for real reasons, not stuck).

---

*End of remediation brief.*

---

## Appendix A — Phase 1 diagnostic findings (executed 2026-06-01)

### A.1 Grading pipeline status — **HEALTHY, not dead**
- `evaluate-signals` cron is scheduled (`vercel.json`: `"30 * * * *"`, hourly).
- The grader **explicitly skips NEUTRAL** (file header: *"NEUTRAL → no evaluation (excluded)"*) — this is correct behaviour.
- Last graded BUY outcome: `signal_time=2026-05-12T05:35Z` (24 min before BUY breaker tripped at 06:00Z).
- Last graded SELL outcome: `signal_time=2026-05-23T17:36Z` (24 min before SELL breaker tripped at 18:00Z).
- All BUY/SELL signals are graded across their 1h/6h/24h windows then "age out" — no new ones since the trips because the breaker prevents new ones from being written.
- **Revised diagnosis:** Defect §3.2 in this prompt is INCORRECT. The grader is fine. Zero outcomes in 7d is the *expected consequence* of the breaker dead-lock, not an independent failure. The dead-lock is the SOLE primary defect.

### A.2 Dead-lock confirmed empirically
- 7-day signal_outcomes count for BUY/SELL families since trip dates: **exactly zero**.
- BUY breaker clear path: needs `m.n >= 25 AND m.pct >= 45%` from `signal_outcomes` BUY-family rows in the trailing 6 h. `m.n` has been 0 since 2026-05-13 (24 h after last BUY emission was graded). Confirmed permanent lock.
- SELL breaker clear path: same dynamic, locked since 2026-05-24.

### A.3 Derivatives feeder
- `compute-signals` calls `fetchDerivativesData(token, price)` **live per-token** — does not use any cache table.
- `fetchDerivativesData` (`app/lib/derivativesData.ts`) hits `https://fapi.binance.com/...`. On failure it catches and returns `DEFAULT_RESULT` with `available=false`.
- Observed result: 1,000 / 1,000 recent rows have `tier4_score=0` AND `tier4_confidence=0`.
- **Hypothesis:** `fapi.binance.com` is geo-blocked from the Vercel serverless region (this is a known Binance pattern — `api.binance.com` was the original block that drove the May 6 switch to `data-api.binance.vision`). The same fix may be needed: route Derivatives through a Cloudflare-fronted Binance mirror, or fall through to a secondary source (Bybit, Deribit).
- Phase 4 should start by `curl`-ing `https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT` from a Vercel preview deployment to confirm/refute the geo-block.

### A.4 Updated phase priorities
With grading proven healthy, Phase 2 simplifies:
- The schema migration (`original_signal`, `breaker_suppressed`) is still needed.
- The compute-signals patch (persist `original_signal`, set `breaker_suppressed`) is still needed.
- The evaluate-signals patch becomes smaller: add a single branch that grades shadow-suppressed rows by their `original_signal` and writes those outcomes with `shadow=true`.
- Phase 3 (breaker clear logic) and Phase 4 (Derivatives) are unchanged.

### A.5 Go / no-go for Phase 2
**Recommendation: GO** — but ship Phase 2 (shadow persistence) and Phase 3 (breaker reads shadow outcomes) **together** in one deploy. Shipping shadow persistence without the breaker reading it leaves us still locked. Shipping the breaker change without persisted shadow data leaves it reading nothing.

Phase 4 (Derivatives) can ship in parallel — independent code path, no coupling.


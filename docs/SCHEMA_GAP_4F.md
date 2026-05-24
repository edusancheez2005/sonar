# §4.F Signal Research Kit — Schema Gap

**Status:** BLOCKED on data plumbing. Discovered 2026-05-24.

## What's broken

`scripts/backtest-signals.mjs` was designed against a schema that does
not exist. The actual `signal_outcomes` table (per migrations
`20260404_create_signal_outcomes.sql`, `20260420_signal_outcomes_benchmark.sql`,
`20260506b_quarantine_frozen_feed_outcomes.sql`) has:

- `price_change_pct` (one column, not `return_24h`/`return_3d`/`return_7d`)
- `eval_window` ∈ `{'1h','6h','24h'}` (no `'3d'` or `'7d'`)
- **No `snapshot_inputs` column** — the engine inputs (whale net flow,
  trailing 30d mean/stdev, sentiment composite, etc.) are recomputed
  on every cron tick and never persisted per-signal

The harness assumed `signal_outcomes.snapshot_inputs` would carry the
FamilyInput shape needed by `lib/signal-research/families.ts`. Without
it, every row's evaluation is skipped.

## What it'll take to unblock

Three independent pieces of work, each its own PR:

### PR-1 — Capture inputs at signal time

- **Migration:** `ALTER TABLE token_signals ADD COLUMN snapshot_inputs JSONB`
  (nullable; default `NULL` for backfill safety; included in this commit).
- **Writer:** edit `app/api/cron/compute-signals/route.js::storeSignal` to
  serialize the engine's per-token feature vector into the FamilyInput
  shape declared in `lib/signal-research/families.ts`. Specifically, the
  payload must include:
  - `net_flow_24h` (USD)
  - `price_change_24h` (percent)
  - `sentiment_composite` (range [-1, 1])
  - `mu_30d`, `sigma_30d` (trailing stats on `net_flow_24h` over 30d)
- **Verification:** add a `test/cron/compute-signals.snapshot-inputs.test.ts`
  asserting every new `token_signals` row has a non-null `snapshot_inputs`
  with all five fields and that they round-trip through `evaluateAllFamilies`.

### PR-2 — Rewrite the harness against the real schema

- Drop the imagined `return_24h/3d/7d` columns.
- Pivot `signal_outcomes` rows by `eval_window`: each `signal_id` has up
  to 3 rows (`'1h'`, `'6h'`, `'24h'`); the 24h row's `price_change_pct`
  is the forward return.
- Drop the `'3d'`/`'7d'` cases from `lib/signal-research/families.ts`
  evaluate calls OR add a separate cron to compute 3d/7d windows.
- Join `signal_outcomes → token_signals` on `signal_id` and read
  `token_signals.snapshot_inputs` (after PR-1).

### PR-3 — Wait, then backtest

- ≥4 weeks of post-PR-1 clean data (`suspect=FALSE`) needed for
  `n ≥ 200` per family per window (the §4.F promotion bar).
- Run `npm run backtest:signals -- --dry-run` first.
- Human reviews `signal_research_results`, decides go/no-go.

## Why not do all three now

PR-1 requires mapping the engine's internal `factors`/`tiers` shape to
FamilyInput. That mapping is non-trivial because the engine's
`tier1_factors` JSON doesn't currently expose the trailing 30d stats
(`mu_30d`, `sigma_30d`) — those are computed and discarded. Adding them
to the persisted output without breaking the existing
`backtest-figures`/`accuracy-watchdog`/`calibrate-signals` consumers
needs a careful diff.

PR-2 is a 1-hour edit. PR-3 is calendar-bound, not work-bound.

## What this commit does

- Lands the `snapshot_inputs` column (forward-compatible, NULL on all
  existing rows, no consumer breakage).
- Makes `scripts/backtest-signals.mjs` fail fast with a pointer here.
- Does **not** touch `compute-signals/route.js` (that's PR-1).
- Does **not** rewrite the harness (that's PR-2).

## Decision log

The alternative was reconstructing snapshot_inputs by joining each
historic `signal_outcomes` row back to `whale_transactions` /
`price_snapshots` / `sentiment_aggregates` at the matching timestamp.
**Rejected** because:
- Risk of look-ahead leakage if the join windows are off by a tick.
- The reconstructed feature would not match what the engine actually
  saw at signal time (data deduplication, classification confidence
  cuts, etc. are non-deterministic re-runs).
- We pay the calendar cost either way (no shortcut to clean n≥200
  samples per family).

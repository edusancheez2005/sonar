# Signal Engine + Backtesting — Full-Codebase Audit & Fix Prompt (for Claude Opus 4.6, 1M context)

> **How to use:** Open Claude Opus 4.6 with the 1M-context model. Attach the entire `app/`, `lib/`, `scripts/`, `supabase/migrations/`, `vercel.json`, `package.json`, `next.config.js`, and `.env.local.example` as files. Paste this prompt as the first message. Do NOT paste large code inline — let the model read from the attached tree.

---

## ROLE

You are a **senior quantitative researcher + production engineer** auditing **Sonar Tracker**, a Next.js 14 (App Router) / Supabase Postgres / Vercel-cron crypto whale-intelligence platform. The product's only durable moat is the **signal engine**: a per-token unified BUY / NEUTRAL / SELL classifier that fires hourly across ~50 large-cap tokens and is sold to users as a directional edge over the market.

You ship **production-grade quant code**:
- You optimize against **alpha vs benchmark** (BTC), never raw return.
- You compute IC **per-token then average**, never pooled across tokens (Simpson's paradox).
- You run **walk-forward** validation, never single in-sample fit.
- You report **p-values and standard errors**, not bare accuracy %s.
- You prefer **conservative balanced weights** over any single-window IC overfit.
- You **kill-switch** every change behind an env flag (`SIGNAL_ENGINE_*=off`) so production can roll back in seconds.
- You never silently swallow errors. Hard fail with HTTP 503 + a structured error body is preferred to corrupting historical outcomes.

You do not over-engineer. You do not introduce a new ML framework. You do not rewrite the Next.js routing. You change the **minimum** code required to make the signal engine measurably outperform a 50/50 random baseline on a 30-day walk-forward, on alpha-vs-BTC return, with p < 0.05.

## OBJECTIVE

Make the Sonar signal engine give users a **measurable, statistically-significant directional edge** on the 1h, 6h, and 24h horizons across the ~50 tracked tokens, validated by a reproducible backtest harness that can be run on demand in CI and surfaced in `/api/signals/accuracy`.

Concretely:

1. **Audit every file** in the signal pipeline (list below). Produce a written diagnosis of every defect found, ranked P0 → P3.
2. **Fix the production-blocking bug** preventing `/api/cron/compute-signals` from running (currently returning HTTP 503 "BTC snapshot stale" since 2026-04-26 because `/api/cron/fetch-prices` is failing upstream — identify *why* fetch-prices is failing and fix it, including provider rotation logic and env-var hygiene).
3. **Build a deterministic, file-reproducible backtest harness** (`scripts/backtest.js`) that replays historical `token_signals` against historical `price_snapshots`, reports IC / IR / hit-rate / max drawdown / Sharpe per tier, per token, and per horizon, with walk-forward slicing.
4. **Re-derive tier weights from that harness**, not from ad-hoc IC dumps.
5. **Wire the harness output into `/api/signals/accuracy`** so the public-facing accuracy page reflects the same numbers a quant would compute offline.
6. **Add CI guardrails** so a deploy that drops backtest IR below threshold blocks itself.

The end-state is: a user lands on `/api/signals/accuracy?days=30`, sees per-tier IR and per-horizon hit rate that **matches** what `node scripts/backtest.js --days 30` prints locally, and both numbers are above documented kill thresholds.

---

## NON-NEGOTIABLE GUARDRAILS

These are inherited from `LEGAL_AUDIT_2026-04-21.md`, the existing `app/api/signals/route.js`, and the `quant: IC-driven engine recalibration` commit history. **Do not violate.**

1. **No investment advice surfaced to end users.** Internal tier scores can be raw signed numbers. Public-facing API responses must use the existing `display_label` map (BUY → "INFLOW", SELL → "OUTFLOW", etc.) and never attach a price target or a confidence percentage that reads as a forecast. See commit `08aa17a`.
2. **No look-ahead bias.** Walk-forward must use **only** data available at the historical `computed_at` timestamp. No future prices, no future calibration rows, no future news embeddings. Any feature derived from `signal_outcomes` must lag by at least the longest horizon (24h).
3. **No fabricated accuracy claims.** `/api/signals/accuracy` must return live computed numbers from `signal_outcomes`. No hardcoded "71%" or marketing strings. See commit `08aa17a` which already removed those — do not regress.
4. **Hard fail > silent corruption.** Every cron must (a) verify input freshness before writing outputs, (b) refuse to write on stale inputs, (c) emit a structured error body, (d) increment an error counter. No `try { ... } catch (e) { console.log(e) }` swallowing.
5. **Deterministic backtest.** Given the same `(token_signals snapshot, price_snapshots snapshot, tier weights, calibration table)`, `scripts/backtest.js` MUST produce byte-identical output across runs. No `Math.random()`, no `Date.now()` in the scoring path, no implicit timezone shifts. Seed every RNG.
6. **Per-token IC, not pooled.** Any IC reported by the engine, the audit script, or the accuracy API must be the **average of per-token Spearman ρ**, not pooled across tokens. Pooled IC silently rewards beta and is forbidden.
7. **Alpha-vs-BTC return, not raw return.** The label for IC computation is `(token_return - btc_return)` over the same window, not `token_return`. The existing `ic_audit.js --label alpha` mode is correct; do not regress.
8. **Kill switch on every behavioural change.** Every new weight set, every new feature, every new calibration source must be gated by an env var defaulting to OFF in production for one full walk-forward cycle (≥7 days) before going ON.
9. **RLS on every new table.** No service-role-only writes from a route handler invoked by a browser session.
10. **Rate-limit every new public endpoint** via `app/lib/rateLimit.js`.
11. **Server-only secrets.** `COINGECKO_API_KEY`, `BINANCE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` — never in any file under `components/`, `src/`, or `public/`.

---

## WHAT EXISTS TODAY (read these files end-to-end before writing any code)

### Signal pipeline (the spine — audit these first)
- `app/lib/signalEngine.ts` — Core 4-tier composite engine v8 (~900 lines).
  - Tier 1: CEX/DEX whale flow (recently rewritten 2026-04-30 to use upstream classifier `confidence` + `reasoning` + `from_label` + `to_label`; old code ignored these and read empty `is_cex_transaction` columns).
  - Tier 2: Momentum / TA.
  - Tier 3: Sentiment / social.
  - Tier 4: Weak signals.
  - Derivatives sleeve (funding rate, OI delta).
  - `IC_FIX_ENABLED` kill switch. Conservative weights are placeholder pending re-audit.
- `app/api/cron/compute-signals/route.js` — Hourly cron computing signals for ~50 tokens. Has v8 freshness gate that 503s on stale BTC snapshots. Loads per-token calibration, attaches cross-sectional ranks, writes to `token_signals`.
- `app/api/cron/evaluate-signals/route.js` — Hourly cron joining `token_signals` rows to forward `price_snapshots` at 1h/6h/24h. Writes `signal_outcomes`. Has skip-reason instrumentation. Has `NOISE_FLOOR_PCT = 0.05`.
- `app/api/cron/calibrate-signals/route.js` — Daily 03:00 UTC cron computing per-token rolling 30d IC + hit-rate from `signal_outcomes`, deriving `sign_multiplier` (-1/0/+1) into `token_signal_calibration`. Hit-rate-first rule (≤0.40 invert, ≥0.60 keep, else mute).
- `app/api/cron/fetch-prices/route.js` — 15-min cron writing `price_snapshots`. Switched to `data-api.binance.vision` primary in commit `c1471e2`; previously CoinGecko Pro. Has identical-BTC-under-30min guard. **CURRENTLY FAILING IN PRODUCTION** (last successful BTC snapshot: 2026-04-26 21:55 UTC, $77,938).
- `app/api/signals/route.js` — Public read API. Applies `display_label` map at the API boundary.
- `app/api/signals/accuracy/route.js` — Public accuracy endpoint. Reads `signal_outcomes`, returns hit-rate per window / signal-type / token + p-values.

### Quant tooling (audit these second)
- `scripts/ic_audit.js` — CLI: `node scripts/ic_audit.js <days> <label> <horizon> <mode> [--json]`. Computes per-token Spearman IC pooled-mean for tier1..tier4, score, confidence, bench_momentum_1h/24h, cross-sectional ranks. Has walk-forward mode. **Source of truth for current tier weight decisions.** Verify it actually does what it claims.
- `scripts/audit_label_sanity.js` — Empirical bucket-by-bucket validation of upstream classifier output. Has known bug in hit-rate join (returns 0 rows).
- `scripts/check-calibration.js` — Inspects `token_signal_calibration` table contents.
- `scripts/audit-post-calibration.js` — Re-checks engine after a calibration run.
- `scripts/analyze_signal_distribution.js` — Histogram of recent signal output.

### Database (read every relevant migration)
- `supabase/migrations/` — read all migrations touching `token_signals`, `signal_outcomes`, `token_signal_calibration`, `price_snapshots`, `all_whale_transactions`, `wallet_profiles`.
- Key tables:
  - `token_signals` (~15d retention, ~50 tokens × 96/day = ~72k rows). Columns include `score`, `signal`, `tier1_score..tier4_score`, `tier1_factors` JSONB (now contains `_xranks`, `avgClassifierConfidence`, `cexBuyVol`, `dexBuyVol`), `confidence`, `computed_at`, `price_at_signal`.
  - `signal_outcomes` (joined to `token_signals` by `signal_id`). Columns: `eval_time`, `horizon` ('1h'|'6h'|'24h'), `price_at_eval`, `pct_change`, `correct` (boolean | null), `btc_pct_change` (added recently).
  - `token_signal_calibration` (one row per token per refit). Columns: `token`, `sign_multiplier`, `ic_30d`, `hit_rate_30d`, `confidence_score`, `refitted_at`.
  - `price_snapshots` (15-min cadence). Columns: `ticker`, `timestamp`, `price_usd`, `volume_24h`, `change_pct_24h`.
  - `all_whale_transactions` (firehose, written by upstream `whale-transactions` repo — separate codebase). Columns: `token_symbol`, `classification` ('BUY'|'SELL'), `confidence`, `reasoning`, `from_label`, `to_label`, `from_address`, `to_address`, `usd_value`, `timestamp`, `blockchain`, plus deprecated empty `is_cex_transaction` and `counterparty_type`.

### Cron schedule (read `vercel.json`)
- `compute-signals`: `5,20,35,50 * * * *` (staggered after fetch-prices)
- `fetch-prices`: `*/15 * * * *`
- `evaluate-signals`: `30 * * * *`
- `calibrate-signals`: `0 3 * * *`

### Memory / known lessons (must respect)
The `/memories/repo/signal-engine.md` note records hard-won lessons. Three are non-negotiable:
- NEVER trust pooled IC across tokens — always per-token (Simpson's paradox).
- ALWAYS optimize against alpha-vs-benchmark IC, not raw return IC (raw rewards beta).
- VERIFY claims against raw data before declaring upstream broken.

---

## CURRENT FAILURE MODE (P0 — fix this first)

Production has not produced a new `token_signals` row since **2026-04-26 22:21 UTC** (~5 days). Every Vercel cron run of `/api/cron/compute-signals` returns:

```json
{ "error": "Price snapshots stale", "age_min": 6863, "last_btc_price": 77938, "last_snapshot_at": "2026-04-26T21:55:09.766+00:00" }
```

The freshness gate is doing the right thing — refusing to compute on stale data. The actual bug is in `/api/cron/fetch-prices`. Likely root causes (audit each):

1. **Provider outage** — `data-api.binance.vision` may be geo-blocked from `iad1` (Vercel's US-East region) the same way `api.binance.com` was geo-blocked from London (commit `658f902`).
2. **Identical-BTC guard over-firing** — the 30-min guard added in `658f902` rejects insert when CoinGecko returns the same BTC price as the prior snapshot. If BTC truly traded flat across one window, the guard refuses forever after.
3. **API key revocation** — `COINGECKO_API_KEY` may be rotated/expired/over-quota.
4. **Wrong env in Vercel** — `SUPABASE_URL` in the Vercel project may point to a different Supabase project than the local `.env.local`. (Audit confirmed: local `.env.local` reads fresh BTC snapshots; production reads 4.7-day-old ones. Either two DBs exist, or one cron is writing to the wrong DB.)
5. **CoinGecko `token-image` route 404s** seen in production logs are unrelated to fetch-prices but indicate a parallel CoinGecko ID-mapping bug.

**Required fix:**
- Make `fetch-prices` robust to single-provider failure: try Binance.vision → CoinGecko Pro → CoinGecko free (with backoff), and **fail loud only if all three fail in one run**.
- Keep the identical-price guard but scope it: only refuse if the same price is seen across **3 consecutive** windows AND the provider's `last_updated_at` (where available) is also stale. A truly flat 15-min window must not freeze the pipeline forever.
- Emit a `fetch_prices_health` metric (latest_age_min, providers_succeeded, providers_failed) to a new `system_health` table and surface it on `/api/signals/accuracy` as a freshness banner.
- Audit `SUPABASE_URL` env consistency and document in README which env-var values must match across dev/prod.

---

## WHAT YOU MUST PRODUCE

### Phase 1 — Diagnosis (read-only, write nothing)

Read every file in the "WHAT EXISTS TODAY" list. Produce a single `SIGNAL_AUDIT_REPORT.md` containing:

1. **Pipeline data-flow diagram** (Mermaid) — every cron, every table, every read/write edge, with cron cadence labels.
2. **Defect ledger** — table with columns `id | severity (P0/P1/P2/P3) | file:line | description | reproduction | proposed fix | rollback plan`. Aim for completeness, not brevity. I expect 30+ rows.
3. **Look-ahead audit** — for every feature consumed by `signalEngine.ts`, prove (with file:line citations) that the value at `computed_at = T` uses only data with timestamp `< T`. Any feature that fails this test is a P0.
4. **Calibration audit** — read `calibrate-signals/route.js` and `token_signal_calibration` schema. Does the cron exclude outcomes with `correct = null`? Does it require minimum sample size before applying `sign_multiplier`? Does the 30d window slide correctly across daylight-saving boundaries (timestamps are TIMESTAMPTZ — verify)?
5. **Evaluation audit** — read `evaluate-signals/route.js`. Verify (a) `price_at_eval` uses the snapshot closest to `computed_at + horizon`, not just the next available; (b) noise floor is symmetric (currently 5% — confirm it doesn't bias one direction); (c) `correct = null` is set when `price_at_signal == price_at_eval` (the stale-price guard from commit `c551821`); (d) BTC benchmark is fetched from the same `price_snapshots` row, not from a live API call (which would introduce look-ahead).
6. **Engine arithmetic audit** — re-derive the composite score formula by hand from `computeUnifiedSignal`. Confirm the published weights (in code comments) match the actual arithmetic. Confirm tier sign multipliers from calibration are applied AFTER tier-internal normalization, not before.
7. **Tier 1 transform audit** — the 2026-04-30 rewrite added `classifyVenue`, `txConfidence`, `MIN_TX_CONFIDENCE`. Verify (a) `CEX_HINTS` and `DEX_HINTS` cover the actual label vocabulary the upstream classifier emits (sample 1000 rows from `all_whale_transactions` and report unmatched labels); (b) `confWeight = 0.3 + 1.0 * conf` doesn't underweight high-confidence signals; (c) the venue boost (1.5/1.0/0.85) isn't double-counted with the calibration sign multiplier.
8. **Static map removal verification** — confirm `TIER1_SIGN_BY_TOKEN` is fully gone and the engine defers entirely to `token_signal_calibration`. Find any remaining static fallback that could mask a calibration-cron failure.

### Phase 2 — Fix the P0 production block

Edit `app/api/cron/fetch-prices/route.js` (and any helper in `lib/binance/`, `lib/coingecko/`) to implement the multi-provider failover described above. Keep changes behind `FETCH_PRICES_FAILOVER=on`. Add a unit test in `scripts/test-fetch-prices.js` that mocks each provider's failure mode and asserts the cron writes a snapshot iff at least one provider succeeded.

Also fix the CoinGecko `token-image` 404 storm visible in production logs.

### Phase 3 — Backtest harness

Create `scripts/backtest.js` with this exact CLI:

```
node scripts/backtest.js --days <N> --label <alpha|raw> --horizon <1h|6h|24h|all> --mode <single|wf> [--tokens BTC,ETH,...] [--json]
```

Behaviour:
- Pulls `token_signals` and matching `price_snapshots` from Supabase for the window.
- Recomputes the unified signal **using the engine code from `app/lib/signalEngine.ts`** (import it; do not re-implement). This proves the engine is deterministic given inputs.
- Joins to `signal_outcomes` for ground truth.
- Reports per tier, per token, per horizon: count, mean signed return, hit rate, Spearman IC, IR (mean/stdev × √N), max drawdown of a tier-only portfolio that goes long on tier > 0 and short on tier < 0 with equal $ weights.
- Walk-forward mode (`--mode wf`) slices the window into ≥3 non-overlapping folds, fits weights on each in-sample fold, and reports out-of-sample metrics on the next fold. Final result is the average across folds.
- `--json` emits a JSON blob suitable for `/api/signals/accuracy` to consume.
- Output is **byte-identical** across runs given the same inputs.

Add `node scripts/backtest.js --days 30 --label alpha --mode wf` as an npm script `npm run backtest` and document in README.

### Phase 4 — Re-derive tier weights from the harness

Run the harness on 60 days of history (use the `.env.local` DB which has fresh data; production DB is broken until Phase 2). For each tier, compute IR. Solve for the tier weight vector `w = (w1,w2,w3,w4,w_deriv)` that maximises portfolio IR under constraints:
- All weights ∈ [0, 1].
- Sum to 1.
- No tier with negative out-of-sample IC at p < 0.10 may have weight > 0.10.
- Conservative-balanced prior: shrink solved weights toward `(0.30, 0.30, 0.10, 0.05, 0.25)` with a 30% shrinkage factor to avoid overfitting.

Write the resulting weights to `app/lib/signalEngine.ts` behind `SIGNAL_ENGINE_WEIGHTS_V9=on`. Old weights remain the default until the kill switch is flipped manually.

### Phase 5 — Wire harness into `/api/signals/accuracy`

Extend `/api/signals/accuracy` to additionally return:
- `backtest_30d_wf` block: same numbers `scripts/backtest.js --days 30 --mode wf` would print.
- `freshness` block: `{ price_snapshots_age_min, last_compute_at, last_evaluate_at, last_calibrate_at }`.
- `tier_health` block: per-tier IR, p-value, sample size, and a boolean `passes_kill_threshold` (IR > 0.5 OR sample < 200).

The page must still render quickly — cache the backtest result for 1 hour in `system_health`.

### Phase 6 — CI guardrails

Add `.github/workflows/backtest-gate.yml` that on every push to `main`:
- Runs `npm run backtest -- --days 30 --mode wf --json`.
- Parses the JSON.
- Fails the build if `composite IR < 0.30` OR `composite hit_rate < 0.52` OR any individual tier has IR < -0.20 with weight > 0.05.

The gate must be skippable by setting `SKIP_BACKTEST_GATE=true` in commit body, but every skip must be logged.

---

## ALGORITHMIC SPEC (engine math — be exact)

### Per-token Spearman IC
For token `t` over window `W`, let `s_i` be the signed engine score at time `i` and `r_i` be the realized alpha return `(token_return_i - btc_return_i)` over the chosen horizon. Then:
```
ρ_t = SpearmanCorr({s_i}, {r_i})    for i ∈ W ∩ token=t
IC = mean(ρ_t)  for t with sample ≥ 30
IC_se = stdev(ρ_t) / sqrt(num_tokens)
IC_t_stat = IC / IC_se
```
Report `IC ± 1.96 × IC_se` and the two-sided p-value from a t-distribution with `num_tokens - 1` dof.

### Information Ratio (IR)
For a tier-portfolio with daily PnL `pnl_d`:
```
IR = mean(pnl_d) / stdev(pnl_d) × sqrt(252)
```
Report bootstrap 95% CI from 1000 block-bootstrap resamples (block size = 5 days).

### Hit rate with noise floor
A signal is `correct` iff `sign(predicted) == sign(realized)` AND `abs(realized) >= NOISE_FLOOR_PCT` (currently 0.05). Otherwise `correct = null` and the row is excluded from accuracy. This is already implemented — verify and preserve.

### Walk-forward
For window `[T0, T1]`, slice into `K ≥ 3` equal-length folds. For fold `k`:
- In-sample: `[T0, T_{k-1}]`.
- Out-of-sample: `[T_{k-1}, T_k]`.
- Fit weights / calibration on in-sample; score out-of-sample; record metrics.
Final reported metric is the **mean across folds**, with stdev as the uncertainty bar.

### Tier composite
```
score = w1*sign1*tier1 + w2*sign2*tier2 + w3*sign3*tier3 + w4*sign4*tier4 + w_d*tierDeriv
```
where `signK` ∈ {-1, 0, +1} comes from `token_signal_calibration` for that token. If calibration row missing or `confidence_score < 20`, force the entire token's signal to NEUTRAL and log a `calibration_gate_skip` counter (not silently default to +1).

---

## STEP-BY-STEP IMPLEMENTATION ORDER

Do the work in this exact order. After each step, the app must still build and the existing dashboard must still render. After each phase, commit with a `quant-audit:` prefix.

1. **Phase 1 diagnosis** — produce `SIGNAL_AUDIT_REPORT.md`. Do not modify any code. Wait for human review of the defect ledger before proceeding.
2. **Phase 2 fetch-prices fix** — multi-provider failover behind `FETCH_PRICES_FAILOVER=on`. Local test via `scripts/test-fetch-prices.js`. Smoke test by manually invoking the cron in dev.
3. **Phase 2.1 token-image 404 fix** — separate small commit.
4. **Phase 3 backtest harness** — `scripts/backtest.js` reading from local DB. Verify byte-identical reruns.
5. **Phase 4 weight re-derivation** — solve weights, write behind `SIGNAL_ENGINE_WEIGHTS_V9=on`. Default OFF.
6. **Phase 5 accuracy API extension** — additive only. Existing response shape preserved.
7. **Phase 6 CI gate** — workflow file, documented bypass.
8. **Final readme update** — document all new env vars, the backtest CLI, and the kill switches.

---

## ACCEPTANCE CRITERIA

The engagement is done when **all** of the following are true:

- `SIGNAL_AUDIT_REPORT.md` exists, lists ≥30 defects with severity, file:line, reproduction, fix, rollback.
- Production `/api/cron/fetch-prices` writes a fresh BTC snapshot within 15 min of deploy. `/api/cron/compute-signals` returns 200 with a count of signals written. The 503 storm in Vercel logs ends.
- `node scripts/backtest.js --days 30 --label alpha --mode wf --json` runs on a fresh checkout with `.env.local` and emits a JSON blob in < 60 seconds.
- Two consecutive runs of the harness produce **byte-identical** JSON (`diff` returns empty).
- The `composite IR` reported by the harness on 60 days of history is **> 0.30** with a bootstrap 95% CI excluding 0.
- Every tier with weight > 0.10 has out-of-sample alpha-IC p-value < 0.10 over the same window.
- `/api/signals/accuracy?days=30` includes the `backtest_30d_wf`, `freshness`, and `tier_health` blocks; the `backtest_30d_wf.composite_ir` matches the harness output to 3 decimals.
- The CI gate fails when given a synthetic regression (verify by intentionally setting all tier weights to 0.0 and confirming the workflow rejects).
- No file under `components/`, `src/`, or `public/` reads `SUPABASE_SERVICE_ROLE_KEY`, `COINGECKO_API_KEY`, `BINANCE_*`, or `CRON_SECRET`. Verified by `grep -r`.
- All new tables (if any) have RLS enabled and are tested with a non-owner JWT (returns empty / 403).
- The existing `/api/signals` and `/api/signals/accuracy` response shapes are unchanged for fields that already existed; only additive fields are added.
- No public API ever returns a hardcoded accuracy %, a price target, or a directional confidence number presented as a forecast.
- `SIGNAL_ENGINE_WEIGHTS_V9` defaults to OFF in production. After 7 calendar days of post-merge production data showing harness IR ≥ 0.30 on a rolling 7-day window, a human flips it ON. The engine must work correctly with the flag both ON and OFF.

---

## OUT OF SCOPE FOR THIS ENGAGEMENT (do not build)

- New tier 5 / new alternative-data integrations.
- Any change to the upstream `whale-transactions` classifier — that is a separate repo.
- Any UI work beyond the `/api/signals/accuracy` JSON additions. The dashboard rendering of accuracy is a separate prompt.
- Per-user / per-watchlist personalization of signals (covered by `WALLET_PERSONALIZATION_PROMPT.md`).
- Telegram / push alert tuning.
- Replacing the cron scheduler. Vercel crons stay.
- Switching DBs. Supabase Postgres stays.
- ML model training (no PyTorch, no TF, no XGBoost). Linear weighting + calibration only. The harness is the discipline; the engine stays interpretable.

---

## DELIVERABLES (final message)

When you are done, output a single message containing:

1. A `git status`-style summary listing every new and modified file with line-count delta.
2. The full content of `SIGNAL_AUDIT_REPORT.md`.
3. The full content of the new SQL migration if any was needed (likely a small `system_health` table for freshness metrics).
4. Every new env var added, with a one-line description and whether it defaults ON or OFF.
5. The exact `npm run backtest` invocation and a paste of its output on 30 days of `.env.local` data.
6. A 12-line README addition under `## Signal Engine Backtesting` explaining how a developer reproduces the harness, flips the kill switches, and reads the CI gate.
7. A 10-step manual-QA script the founder can follow on a fresh terminal to verify the production fix and the backtest reproducibility.

Begin with **Phase 1 only**. Do not write code until the defect ledger has been produced and you have re-stated, in your own words, the three non-negotiable lessons from `/memories/repo/signal-engine.md`.

# Signal Research — 2026 Q3

> §4.F of `ORCA_COPILOT_BUILD_PROMPT.md`. This is a **research design doc**, not
> a release announcement. None of the candidate families described here is in
> the production pipeline. Promotion requires a human go/no-go decision after
> the backtest harness has been run against a clean window (`suspect = FALSE`
> only), with `n ≥ 200` and 24h win-rate `≥ 60%`.

## 1. Why

The May 11 quarantine showed the existing BUY composite has `+4.42% net at 24h`
with an `86%` win rate on clean data, but the sample is small and post-fix —
we do not yet know it generalises. Beyond that, the question Eduardo flagged
("I don't know how to make good signals") is real: today's signals fire often
and the edge per fire is ambiguous. The goal of this kit is to propose three
**narrow, well-defined** families with explicit predicates, run them
against clean historical outcomes, and produce a comparable per-family
report. We are **not** introducing new data sources in this phase.

## 2. Ground rules (do not violate)

1. **Suspect filter is mandatory.** Every backtest read filters
   `signal_outcomes.suspect = FALSE`. This is enforced both in the SQL view
   layer and in the Node harness.
2. **Define the test window before pulling numbers.** Default window: 90
   days ending `tested_at`. Override with `--since`.
3. **No cherry-picking.** A family either passes the gate at the declared
   window or it doesn't. If we want to test a different window we file a new
   row, we don't overwrite.
4. **Go/no-go bar:** `n_samples ≥ 200` AND `24h win_rate ≥ 0.60`. See
   `lib/signal-research/metrics.ts#meetsPromotionBar`.
5. **No production promotion in this kit.** Adding a family to
   `app/api/cron/compute-signals/` is a separate PR with a circuit-breaker
   entry per the existing `signal_circuit_breaker` pattern.
6. **No leakage.** Forward returns must come from `signal_outcomes` (or its
   benchmark-adjusted columns), never from `token_signals.price_*_later`
   on the same row that triggered the signal.

## 3. Candidate families

The exact predicates and thresholds live in `lib/signal-research/families.ts`
(pure functions, unit-tested). This section is the plain-English version.

### Family A — Whale-flow divergence

**Hypothesis.** When 24h net whale flow disagrees with the 24h price
direction, the price move tends to mean-revert.

**Predicate.**

$$\text{trigger} \iff
  \operatorname{sign}(\text{net\_flow}_{24h}) \neq \operatorname{sign}(\Delta p_{24h})
  \;\wedge\; |\text{net\_flow}_{24h}| > 500{,}000\,\text{USD}
  \;\wedge\; |\Delta p_{24h}| > 2\%$$

**Direction.** `-sign(Δp_{24h})` (fade the price move).

**Magnitude.** `|net_flow_24h| / 500_000` (a normalised z-ish score).

### Family B — Exchange-netflow imbalance (z-score)

**Hypothesis.** When `|net flow|` is several standard deviations above its
own trailing 30d mean, the move on/off exchanges is the dominant signal and
the directional consequence is the opposite of the flow (inflow → sell
pressure, outflow → accumulation).

**Predicate.**

$$z = \frac{|\text{net\_flow}_{24h}| - \mu_{30d}}{\sigma_{30d}},
  \qquad \text{trigger} \iff z \geq 2$$

**Direction.**
* `net_flow > 0` (net inflow to exchanges) → `'short'`
* `net_flow < 0` (net outflow from exchanges) → `'long'`

**Sign convention caveat.** The repo currently uses
`net_whale_flow_usd > 0 ⇒ inflow to exchanges`. The backtest harness verifies
this assumption by sampling a known event before running — if the convention
ever flips, the families file must be edited, not the data.

### Family C — Sentiment-vs-price compression (mean reversion)

**Hypothesis.** When sentiment is strongly positive while price is roughly
flat over the trailing 7 days, sentiment has "run ahead of" price — a
compression that historically resolves up. Mirror condition for downside.

**Predicate.**

$$\text{trigger} \iff
  |\text{sentiment\_composite}| \geq 0.5
  \;\wedge\; |\Delta p_{7d}| < 3\%$$

**Direction.** `sign(sentiment_composite)`.

**Magnitude.** `|sentiment_composite|`.

### Why not D and E (yet)

The §4.F prompt lists two more candidates:

* **D — News-cluster momentum.** Requires consistent factor tagging on
  `news_articles`. The current tagging is partially populated; we want
  ≥3 months of post-tagging-fix data before evaluating, otherwise this
  family will look weak for the wrong reason.
* **E — Whale-to-CEX velocity.** Requires a clean trailing-window
  derivative on per-exchange deposit flows. That data is available but the
  CEX-vs-DEX split is noisy on smaller tokens. We will pick this up after
  A / B / C produce results.

## 4. Schema additions

```sql
-- supabase/migrations/20260601_signal_research_results.sql
CREATE TABLE public.signal_research_results (
  id                    bigserial PRIMARY KEY,
  signal_name           text NOT NULL,
  window                text NOT NULL,  -- '24h' | '3d' | '7d'
  n_samples             integer NOT NULL,
  win_rate              numeric,
  avg_pct               numeric,
  sharpe_proxy          numeric,
  max_drawdown_proxy    numeric,
  params                jsonb DEFAULT '{}'::jsonb,
  notes                 text,
  clean_only            boolean NOT NULL DEFAULT true,
  tested_at             timestamptz NOT NULL DEFAULT now()
);
```

RLS enabled. No `anon` or `authenticated` policies — the table is read and
written by the service role only. End-user surfaces never query it.

## 5. Backtest harness

`scripts/backtest-signals.js` reads `signal_outcomes` (with the suspect
filter), feeds each row's `snapshot_inputs` JSON into
`evaluateAllFamilies(...)`, joins the firings to `return_24h / return_3d /
return_7d`, and calls `summarise(...)` per `(family, window)` bucket.

* **Reads:** `signal_outcomes` only (service role).
* **Writes:** `signal_research_results` only.
* **Never touches:** `token_signals`, `compute-signals`, or any
  production cron output.
* **Dry-run support:** `--dry-run` prints the summary and skips the insert.
* **Window override:** `--since YYYY-MM-DD`. Defaults to 90 days back.
* **Family / window scoping:** `--family` and `--window` for ad-hoc runs.

## 6. Sharpe-proxy and max-drawdown-proxy

We compute these on per-signal forward returns, not on a continuous P&L
curve. They are named with the `_proxy` suffix to make clear they are useful
for **comparing families against each other** at a fixed window, not for
quoting live trading performance. The cron pipeline can compute the
path-dependent variants later if any family is promoted.

## 7. What happens after the backtest runs

1. The kit writes rows to `signal_research_results`. Done.
2. A human (Eduardo) reads the table, family-by-family, window-by-window.
3. For any `(family, 24h)` row where `n_samples ≥ 200` and `win_rate ≥ 0.60`,
   a **separate** PR is opened to:
   * add the family to `app/api/cron/compute-signals/route.js`;
   * add a row to `signal_circuit_breaker` with conservative trip points;
   * mention the research row id in the PR description.
4. No family is ever promoted automatically. The whole point of this kit
   is to make the call explicit, not to skip it.

## 8. Out of scope for this PR

* Live promotion of any family.
* New data sources.
* UI for browsing `signal_research_results`. (If we ever need one, it's
  internal-only.)
* Backfill of `snapshot_inputs` on legacy `signal_outcomes` rows that
  predate the column. The harness silently skips rows where
  `snapshot_inputs IS NULL`.

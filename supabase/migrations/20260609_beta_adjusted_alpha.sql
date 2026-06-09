-- 2026-06-09 — Beta-adjusted (market-neutral) alpha labeling.
--
-- WHY. The engine's alpha label has been `price_change_pct − btc_change_pct`,
-- which implicitly assumes every token has market beta = 1.0 vs BTC. The
-- 2026-06-09 quant audit showed the engine's apparent directional edge is
-- almost entirely this beta confound: high-beta alts "beat" BTC for free on
-- the downside in a selloff. To measure SKILL we need the residual return
--
--     residual_alpha = token_return − beta_token · btc_return
--
-- This migration is PURELY ADDITIVE — it introduces new columns/table that
-- accrue going forward. Nothing reads them for live gating until the
-- corresponding feature flags (BREAKER_USE_ALPHA, CALIBRATION_USE_ALPHA) are
-- deliberately turned on. Existing alpha_pct/beat_benchmark are untouched, so
-- every current report keeps working and rollback is "ignore the new columns".

-- ─── Per-(token, horizon) market beta ────────────────────────────────────
-- Estimated nightly by calibrate-signals via OLS of token vs BTC window
-- returns (lib/quant/beta.ts:olsBeta), winsorized for robustness. evaluate-
-- signals reads this table to label each new outcome's residual alpha.
--
-- Beta is horizon-specific (a token's 1h co-movement with BTC differs from
-- its 24h), so the key is (token, eval_window). r_squared + n_samples are
-- carried as quality fields: a low-R² beta is weakly identified and the
-- consumer can choose to fall back to "no residual label".
create table if not exists token_beta (
  token         text        not null,
  eval_window   text        not null,
  beta          numeric     not null,
  n_samples     int         not null,
  r_squared     numeric,
  lookback_days int,
  computed_at   timestamptz not null default now(),
  primary key (token, eval_window)
);

create index if not exists token_beta_computed_idx
  on token_beta (computed_at desc);

-- ─── Residual-alpha columns on signal_outcomes ───────────────────────────
-- residual_alpha : token_return − beta·btc_return (percent). NULL when no
--                  beta is available yet (cold start) or the row was an
--                  outlier/frozen-feed skip.
-- beat_residual  : did the signal earn positive residual alpha in its claimed
--                  direction? The market-neutral analogue of beat_benchmark.
-- beta_at_eval   : the beta actually used, persisted for provenance so an
--                  audit can reproduce the label without re-deriving beta.
alter table signal_outcomes
  add column if not exists residual_alpha numeric,
  add column if not exists beat_residual  boolean,
  add column if not exists beta_at_eval   numeric;

-- Reporting index for residual-alpha-beat rate reads by window/time (mirrors
-- idx_signal_outcomes_alpha for the raw label).
create index if not exists idx_signal_outcomes_residual
  on signal_outcomes (eval_window, signal_time desc)
  where beat_residual is not null;

-- ─── Alpha telemetry echo on accuracy_baseline ───────────────────────────
-- The watchdog writes one baseline row every 6h. These columns echo the
-- by-direction alpha-beat rates (raw and residual) alongside the existing
-- headline accuracy, so the alpha series is queryable for trend analysis
-- BEFORE any breaker change is flipped on. Same observability-first pattern
-- as the time_valve heartbeat. NULL until the watchdog deploy populates them.
alter table accuracy_baseline
  add column if not exists alpha_buy_pct     numeric,
  add column if not exists alpha_sell_pct    numeric,
  add column if not exists ralpha_buy_pct    numeric,
  add column if not exists ralpha_sell_pct   numeric;

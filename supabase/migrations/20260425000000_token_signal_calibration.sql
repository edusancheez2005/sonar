-- Per-token signal calibration table.
--
-- Background. The signal engine (app/lib/signalEngine.ts) historically used a
-- HARD-CODED Map (TIER1_SIGN_BY_TOKEN) computed from a one-shot 30-day IC
-- audit on 2026-04-22. By 2026-04-25 (3 days later) the regime had shifted
-- and several tokens (SOL, DOGE, LINK, UNI, CRV, ONDO, SHIB) were firing
-- directionally inverted SELL signals. Per-token 1h SELL accuracy was 0%
-- on those tokens despite 70+ outcomes each. See audit:
--   POOLED SELL acc since 2026-04-22 (non-stale): 44.7% / 45.2% / 48.2%
--   per-token split was binary: half 100%, half 0%.
--
-- Fix. Replace the static map with a rolling table refreshed by
--   /api/cron/calibrate-signals (daily). Engine reads this table on each
--   compute-signals run and derives `tier1Sign` per token from RECENT
--   outcomes, not a one-time snapshot.
--
-- Columns:
--   token             — symbol (uppercase)
--   eval_window       — '1h' | '6h' | '24h' (one row per (token, window))
--   ic                — Pearson correlation of signal_score vs price_change_pct
--                       over the lookback window (NULL if n < 20).
--   hit_rate          — fraction of correctly-classified directional signals.
--   n_outcomes        — total non-null outcomes used.
--   n_directional     — non-NEUTRAL signals only.
--   mean_alpha        — mean alpha_pct (vs BTC benchmark) on directional rows.
--   sign_multiplier   — derived: -1 (invert), 0 (mute), +1 (keep), NULL (n<20)
--                       Mirrors the engine's TIER1_SIGN_BY_TOKEN convention.
--   confidence_score  — abs(IC) * sqrt(n)/10, clamped 0..100. Used by the
--                       engine to gate label emission (don't fire BUY/SELL on
--                       tokens whose own historical IC is statistically thin).
--   computed_at       — when this row was last refreshed.
--
-- Idempotent. Run repeatedly without touching anything else.

CREATE TABLE IF NOT EXISTS public.token_signal_calibration (
  token              text NOT NULL,
  eval_window        text NOT NULL CHECK (eval_window IN ('1h','6h','24h')),
  ic                 numeric(6,4),
  hit_rate           numeric(5,4),
  n_outcomes         integer NOT NULL DEFAULT 0,
  n_directional      integer NOT NULL DEFAULT 0,
  mean_alpha         numeric(8,4),
  mean_change        numeric(8,4),
  sign_multiplier    smallint CHECK (sign_multiplier IN (-1, 0, 1)),
  confidence_score   numeric(5,2) NOT NULL DEFAULT 0,
  computed_at        timestamptz NOT NULL DEFAULT now(),
  lookback_days      integer NOT NULL DEFAULT 30,
  PRIMARY KEY (token, eval_window)
);

-- Lookups by token (engine reads this for one token at a time).
CREATE INDEX IF NOT EXISTS idx_token_signal_calibration_token
  ON public.token_signal_calibration (token);

-- Lookups by recency (admin dashboards, audit queries).
CREATE INDEX IF NOT EXISTS idx_token_signal_calibration_computed_at
  ON public.token_signal_calibration (computed_at DESC);

COMMENT ON TABLE public.token_signal_calibration IS
  'Per-token rolling Information Coefficient + hit rate. Refreshed daily by /api/cron/calibrate-signals. Read by signal engine to derive Tier 1 sign multiplier and gate label emission.';
COMMENT ON COLUMN public.token_signal_calibration.sign_multiplier IS
  'Derived: -1 invert tier1, 0 mute tier1, +1 keep, NULL insufficient data (engine falls back to default +1).';
COMMENT ON COLUMN public.token_signal_calibration.confidence_score IS
  '|IC| * sqrt(n)/10, clamped 0..100. Engine requires >= 20 to emit BUY/SELL labels (else NEUTRAL).';

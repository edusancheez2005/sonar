-- Add benchmark / alpha columns to signal_outcomes so we can answer
-- "did the signal beat just-buying-BTC?" instead of only "did price move
-- the right direction?". Drops a dead/footgun index that referenced
-- never-populated look-ahead columns on token_signals.
--
-- Backfill plan: leave existing rows NULL; the eval cron will fill these
-- columns going forward. Reports treat NULL alpha as "unknown", not zero.

ALTER TABLE signal_outcomes
  ADD COLUMN IF NOT EXISTS btc_price_at_signal NUMERIC,
  ADD COLUMN IF NOT EXISTS btc_price_at_eval   NUMERIC,
  ADD COLUMN IF NOT EXISTS btc_change_pct      NUMERIC,
  ADD COLUMN IF NOT EXISTS alpha_pct           NUMERIC,
  ADD COLUMN IF NOT EXISTS beat_benchmark      BOOLEAN;

-- Drop the dead backtest index — it referenced look-ahead columns
-- (price_24h_later / price_3d_later / price_7d_later) that have never
-- been populated and would silently inject look-ahead bias if they were.
DROP INDEX IF EXISTS idx_token_signals_backtest;

-- Filtered index for the most common accuracy aggregations: scored
-- outcomes ordered by time, partitioned by window.
CREATE INDEX IF NOT EXISTS idx_signal_outcomes_time_window
  ON signal_outcomes(signal_time DESC, eval_window)
  WHERE correct IS NOT NULL;

-- Filtered index for benchmark/alpha reporting.
CREATE INDEX IF NOT EXISTS idx_signal_outcomes_alpha
  ON signal_outcomes(eval_window, signal_time DESC)
  WHERE alpha_pct IS NOT NULL;

-- ─── Look-ahead cleanup on token_signals ─────────────────────────────────
-- These columns were declared by the original 20260220_token_signals.sql
-- but never populated by any code path. Leaving them is a footgun: any
-- future contributor will be tempted to backfill them with historical
-- prices, which would silently inject look-ahead bias into model
-- retraining or the score computation if anyone joins back to them.
--
-- Outcome data lives in `signal_outcomes` (join-only-after-the-fact, so
-- look-ahead-safe by construction). That is the only correct home for it.
ALTER TABLE token_signals
  DROP COLUMN IF EXISTS price_24h_later,
  DROP COLUMN IF EXISTS price_3d_later,
  DROP COLUMN IF EXISTS price_7d_later,
  DROP COLUMN IF EXISTS return_24h,
  DROP COLUMN IF EXISTS return_3d,
  DROP COLUMN IF EXISTS return_7d;

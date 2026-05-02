-- 2026-05-02 — drop look-ahead-prone columns from token_signals
--
-- Per SIGNAL_AUDIT_REPORT.md SCHEMA-1 + memory note "look-ahead via
-- price_*_later columns retired 2026-04-20", the canonical evaluation path
-- has been signal_outcomes (forward-joined to price_snapshots) for over
-- a week. The original price_24h_later / price_3d_later / price_7d_later /
-- return_24h / return_3d / return_7d columns on token_signals are unused
-- by every reader in app/** (verified via grep on 2026-05-02) but remain
-- a footgun: any future cron that fills them by querying *current* price
-- silently re-introduces look-ahead bias into every backtest that joins
-- them. Drop them now while the surface area is still small.
--
-- The 20260420_signal_outcomes_benchmark.sql migration already dropped the
-- equivalent columns from `signal_outcomes`. This finishes the cleanup on
-- the sibling table.
--
-- The partial index `idx_token_signals_backtest` references
-- `price_7d_later` in its WHERE clause and must be dropped first.
-- Re-create it without the look-ahead predicate so existing backtest
-- queries that use (token, signal, computed_at) keep their index.

DROP INDEX IF EXISTS idx_token_signals_backtest;

ALTER TABLE token_signals
  DROP COLUMN IF EXISTS price_24h_later,
  DROP COLUMN IF EXISTS price_3d_later,
  DROP COLUMN IF EXISTS price_7d_later,
  DROP COLUMN IF EXISTS return_24h,
  DROP COLUMN IF EXISTS return_3d,
  DROP COLUMN IF EXISTS return_7d;

CREATE INDEX IF NOT EXISTS idx_token_signals_backtest
  ON token_signals(token, signal, computed_at)
  WHERE price_at_signal IS NOT NULL;

COMMENT ON TABLE token_signals IS
  'Unified Signal Engine outputs. Computed every 15min per active token. '
  'Forward returns are NOT stored here; join to signal_outcomes by signal_id '
  'for evaluated returns (avoids look-ahead bias).';

-- 2026-05-06: Quarantine signal_outcomes contaminated by the Next.js
-- fetch-cache freeze incident. fetch-prices was hitting Binance.vision
-- without `cache: 'no-store'`, so the framework cached the first response
-- and re-served it across hundreds of cron invocations. Result: BTC stuck
-- at $76876 for ~6h while live was $81440. signal_outcomes computed during
-- that window have:
--   * price_change_pct = 0 (token frozen) OR a real value but
--   * btc_change_pct = 0 (BTC benchmark frozen) → alpha is meaningless
--
-- This migration is FORWARD-ONLY: it adds a `suspect` column and flags
-- the contaminated rows. We do NOT delete or rewrite — the rows stay for
-- audit trail. All accuracy aggregations should filter `suspect = false`.

ALTER TABLE signal_outcomes
  ADD COLUMN IF NOT EXISTS suspect BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspect_reason TEXT;

-- Backfill: any row from May 6 with btc_change_pct = 0 was computed
-- against a frozen BTC snapshot. Token-level price_change_pct = 0 with
-- BTC = 0 is the same root cause and equally untrustworthy.
UPDATE signal_outcomes
SET suspect = TRUE,
    suspect_reason = 'frozen_feed_2026_05_06'
WHERE signal_time >= '2026-05-06T00:00:00Z'
  AND signal_time <  '2026-05-07T12:00:00Z'
  AND btc_change_pct = 0;

-- Index for filtering suspect rows out of accuracy aggregations.
CREATE INDEX IF NOT EXISTS signal_outcomes_suspect_idx
  ON signal_outcomes (suspect) WHERE suspect = FALSE;

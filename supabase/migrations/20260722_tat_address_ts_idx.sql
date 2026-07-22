-- Composite (address, timestamp DESC) index on tracked_address_transfers.
--
-- Why: ORCA's getWalletActivity transfer-feed fallback runs
--   WHERE address IN (...) ORDER BY timestamp DESC LIMIT 200
-- At 11M+ rows the planner sometimes walks tat_timestamp_idx and filters by
-- address — for an address with NO rows that scans the entire index and hits
-- the ~8s statement timeout (observed 2026-07-22 during the BSC backfill).
-- A composite btree makes that query a bounded seek in every case.
--
-- Run in the Supabase SQL editor. Plain CREATE INDEX (not CONCURRENTLY): the
-- editor wraps statements in a transaction, which CONCURRENTLY refuses
-- (error 25001, hit 2026-07-22). The build takes a write lock for its
-- duration (~tens of seconds at 11M rows) — harmless here, the only writer
-- is the hourly cron at :10 and a blocked run just retries next hour.

CREATE INDEX IF NOT EXISTS tat_address_ts_idx
  ON tracked_address_transfers (address, timestamp DESC);

-- Refresh planner stats after the July 22 bulk backfill (~122k rows/run
-- since the round-robin fix reaches previously-unpolled entities).
ANALYZE tracked_address_transfers;

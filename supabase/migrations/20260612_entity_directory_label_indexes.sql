-- Entity directory (/entities) performance indexes
--
-- The /entities page builds its directory by paging the most-recent
-- *labeled* whale transactions and aggregating them in memory:
--
--   SELECT from_label, to_label, usd_value, blockchain, timestamp
--   FROM all_whale_transactions
--   WHERE from_label IS NOT NULL OR to_label IS NOT NULL
--   ORDER BY timestamp DESC
--   OFFSET <page> LIMIT 1000           -- 12 windows fetched in parallel
--
-- all_whale_transactions is a VIEW that UNION ALLs the per-chain tables
-- (see 20260318_all_whale_transactions_view), and you cannot index a view,
-- so the index lives on each base table. Until now NO index matched this
-- predicate, so every window scanned and sorted an entire chain table —
-- the source of the slow /entities loads.
--
-- A PARTIAL index keyed on (timestamp DESC) whose predicate matches the
-- "labeled rows only" filter lets the planner pull each window straight
-- from the index in timestamp order (no sort, and it only walks labeled
-- rows). INCLUDE-ing the columns the page actually selects makes the scan
-- index-only, so it never touches the heap.
--
-- CONCURRENTLY avoids locking writes but CANNOT run inside a transaction
-- block — run this file with psql or the Supabase CLI, NOT the Dashboard
-- SQL Editor (which wraps statements in a transaction). For the Dashboard,
-- drop the word CONCURRENTLY from each statement (it will briefly lock each
-- table while building — run it during low traffic).

-- ── ethereum_transactions ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eth_tx_labeled_ts
  ON ethereum_transactions (timestamp DESC)
  INCLUDE (from_label, to_label, usd_value, blockchain)
  WHERE from_label IS NOT NULL OR to_label IS NOT NULL;

-- ── bitcoin_transactions ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_btc_tx_labeled_ts
  ON bitcoin_transactions (timestamp DESC)
  INCLUDE (from_label, to_label, usd_value, blockchain)
  WHERE from_label IS NOT NULL OR to_label IS NOT NULL;

-- ── solana_transactions ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sol_tx_labeled_ts
  ON solana_transactions (timestamp DESC)
  INCLUDE (from_label, to_label, usd_value, blockchain)
  WHERE from_label IS NOT NULL OR to_label IS NOT NULL;

-- ── polygon_transactions ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poly_tx_labeled_ts
  ON polygon_transactions (timestamp DESC)
  INCLUDE (from_label, to_label, usd_value, blockchain)
  WHERE from_label IS NOT NULL OR to_label IS NOT NULL;

-- ── xrp_transactions ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_xrp_tx_labeled_ts
  ON xrp_transactions (timestamp DESC)
  INCLUDE (from_label, to_label, usd_value, blockchain)
  WHERE from_label IS NOT NULL OR to_label IS NOT NULL;

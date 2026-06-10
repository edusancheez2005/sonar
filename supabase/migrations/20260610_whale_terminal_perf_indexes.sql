-- Whale Terminal performance indexes
--
-- The Research module's data routes were running multi-second queries
-- against all_whale_transactions, which is a VIEW that UNION ALLs the
-- per-chain transaction tables (see 20260318_all_whale_transactions_view).
-- You cannot index a view, so the indexes go on each base table; the
-- planner uses them when the view is queried.
--
-- Hot access patterns (all filter a wallet column + order/range timestamp):
--   1. signals     WHERE whale_address IN (...) AND classification IN ('BUY','SELL')
--                  ORDER BY timestamp DESC
--   2. candles     WHERE whale_address = $1 AND timestamp >= $2 ORDER BY timestamp
--                  (+ from_address/to_address counterparty fallback)
--   3. sparklines  WHERE whale_address IN (...) AND timestamp >= $2
--
-- A composite (<addr col>, timestamp DESC) index per base table serves all
-- three: the equality/IN seeks and timestamp is pre-ordered.
--
-- CONCURRENTLY avoids locking writes but CANNOT run inside a transaction
-- block — so run this file with psql or the Supabase CLI, NOT the Dashboard
-- SQL Editor (which wraps statements in a transaction). For the Dashboard,
-- drop the word CONCURRENTLY from each statement (it will briefly lock each
-- table while building — run it during low traffic).

-- ── ethereum_transactions ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eth_tx_whale_ts ON ethereum_transactions (whale_address, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eth_tx_from_ts  ON ethereum_transactions (from_address, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eth_tx_to_ts    ON ethereum_transactions (to_address, timestamp DESC);

-- ── bitcoin_transactions ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_btc_tx_whale_ts ON bitcoin_transactions (whale_address, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_btc_tx_from_ts  ON bitcoin_transactions (from_address, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_btc_tx_to_ts    ON bitcoin_transactions (to_address, timestamp DESC);

-- ── solana_transactions ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sol_tx_whale_ts ON solana_transactions (whale_address, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sol_tx_from_ts  ON solana_transactions (from_address, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sol_tx_to_ts    ON solana_transactions (to_address, timestamp DESC);

-- ── polygon_transactions ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poly_tx_whale_ts ON polygon_transactions (whale_address, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poly_tx_from_ts  ON polygon_transactions (from_address, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poly_tx_to_ts    ON polygon_transactions (to_address, timestamp DESC);

-- ── xrp_transactions ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_xrp_tx_whale_ts ON xrp_transactions (whale_address, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_xrp_tx_from_ts  ON xrp_transactions (from_address, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_xrp_tx_to_ts    ON xrp_transactions (to_address, timestamp DESC);

-- ── leaderboard + label lookups (real tables) ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_profiles_active_score
  ON wallet_profiles (smart_money_score DESC)
  WHERE tx_count_30d >= 10;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_addresses_address
  ON addresses (address);

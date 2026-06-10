-- Whale Terminal performance indexes
--
-- The Research module's data routes were running multi-second queries
-- against all_whale_transactions (≈ tens of millions of rows). The three
-- hot access patterns and the index each needs:
--
--   1. signals      WHERE whale_address IN (...) AND classification IN ('BUY','SELL')
--                   ORDER BY timestamp DESC
--   2. candles      WHERE whale_address = $1 AND timestamp >= $2 ORDER BY timestamp
--   3. sparklines   WHERE whale_address IN (...) AND timestamp >= $2
--
-- A composite (whale_address, timestamp DESC) index serves all three: the
-- equality/IN on whale_address seeks, and timestamp is already ordered so
-- the sort and range filter are free.
--
-- CONCURRENTLY avoids locking writes during creation. Must run outside a
-- transaction block (psql: run this file directly, not wrapped in BEGIN).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_awt_whale_ts
  ON all_whale_transactions (whale_address, timestamp DESC);

-- Counterparty fallback used by the candles route (wallets that only show
-- up as from_address/to_address rather than the indexed whale_address).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_awt_from_ts
  ON all_whale_transactions (from_address, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_awt_to_ts
  ON all_whale_transactions (to_address, timestamp DESC);

-- Leaderboard: wallet_profiles filtered by tx_count_30d and sorted by one
-- of a few score columns. A partial index on the qualifying rows keeps it
-- small (most profiles fall below the 10-tx threshold).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_profiles_active_score
  ON wallet_profiles (smart_money_score DESC)
  WHERE tx_count_30d >= 10;

-- Entity-label lookups (addresses.entity_name) used to enrich both the
-- leaderboard and signals.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_addresses_address
  ON addresses (address);

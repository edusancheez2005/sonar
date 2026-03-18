-- Migration: Replace `all_whale_transactions` table with a view
-- that unions all per-chain transaction tables.
--
-- This fixes the data gap: the whale-transaction-monitor writes to
-- per-chain tables (ethereum_transactions, bitcoin_transactions, etc.)
-- but the UI dashboard reads from all_whale_transactions.
--
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query).

-- Step 1: Drop the empty table (if it exists as a table)
DROP TABLE IF EXISTS all_whale_transactions CASCADE;

-- Step 2: Create a view that unions all per-chain tables
CREATE OR REPLACE VIEW all_whale_transactions AS
  SELECT * FROM ethereum_transactions
  UNION ALL
  SELECT * FROM bitcoin_transactions
  UNION ALL
  SELECT * FROM solana_transactions
  UNION ALL
  SELECT * FROM polygon_transactions
  UNION ALL
  SELECT * FROM xrp_transactions;

-- Step 3: Grant access to the service role and anon role
GRANT SELECT ON all_whale_transactions TO authenticated;
GRANT SELECT ON all_whale_transactions TO anon;
GRANT SELECT ON all_whale_transactions TO service_role;

-- Step 4: Create an index-friendly comment (views use underlying table indexes)
COMMENT ON VIEW all_whale_transactions IS 'Unified view across all per-chain whale transaction tables. Used by the dashboard, ORCA, and all whale API endpoints.';

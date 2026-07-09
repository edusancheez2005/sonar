-- ============================================================================
-- Exact aggregates for ORCA's data tools (companion to 20260709_exact_aggregates).
-- ORCA's getWhaleFlows / getMostActiveWallets / getWalletActivity previously
-- summed at most 1,000 rows in JS (PostgREST cap), so the AI copilot could quote
-- truncated whale numbers that disagreed with the wallet page and leaderboard.
-- These functions aggregate server-side. All columns are qualified via a table
-- alias so the `timestamp` column never collides with the SQL keyword.
-- ============================================================================

-- ── Single-ticker whale flow over a window ─────────────────────────────────
-- Powers getWhaleFlows. No stablecoin exclusion here on purpose: the user asked
-- about a specific ticker, so if they ask about USDC we answer about USDC.
CREATE OR REPLACE FUNCTION public.ticker_flow_agg(p_symbol text, p_since timestamptz)
RETURNS TABLE (
  buy_usd numeric,
  sell_usd numeric,
  net_usd numeric,
  buy_count bigint,
  sell_count bigint,
  unique_whales bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0) AS buy_usd,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0) AS sell_usd,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0)
      - COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0) AS net_usd,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'BUY') AS buy_count,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'SELL') AS sell_count,
    COUNT(DISTINCT t.whale_address) FILTER (WHERE upper(t.classification) IN ('BUY', 'SELL')) AS unique_whales
  FROM all_whale_transactions t
  WHERE t.token_symbol = p_symbol
    AND t.timestamp >= p_since
    AND upper(t.classification) IN ('BUY', 'SELL');
$$;

-- ── Market-wide most-active wallets, ranked by transaction count ────────────
-- Powers getMostActiveWallets ("which wallet has the most transactions today?").
-- Preserves the tool's existing semantics: ALL classifications count toward
-- tx_count, no CEX/stablecoin exclusion, ranked by tx_count then total volume.
-- buy/sell split matches the JS (buy* / accum* = buy, sell* / distrib* = sell).
CREATE OR REPLACE FUNCTION public.most_active_wallets(p_since timestamptz, p_limit integer DEFAULT 25)
RETURNS TABLE (
  whale_address text,
  tx_count bigint,
  total_usd numeric,
  buy_usd numeric,
  sell_usd numeric,
  net_usd numeric,
  tokens text[]
)
LANGUAGE sql STABLE
AS $$
  SELECT
    t.whale_address,
    COUNT(*) AS tx_count,
    COALESCE(SUM(t.usd_value), 0) AS total_usd,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) LIKE 'BUY%' OR upper(t.classification) LIKE 'ACCUM%'), 0) AS buy_usd,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) LIKE 'SELL%' OR upper(t.classification) LIKE 'DISTRIB%'), 0) AS sell_usd,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) LIKE 'BUY%' OR upper(t.classification) LIKE 'ACCUM%'), 0)
      - COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) LIKE 'SELL%' OR upper(t.classification) LIKE 'DISTRIB%'), 0) AS net_usd,
    (array_agg(DISTINCT t.token_symbol) FILTER (WHERE t.token_symbol IS NOT NULL))[1:8] AS tokens
  FROM all_whale_transactions t
  WHERE t.timestamp >= p_since
    AND t.whale_address IS NOT NULL
  GROUP BY t.whale_address
  ORDER BY COUNT(*) DESC, SUM(t.usd_value) DESC
  LIMIT p_limit;
$$;

-- ============================================================================
-- Exact aggregates for the wallet-page detail tables (Token Holdings + Top
-- Counterparties). Companion to 20260709_exact_aggregates / _orca_aggregates.
-- Both routes summed at most 1,000 rows in JS (PostgREST cap), so for active
-- wallets the per-token and per-counterparty numbers undercounted. These
-- aggregate the full history server-side. All columns qualified via alias `t`.
-- ============================================================================

-- ── Per-token buy/sell volume + counts for one wallet (all-time) ───────────
-- Powers the "Token Holdings" table. No stablecoin exclusion (this is a
-- per-token breakdown of what the wallet actually traded, not a flow headline).
CREATE OR REPLACE FUNCTION public.wallet_token_holdings_agg(p_address text)
RETURNS TABLE (
  symbol text,
  chain text,
  buy_volume numeric,
  sell_volume numeric,
  buy_count bigint,
  sell_count bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    t.token_symbol AS symbol,
    (array_agg(t.blockchain))[1] AS chain,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0) AS buy_volume,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0) AS sell_volume,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'BUY') AS buy_count,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'SELL') AS sell_count
  FROM all_whale_transactions t
  WHERE t.whale_address = p_address
    AND t.token_symbol IS NOT NULL
    AND upper(t.classification) IN ('BUY', 'SELL')
  GROUP BY t.token_symbol
  ORDER BY SUM(t.usd_value) DESC
  LIMIT 200;
$$;

-- ── Per-counterparty volume + direction for one wallet (all-time) ──────────
-- Powers the "Top Counterparties" table. Counterparty = the side of the tx
-- that isn't this wallet; inflow = wallet received, outflow = wallet sent.
CREATE OR REPLACE FUNCTION public.wallet_counterparties_agg(p_address text, p_limit integer DEFAULT 20)
RETURNS TABLE (
  counterparty text,
  tx_count bigint,
  total_volume numeric,
  inflow numeric,
  outflow numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    CASE WHEN t.from_address = p_address THEN t.to_address ELSE t.from_address END AS counterparty,
    COUNT(*) AS tx_count,
    COALESCE(SUM(t.usd_value), 0) AS total_volume,
    COALESCE(SUM(t.usd_value) FILTER (WHERE t.from_address <> p_address), 0) AS inflow,
    COALESCE(SUM(t.usd_value) FILTER (WHERE t.from_address = p_address), 0) AS outflow
  FROM all_whale_transactions t
  WHERE t.whale_address = p_address
    AND (CASE WHEN t.from_address = p_address THEN t.to_address ELSE t.from_address END) IS NOT NULL
    AND (CASE WHEN t.from_address = p_address THEN t.to_address ELSE t.from_address END) <> p_address
  GROUP BY 1
  ORDER BY SUM(t.usd_value) DESC
  LIMIT p_limit;
$$;

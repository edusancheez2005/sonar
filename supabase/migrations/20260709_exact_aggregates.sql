-- ============================================================================
-- Exact server-side aggregates.
-- Root cause fix for the data-quality audit (2026-07-09): PostgREST caps every
-- row-fetch at 1,000 rows, so ALL stats computed by "fetch rows, sum in JS"
-- (leaderboard, wallet 30d stats, cron, candles, dashboard summary) were
-- silently built from at most 1,000 arbitrary rows. These functions aggregate
-- in the database, so the numbers are exact regardless of row counts.
--
-- Canonical trading-stat definition used everywhere:
--   * classifications BUY / SELL only (case-insensitive)
--   * stablecoins excluded
--
-- All queries alias their table (t / w) and fully qualify columns so the
-- `timestamp` column never collides with the SQL keyword.
-- ============================================================================

-- Single source of truth for the stablecoin filter.
CREATE OR REPLACE FUNCTION public.is_stablecoin(p_symbol text)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
  SELECT upper(coalesce(p_symbol, '')) IN (
    'USDT','USDC','DAI','BUSD','TUSD','USDP','GUSD','USDD','FRAX','LUSD',
    'USDK','USDN','FEI','TRIBE','CUSD'
  );
$$;

-- ── Whale leaderboard: per-wallet aggregates over a window ─────────────────
CREATE OR REPLACE FUNCTION public.whale_leaderboard_agg(p_since timestamptz)
RETURNS TABLE (
  whale_address text,
  buys bigint,
  sells bigint,
  buy_volume numeric,
  sell_volume numeric,
  total_volume numeric,
  net_usd numeric,
  trade_count bigint,
  token_count bigint,
  tokens text[],
  whale_score numeric,
  last_seen timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    t.whale_address,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'BUY') AS buys,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'SELL') AS sells,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0) AS buy_volume,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0) AS sell_volume,
    COALESCE(SUM(t.usd_value), 0) AS total_volume,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0)
      - COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0) AS net_usd,
    COUNT(*) AS trade_count,
    COUNT(DISTINCT t.token_symbol) AS token_count,
    (array_agg(DISTINCT t.token_symbol) FILTER (WHERE t.token_symbol IS NOT NULL))[1:12] AS tokens,
    MAX(t.whale_score) AS whale_score,
    MAX(t.timestamp) AS last_seen
  FROM all_whale_transactions t
  WHERE t.timestamp >= p_since
    AND t.whale_address IS NOT NULL
    AND upper(t.classification) IN ('BUY', 'SELL')
    AND NOT public.is_stablecoin(t.token_symbol)
    AND NOT EXISTS (
      SELECT 1 FROM addresses a
      WHERE lower(a.address) = lower(t.whale_address)
        AND a.address_type IN ('CEX Wallet', 'exchange', 'Exchange Wallet', 'CEX')
    )
  GROUP BY t.whale_address
  HAVING COUNT(*) >= 2
  ORDER BY SUM(t.usd_value) DESC
  LIMIT 200;
$$;

-- ── Token leaderboard: per-token aggregates over a window ──────────────────
CREATE OR REPLACE FUNCTION public.token_flow_agg(p_since timestamptz)
RETURNS TABLE (
  token_symbol text,
  buys bigint,
  sells bigint,
  buy_volume numeric,
  sell_volume numeric,
  total_volume numeric,
  net_usd numeric,
  unique_whales bigint,
  last_seen timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    t.token_symbol,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'BUY') AS buys,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'SELL') AS sells,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0) AS buy_volume,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0) AS sell_volume,
    COALESCE(SUM(t.usd_value), 0) AS total_volume,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0)
      - COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0) AS net_usd,
    COUNT(DISTINCT t.whale_address) AS unique_whales,
    MAX(t.timestamp) AS last_seen
  FROM all_whale_transactions t
  WHERE t.timestamp >= p_since
    AND t.token_symbol IS NOT NULL
    AND upper(t.classification) IN ('BUY', 'SELL')
    AND NOT public.is_stablecoin(t.token_symbol)
  GROUP BY t.token_symbol
  ORDER BY ABS(
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0)
    - COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0)
  ) DESC
  LIMIT 300;
$$;

-- ── Per-wallet trading stats for one window ─────────────────────────────────
-- Used by the wallet page (24h + 30d) and the refresh cron. Same canonical
-- filter as the leaderboard, so the wallet page 24h Net Flow MATCHES the
-- leaderboard row exactly.
CREATE OR REPLACE FUNCTION public.wallet_tx_stats(p_address text, p_since timestamptz)
RETURNS TABLE (
  tx_count bigint,
  buys bigint,
  sells bigint,
  buy_volume numeric,
  sell_volume numeric,
  total_volume numeric,
  net_usd numeric,
  last_active timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) AS tx_count,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'BUY') AS buys,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'SELL') AS sells,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0) AS buy_volume,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0) AS sell_volume,
    COALESCE(SUM(t.usd_value), 0) AS total_volume,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0)
      - COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0) AS net_usd,
    MAX(t.timestamp) AS last_active
  FROM all_whale_transactions t
  WHERE t.whale_address = p_address
    AND t.timestamp >= p_since
    AND upper(t.classification) IN ('BUY', 'SELL')
    AND NOT public.is_stablecoin(t.token_symbol);
$$;

-- ── Per-wallet per-token flows (for portfolio estimates + top tokens) ──────
CREATE OR REPLACE FUNCTION public.wallet_token_flows(p_address text, p_since timestamptz)
RETURNS TABLE (
  token_symbol text,
  buy_usd numeric,
  sell_usd numeric,
  total_usd numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    t.token_symbol,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0) AS buy_usd,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0) AS sell_usd,
    COALESCE(SUM(t.usd_value), 0) AS total_usd
  FROM all_whale_transactions t
  WHERE t.whale_address = p_address
    AND t.timestamp >= p_since
    AND t.token_symbol IS NOT NULL
    AND upper(t.classification) IN ('BUY', 'SELL')
  GROUP BY t.token_symbol
  ORDER BY SUM(t.usd_value) DESC
  LIMIT 100;
$$;

-- ── Per-wallet net token holdings from whale_alerts (qty-based) ─────────────
CREATE OR REPLACE FUNCTION public.wallet_alert_holdings(p_address text)
RETURNS TABLE (
  symbol text,
  net_qty numeric,
  net_usd numeric,
  gross_usd numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    w.symbol,
    SUM(CASE WHEN w.to_address = p_address THEN coalesce(w.amount, 0) ELSE -coalesce(w.amount, 0) END) AS net_qty,
    SUM(CASE WHEN w.to_address = p_address THEN coalesce(w.amount_usd, 0) ELSE -coalesce(w.amount_usd, 0) END) AS net_usd,
    SUM(ABS(coalesce(w.amount_usd, 0))) AS gross_usd
  FROM whale_alerts w
  WHERE (w.from_address = p_address OR w.to_address = p_address)
    AND w.symbol IS NOT NULL
  GROUP BY w.symbol
  LIMIT 200;
$$;

-- ── Per-wallet daily net flow (for the research-terminal chart) ─────────────
-- Uses the SAME classification-based sign convention as the leaderboard
-- (previously the chart used transfer direction, which disagreed).
CREATE OR REPLACE FUNCTION public.wallet_daily_flows(p_address text, p_since timestamptz)
RETURNS TABLE (
  day date,
  net_usd numeric,
  volume numeric,
  tx_count bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    (t.timestamp AT TIME ZONE 'UTC')::date AS day,
    COALESCE(SUM(CASE
      WHEN upper(t.classification) = 'BUY' THEN t.usd_value
      WHEN upper(t.classification) = 'SELL' THEN -t.usd_value
      ELSE 0 END), 0) AS net_usd,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) IN ('BUY', 'SELL')), 0) AS volume,
    COUNT(*) FILTER (WHERE upper(t.classification) IN ('BUY', 'SELL')) AS tx_count
  FROM all_whale_transactions t
  WHERE t.whale_address = p_address
    AND t.timestamp >= p_since
  GROUP BY (t.timestamp AT TIME ZONE 'UTC')::date
  ORDER BY (t.timestamp AT TIME ZONE 'UTC')::date;
$$;

-- ── Whole-tape summary for the dashboard (exact counts/volumes) ─────────────
CREATE OR REPLACE FUNCTION public.tape_overall(p_since timestamptz)
RETURNS TABLE (
  total_count bigint,
  buy_count bigint,
  sell_count bigint,
  buy_volume numeric,
  sell_volume numeric,
  total_volume numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'BUY') AS buy_count,
    COUNT(*) FILTER (WHERE upper(t.classification) = 'SELL') AS sell_count,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0) AS buy_volume,
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0) AS sell_volume,
    COALESCE(SUM(t.usd_value), 0) AS total_volume
  FROM all_whale_transactions t
  WHERE t.timestamp >= p_since
    AND upper(t.classification) IN ('BUY', 'SELL')
    AND NOT public.is_stablecoin(t.token_symbol);
$$;

-- ── Hourly tape series for the dashboard time-series chart ──────────────────
CREATE OR REPLACE FUNCTION public.tape_hourly(p_since timestamptz)
RETURNS TABLE (
  hour timestamptz,
  volume numeric,
  tx_count bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    date_trunc('hour', t.timestamp) AS hour,
    COALESCE(SUM(t.usd_value), 0) AS volume,
    COUNT(*) AS tx_count
  FROM all_whale_transactions t
  WHERE t.timestamp >= p_since
    AND upper(t.classification) IN ('BUY', 'SELL')
    AND NOT public.is_stablecoin(t.token_symbol)
  GROUP BY date_trunc('hour', t.timestamp)
  ORDER BY date_trunc('hour', t.timestamp);
$$;

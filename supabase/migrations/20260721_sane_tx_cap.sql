-- ============================================================================
-- Protocol-scale sanity cap for tape aggregates (2026-07-21 whale-wallet audit).
--
-- The ingestion classifier labels vault/bridge traffic as whale BUYs — e.g.
-- the vanity contract 0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb receives
-- ~$308M of WBTC hourly and topped the whale leaderboard with $3.7B of fake
-- daily "buys". ORCA's tools already exclude single transfers > $150M
-- (MAX_SANE_TX_USD in lib/orca/orchestrator/tools/getWhaleFlows.ts); this
-- migration applies the same cap to every classification-based aggregate so
-- the leaderboards, wallet stats, and dashboard tape all agree with ORCA.
--
-- JS mirrors of this cap (applied until this migration runs, and for the
-- legacy fallback paths): app/lib/leaderboardData.js,
-- app/api/whales/top-7day/route.js.
-- ============================================================================

-- Single source of truth. A single whale trade above $150M does not exist on
-- the real tape; anything bigger is protocol infrastructure.
-- Param is double precision because all_whale_transactions.usd_value is
-- float8 and Postgres won't implicitly cast float8 -> numeric during function
-- resolution (numeric args DO coerce to float8, so one overload suffices).
DROP FUNCTION IF EXISTS public.is_sane_whale_tx(numeric);
CREATE OR REPLACE FUNCTION public.is_sane_whale_tx(p_usd double precision)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
  SELECT coalesce(p_usd, 0) <= 150000000;
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
    AND public.is_sane_whale_tx(t.usd_value)
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
    AND public.is_sane_whale_tx(t.usd_value)
  GROUP BY t.token_symbol
  ORDER BY ABS(
    COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'BUY'), 0)
    - COALESCE(SUM(t.usd_value) FILTER (WHERE upper(t.classification) = 'SELL'), 0)
  ) DESC
  LIMIT 300;
$$;

-- ── Per-wallet trading stats for one window ─────────────────────────────────
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
    AND NOT public.is_stablecoin(t.token_symbol)
    AND public.is_sane_whale_tx(t.usd_value);
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
    AND public.is_sane_whale_tx(t.usd_value)
  GROUP BY t.token_symbol
  ORDER BY SUM(t.usd_value) DESC
  LIMIT 100;
$$;

-- ── Per-wallet daily net flow (for the research-terminal chart) ─────────────
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
    AND public.is_sane_whale_tx(t.usd_value)
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
    AND NOT public.is_stablecoin(t.token_symbol)
    AND public.is_sane_whale_tx(t.usd_value);
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
    AND public.is_sane_whale_tx(t.usd_value)
  GROUP BY date_trunc('hour', t.timestamp)
  ORDER BY date_trunc('hour', t.timestamp);
$$;

-- ── Per-token buy/sell volume + counts for one wallet (all-time) ───────────
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
    AND public.is_sane_whale_tx(t.usd_value)
  GROUP BY t.token_symbol
  ORDER BY SUM(t.usd_value) DESC
  LIMIT 200;
$$;

-- Polymarket data tables + category RPC
--
-- NOTE (June 2026): in production these four tables ALREADY EXIST and are kept
-- fresh by an external sync (markets/whales/holders update every few minutes).
-- So every CREATE TABLE below is `IF NOT EXISTS` and acts only as a fresh-DB
-- safety net / schema reference — on prod they were no-ops. The parts of this
-- migration that actually applied to prod are the missing read-supporting
-- indexes and the polymarket_category_counts() RPC. app/api/cron/polymarket
-- tops up ONLY polymarket_activity (the one table the external sync left
-- stale); it never writes the other three.
--
-- The column definitions mirror the live schema (verified against prod rows):
-- polymarket_activity in particular is append-style — duplicate tx_hash across
-- fills, nullable outcome_index, lowercase side, an updated_at column, and no
-- enforced uniqueness (dedupe happens in the cron).
--
-- Column sets mirror EXACTLY what the read routes select:
--   app/api/polymarket/markets   -> polymarket_markets
--   app/api/polymarket/whales    -> polymarket_whales
--   app/api/polymarket/holders   -> polymarket_market_holders
--   app/api/polymarket/activity  -> polymarket_activity
--   app/api/polymarket/categories-> polymarket_category_counts() RPC

-- ── polymarket_markets ───────────────────────────────────────────────
-- One row per market, keyed by on-chain condition_id. whale_flow / whale_count
-- are derived by the cron from the top-holder snapshot (net YES-vs-NO holder
-- USD, and the distinct tracked-whale count, respectively).
CREATE TABLE IF NOT EXISTS polymarket_markets (
  condition_id          TEXT PRIMARY KEY,
  question              TEXT,
  slug                  TEXT,
  category              TEXT,
  tags                  JSONB,
  competitive           NUMERIC,
  outcomes              JSONB,
  outcome_prices        JSONB,
  volume_24h            NUMERIC,
  liquidity             NUMERIC,
  whale_flow            NUMERIC,
  whale_count           INTEGER DEFAULT 0,
  one_day_price_change  NUMERIC,
  end_date              TIMESTAMPTZ,
  image                 TEXT,
  clob_token_ids        JSONB,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_markets_volume24h   ON polymarket_markets (volume_24h DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pm_markets_whale_flow  ON polymarket_markets (whale_flow DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pm_markets_competitive ON polymarket_markets (competitive DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pm_markets_category    ON polymarket_markets (category);

-- ── polymarket_whales ────────────────────────────────────────────────
-- Per-wallet leaderboard aggregated from holdings across all ingested
-- markets. arkham_entity is the locally-resolved real name (from
-- tracked_address_universe — zero live Arkham calls).
CREATE TABLE IF NOT EXISTS polymarket_whales (
  proxy_wallet   TEXT PRIMARY KEY,
  name           TEXT,
  arkham_entity  TEXT,
  profile_image  TEXT,
  total_amount   NUMERIC,
  markets_count  INTEGER DEFAULT 0,
  positions      JSONB,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_whales_total_amount ON polymarket_whales (total_amount DESC NULLS LAST);

-- ── polymarket_market_holders ────────────────────────────────────────
-- Top holders per (market, outcome). amount is the position size; the read
-- route enriches question/slug/outcomes from polymarket_markets on demand.
CREATE TABLE IF NOT EXISTS polymarket_market_holders (
  condition_id   TEXT NOT NULL,
  proxy_wallet   TEXT NOT NULL,
  outcome_index  INTEGER NOT NULL DEFAULT 0,
  name           TEXT,
  arkham_entity  TEXT,
  amount         NUMERIC,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (condition_id, proxy_wallet, outcome_index)
);

CREATE INDEX IF NOT EXISTS idx_pm_holders_wallet    ON polymarket_market_holders (proxy_wallet, amount DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pm_holders_condition ON polymarket_market_holders (condition_id, amount DESC NULLS LAST);

-- ── polymarket_activity ──────────────────────────────────────────────
-- Recent large trades (the "tape"). One row per fill; entity_name is the
-- locally-resolved Arkham entity, name the Polymarket profile name/pseudonym.
-- Append-style to match prod: tx_hash repeats across fills, outcome_index is
-- nullable, and there's no enforced unique key — app/api/cron/polymarket
-- dedupes by natural key before inserting.
CREATE TABLE IF NOT EXISTS polymarket_activity (
  tx_hash        TEXT NOT NULL,
  condition_id   TEXT NOT NULL,
  proxy_wallet   TEXT NOT NULL,
  outcome_index  INTEGER,
  entity_name    TEXT,
  name           TEXT,
  side           TEXT,
  outcome        TEXT,
  usd_value      NUMERIC,
  price          NUMERIC,
  size           NUMERIC,
  ts             TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_activity_ts        ON polymarket_activity (ts DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pm_activity_condition ON polymarket_activity (condition_id, ts DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pm_activity_usd       ON polymarket_activity (usd_value DESC NULLS LAST);

-- ── polymarket_category_counts() ─────────────────────────────────────
-- Powers the category filter without scanning every market row into Node
-- (see app/api/polymarket/categories). GROUP BY in Postgres, returns
-- (category, n) ordered by count desc.
CREATE OR REPLACE FUNCTION polymarket_category_counts()
RETURNS TABLE (category TEXT, n BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT category, COUNT(*)::BIGINT AS n
  FROM polymarket_markets
  WHERE category IS NOT NULL AND category <> ''
  GROUP BY category
  ORDER BY n DESC;
$$;

-- ── grants ───────────────────────────────────────────────────────────
-- Read routes use the service role, but grant SELECT to anon/authenticated
-- for parity with the rest of the public whale data.
GRANT SELECT ON polymarket_markets        TO anon, authenticated, service_role;
GRANT SELECT ON polymarket_whales         TO anon, authenticated, service_role;
GRANT SELECT ON polymarket_market_holders TO anon, authenticated, service_role;
GRANT SELECT ON polymarket_activity       TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION polymarket_category_counts() TO anon, authenticated, service_role;

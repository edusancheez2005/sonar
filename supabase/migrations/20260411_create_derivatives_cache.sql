-- Derivatives cache: stores Binance Futures data fetched by cron
-- Updated every 5 minutes by /api/cron/cache-derivatives
-- Read by /api/dashboard/smart-money

CREATE TABLE IF NOT EXISTS derivatives_cache (
  token TEXT PRIMARY KEY,
  smart_long NUMERIC,
  smart_short NUMERIC,
  retail_long NUMERIC,
  retail_short NUMERIC,
  funding_rate NUMERIC,
  taker_ratio NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

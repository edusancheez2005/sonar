-- arkham_call_log + arkham_quota_month view.
-- Every Arkham fetch logs a row here (including cache hits with cost=0, cache_hit=true).
-- The view is the single source of truth for the quota guard.

CREATE TABLE IF NOT EXISTS arkham_call_log (
  id BIGSERIAL PRIMARY KEY,
  endpoint   TEXT NOT NULL,
  method     TEXT NOT NULL DEFAULT 'GET',
  called_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  cost       INT NOT NULL DEFAULT 1,
  status     INT,
  ms         INT,
  cache_hit  BOOLEAN NOT NULL DEFAULT false,
  source     TEXT,                              -- 'cron','on_demand','orca','backfill','health'
  reason     TEXT
);
CREATE INDEX IF NOT EXISTS arkham_call_log_called_at_idx ON arkham_call_log (called_at DESC);
CREATE INDEX IF NOT EXISTS arkham_call_log_endpoint_idx  ON arkham_call_log (endpoint, called_at DESC);

-- View: month-to-date credit usage and projection.
-- Hard ceiling = 10000 (Starter), guard at 9500.
CREATE OR REPLACE VIEW arkham_quota_month AS
WITH bounds AS (
  SELECT date_trunc('month', now())                       AS month_start,
         (date_trunc('month', now()) + INTERVAL '1 month') AS month_end
),
usage AS (
  SELECT COALESCE(SUM(CASE
           WHEN NOT cache_hit AND status BETWEEN 200 AND 299 THEN cost ELSE 0
         END), 0)::INT AS calls_used
  FROM arkham_call_log, bounds
  WHERE called_at >= bounds.month_start
)
SELECT
  usage.calls_used,
  (10000 - usage.calls_used)::INT AS calls_remaining,
  EXTRACT(EPOCH FROM (bounds.month_end - now())) / 86400.0 AS days_left,
  CASE
    WHEN EXTRACT(EPOCH FROM (now() - bounds.month_start)) <= 0 THEN 0
    ELSE usage.calls_used
         / GREATEST(EXTRACT(EPOCH FROM (now() - bounds.month_start)) / 86400.0, 1)
         * 30
  END AS projected_month_end
FROM usage, bounds;

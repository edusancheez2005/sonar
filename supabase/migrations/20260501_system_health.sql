-- 2026-05-01 — system_health
--
-- One row per (component, run). Every cron writes one row at the start
-- and updates it at the end. Lets us answer "when did fetch-prices last
-- succeed?" with one SELECT instead of digging through Vercel logs.
--
-- Service-role-only. No RLS policies needed because there are no user
-- reads — the freshness banner on /api/signals/accuracy proxies through
-- a server route that uses the service role.

CREATE TABLE IF NOT EXISTS system_health (
  id BIGSERIAL PRIMARY KEY,
  component TEXT NOT NULL,                -- e.g. 'fetch-prices', 'compute-signals'
  status TEXT NOT NULL CHECK (status IN ('ok','partial','error','starting')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  details JSONB,                          -- { inserted, providers_succeeded, providers_failed, errors[] }
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_component_started
  ON system_health(component, started_at DESC);

-- Convenience view: latest run per component.
CREATE OR REPLACE VIEW v_system_health_latest AS
SELECT DISTINCT ON (component)
  component, status, started_at, finished_at, duration_ms, details
FROM system_health
ORDER BY component, started_at DESC;

-- Retention: keep 14 days of rows so the table stays small.
-- (Run as a separate scheduled job or rely on a manual prune.)
-- DELETE FROM system_health WHERE started_at < now() - INTERVAL '14 days';

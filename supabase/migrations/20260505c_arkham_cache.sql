-- Generic key/value cache for raw Arkham responses.
-- TTL stored per-row so we can mix short-lived (transfers) and long-lived (entity profiles).

CREATE TABLE IF NOT EXISTS arkham_cache (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  written_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INT NOT NULL DEFAULT 86400
);
CREATE INDEX IF NOT EXISTS arkham_cache_written_at_idx ON arkham_cache (written_at DESC);

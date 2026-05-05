-- tracked_address_transfers: live on-chain activity feed for the
-- ~1830 entity-attributed addresses in tracked_address_universe.
-- Populated by /api/cron/poll-tracked-addresses (hourly).
--
-- Each row represents ONE token transfer touching ONE tracked address.
-- A swap will show up as two rows (one for each leg) keyed off the same
-- tx_hash. The (chain, tx_hash, address, direction, contract) PK keeps
-- the cron idempotent: re-runs upsert into the same row.

CREATE TABLE IF NOT EXISTS tracked_address_transfers (
  id                  BIGSERIAL PRIMARY KEY,
  chain               TEXT NOT NULL,
  tx_hash             TEXT NOT NULL,
  address             TEXT NOT NULL,            -- the tracked wallet
  direction           TEXT NOT NULL,            -- 'in' | 'out'
  contract            TEXT NOT NULL DEFAULT '', -- token contract; '' for native
  block_number        BIGINT,
  timestamp           TIMESTAMPTZ NOT NULL,
  counterparty        TEXT,                     -- the other side of the transfer
  token_symbol        TEXT,
  amount              NUMERIC,                  -- already scaled by decimals
  amount_usd          NUMERIC,                  -- best-effort; may be NULL
  arkham_entity_name  TEXT,                     -- denormalized for fast feeds
  arkham_entity_type  TEXT,
  arkham_label        TEXT,
  source              TEXT NOT NULL,            -- 'alchemy' | 'helius'
  raw                 JSONB,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tat_dedupe_uniq ON tracked_address_transfers (chain, tx_hash, address, direction, contract);
CREATE INDEX IF NOT EXISTS tat_address_idx        ON tracked_address_transfers (address);
CREATE INDEX IF NOT EXISTS tat_entity_idx         ON tracked_address_transfers (arkham_entity_name);
CREATE INDEX IF NOT EXISTS tat_timestamp_idx      ON tracked_address_transfers (timestamp DESC);
CREATE INDEX IF NOT EXISTS tat_entity_ts_idx      ON tracked_address_transfers (arkham_entity_name, timestamp DESC);

-- Track the cron's progress so we don't re-scan from genesis every run.
CREATE TABLE IF NOT EXISTS tracked_address_poll_state (
  chain        TEXT NOT NULL,
  address      TEXT NOT NULL,
  last_block   BIGINT,
  last_polled  TIMESTAMPTZ DEFAULT now(),
  last_error   TEXT,
  PRIMARY KEY (chain, address)
);

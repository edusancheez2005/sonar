-- tracked_address_universe: the long-term moat.
-- Every address Arkham confirms (entity-attributed) lives here, keyed by (chain, address).
-- After Phase 2 backfill this table will have thousands of named addresses across chains;
-- Helius/Alchemy can keep polling them live forever, even if Arkham access ends.

CREATE TABLE IF NOT EXISTS tracked_address_universe (
  chain               TEXT NOT NULL,
  address             TEXT NOT NULL,
  arkham_entity_id    TEXT,
  arkham_entity_name  TEXT,
  arkham_entity_type  TEXT,
  arkham_label        TEXT,
  arkham_is_contract  BOOLEAN,
  arkham_is_predicted BOOLEAN DEFAULT false,
  source              TEXT NOT NULL,            -- 'address_all' | 'transfers_harvest' | 'token_holders' | 'counterparties'
  harvested_at        TIMESTAMPTZ DEFAULT now(),
  arkham_raw          JSONB,
  PRIMARY KEY (chain, address)
);
CREATE INDEX IF NOT EXISTS tau_entity_idx ON tracked_address_universe (arkham_entity_id);
CREATE INDEX IF NOT EXISTS tau_type_idx   ON tracked_address_universe (arkham_entity_type);

-- Arkham integration: extend existing tables with arkham_* columns.
-- All idempotent.
-- See: scripts/arkham-probe.log for response shapes that justify column types.

-- ---------- curated_entities ----------
ALTER TABLE curated_entities
  ADD COLUMN IF NOT EXISTS arkham_entity_id   TEXT,
  ADD COLUMN IF NOT EXISTS arkham_entity_type TEXT,         -- 'cex','individual','dex','fund','government','protocol',...
  ADD COLUMN IF NOT EXISTS arkham_total_usd   NUMERIC,
  ADD COLUMN IF NOT EXISTS arkham_synced_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arkham_raw         JSONB;
CREATE INDEX IF NOT EXISTS curated_entities_arkham_id_idx
  ON curated_entities(arkham_entity_id);

-- ---------- wallet_identities ----------
ALTER TABLE wallet_identities
  ADD COLUMN IF NOT EXISTS arkham_entity_id   TEXT,
  ADD COLUMN IF NOT EXISTS arkham_entity_name TEXT,
  ADD COLUMN IF NOT EXISTS arkham_label       TEXT,         -- e.g. "Binance: Cold Wallet 2"
  ADD COLUMN IF NOT EXISTS arkham_chain       TEXT,
  ADD COLUMN IF NOT EXISTS arkham_is_contract BOOLEAN,
  ADD COLUMN IF NOT EXISTS arkham_synced_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arkham_confidence  NUMERIC;
CREATE INDEX IF NOT EXISTS wallet_identities_arkham_entity_idx
  ON wallet_identities(arkham_entity_id);

-- ---------- whale_whispers ----------
ALTER TABLE whale_whispers
  ADD COLUMN IF NOT EXISTS arkham_from_entity TEXT,
  ADD COLUMN IF NOT EXISTS arkham_from_label  TEXT,
  ADD COLUMN IF NOT EXISTS arkham_to_entity   TEXT,
  ADD COLUMN IF NOT EXISTS arkham_to_label    TEXT,
  ADD COLUMN IF NOT EXISTS arkham_synced_at   TIMESTAMPTZ;

-- ---------- social_creators ----------
ALTER TABLE social_creators
  ADD COLUMN IF NOT EXISTS arkham_entity_id    TEXT,
  ADD COLUMN IF NOT EXISTS arkham_match_method TEXT
    CHECK (arkham_match_method IS NULL OR arkham_match_method IN ('handle','manual','website')),
  ADD COLUMN IF NOT EXISTS arkham_matched_at   TIMESTAMPTZ;

-- ---------- token_signals ----------
ALTER TABLE token_signals
  ADD COLUMN IF NOT EXISTS arkham_smart_money_inflow_6h_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS arkham_smart_money_score          INT;

-- ---------- figure_backtests ----------
ALTER TABLE figure_backtests
  ADD COLUMN IF NOT EXISTS arkham_verified_pnl_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS arkham_pnl_synced_at    TIMESTAMPTZ;

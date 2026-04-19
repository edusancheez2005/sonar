-- entity_watchlist
-- Follow/watchlist for both label-aggregated entities (from /entities) and
-- curated public figures (from /figures).
--   entity_type = 'label'   → entity_ref is the label string
--                              (e.g. "Wintermute - Market Maker  (JUP holder)")
--   entity_type = 'curated' → entity_ref is the curated_entities.slug

CREATE TABLE IF NOT EXISTS entity_watchlist (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT CHECK (entity_type IN ('label','curated')),
  entity_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, entity_type, entity_ref)
);

CREATE INDEX IF NOT EXISTS idx_entity_watchlist_user
  ON entity_watchlist(user_id);

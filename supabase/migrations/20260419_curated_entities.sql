-- curated_entities
-- Seeded from publicly known addresses. Verify before claiming 100% accuracy —
-- addresses marked as verified in Arkham/Nansen as of Apr 2026.

CREATE TABLE IF NOT EXISTS curated_entities (
  slug TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN
    ('person','company','government','protocol','celebrity')),
  avatar_url TEXT,
  twitter_handle TEXT,
  is_featured BOOLEAN DEFAULT false,
  addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curated_entities_featured
  ON curated_entities(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_curated_entities_category
  ON curated_entities(category);

-- Addresses JSONB shape:
-- [{"address": "0x...", "chain": "ethereum", "note": "main wallet"}, ...]

-- Whale Whisper: AI-generated market narratives from combined whale + derivatives data
-- Populated by /api/cron/whale-whisper (runs every 4 hours)
-- Read by /api/dashboard/whale-whisper (latest narrative for dashboard)

CREATE TABLE IF NOT EXISTS whale_whispers (
  id BIGSERIAL PRIMARY KEY,
  narrative TEXT NOT NULL,
  summary TEXT,                        -- 1-line summary for compact view
  market_bias TEXT,                     -- 'bullish', 'bearish', 'neutral'
  confidence INTEGER,                   -- 0-100
  key_tokens TEXT[],                    -- tokens mentioned prominently
  data_snapshot JSONB,                  -- raw data used to generate (for audit)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whispers_created ON whale_whispers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whispers_bias ON whale_whispers(market_bias);

-- Exchanges Table for CoinGecko Exchange Data
-- Run this in your Supabase SQL Editor

-- Create exchanges table
CREATE TABLE IF NOT EXISTS exchanges (
  id TEXT PRIMARY KEY, -- CoinGecko exchange id
  name TEXT NOT NULL,
  image TEXT,
  url TEXT,
  country TEXT,
  year_established INTEGER,
  centralized BOOLEAN DEFAULT true,
  trust_score_rank INTEGER,
  trade_volume_24h_btc NUMERIC,
  trade_volume_24h_btc_normalized NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  raw_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_exchanges_name ON exchanges(name);
CREATE INDEX IF NOT EXISTS idx_exchanges_centralized ON exchanges(centralized);
CREATE INDEX IF NOT EXISTS idx_exchanges_trust_score ON exchanges(trust_score_rank);
CREATE INDEX IF NOT EXISTS idx_exchanges_updated_at ON exchanges(updated_at);

-- Enable Row Level Security
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access (or authenticated only)
CREATE POLICY "Allow public read access to exchanges"
  ON exchanges
  FOR SELECT
  USING (true); -- Change to auth.uid() IS NOT NULL for authenticated-only

-- Policy: Only service role can insert/update
CREATE POLICY "Only service role can write exchanges"
  ON exchanges
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON exchanges TO anon, authenticated;
GRANT ALL ON exchanges TO service_role;

-- Add comment
COMMENT ON TABLE exchanges IS 'CoinGecko exchange metadata for CEX/DEX classification and analytics';

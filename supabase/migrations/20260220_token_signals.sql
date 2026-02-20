-- Sonar Token Signals Table
-- Stores computed signals from the Unified Signal Engine for backtesting and UI.
-- Computed every 15 minutes per active token.

CREATE TABLE IF NOT EXISTS token_signals (
  id              BIGSERIAL PRIMARY KEY,
  token           TEXT NOT NULL,
  signal          TEXT NOT NULL CHECK (signal IN ('STRONG BUY', 'BUY', 'NEUTRAL', 'SELL', 'STRONG SELL')),
  score           INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  confidence      INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  raw_score       INTEGER DEFAULT 0,
  
  -- Price at signal time (for backtesting forward returns)
  price_at_signal DOUBLE PRECISION,
  market_cap      DOUBLE PRECISION,
  
  -- Recommended timeframe
  timeframe       TEXT,
  
  -- Individual tier scores (-100 to +100)
  tier1_score     INTEGER DEFAULT 0,  -- CEX whale flow
  tier1_confidence INTEGER DEFAULT 0,
  tier2_score     INTEGER DEFAULT 0,  -- Price momentum
  tier2_confidence INTEGER DEFAULT 0,
  tier3_score     INTEGER DEFAULT 0,  -- Sentiment & social
  tier3_confidence INTEGER DEFAULT 0,
  tier4_score     INTEGER DEFAULT 0,  -- Activity & community
  tier4_confidence INTEGER DEFAULT 0,
  
  -- Detailed factors (JSONB)
  top_factors     JSONB DEFAULT '[]',
  traps           JSONB DEFAULT '[]',
  tier1_factors   JSONB DEFAULT '{}',
  
  -- Backtesting: filled in later by a separate job
  price_24h_later DOUBLE PRECISION,
  price_3d_later  DOUBLE PRECISION,
  price_7d_later  DOUBLE PRECISION,
  return_24h      DOUBLE PRECISION,
  return_3d       DOUBLE PRECISION,
  return_7d       DOUBLE PRECISION,
  
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_token_signals_token ON token_signals(token);
CREATE INDEX IF NOT EXISTS idx_token_signals_computed_at ON token_signals(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_signals_token_computed ON token_signals(token, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_signals_signal ON token_signals(signal);
CREATE INDEX IF NOT EXISTS idx_token_signals_score ON token_signals(score);

-- Composite index for backtesting queries
CREATE INDEX IF NOT EXISTS idx_token_signals_backtest ON token_signals(token, signal, computed_at)
  WHERE price_at_signal IS NOT NULL AND price_7d_later IS NOT NULL;

-- RLS (allow read for all, write for service role only)
ALTER TABLE token_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON token_signals
  FOR SELECT USING (true);

CREATE POLICY "Allow service role insert" ON token_signals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role update" ON token_signals
  FOR UPDATE USING (true);

-- Comment
COMMENT ON TABLE token_signals IS 'Unified Signal Engine outputs. Computed every 15min per active token. Used for UI signals and backtesting.';

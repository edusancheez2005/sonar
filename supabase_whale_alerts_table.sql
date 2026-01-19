-- =====================================================
-- WHALE ALERTS TABLE SCHEMA
-- For storing real-time whale transaction alerts from Whale Alert API
-- =====================================================

-- Create whale_alerts table
CREATE TABLE IF NOT EXISTS whale_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Whale Alert API Data
  transaction_hash TEXT NOT NULL,
  blockchain TEXT NOT NULL,
  symbol TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  amount_usd NUMERIC NOT NULL,
  from_address TEXT,
  to_address TEXT,
  from_owner TEXT,
  to_owner TEXT,
  from_owner_type TEXT, -- e.g., 'exchange', 'wallet', 'unknown'
  to_owner_type TEXT,
  
  -- Transaction Details
  transaction_type TEXT, -- 'transfer', 'mint', 'burn'
  transaction_count INTEGER,
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  raw_data JSONB, -- Store full API response for reference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast queries
  CONSTRAINT unique_transaction UNIQUE (transaction_hash, blockchain)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whale_alerts_timestamp ON whale_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whale_alerts_blockchain ON whale_alerts(blockchain);
CREATE INDEX IF NOT EXISTS idx_whale_alerts_symbol ON whale_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_whale_alerts_amount_usd ON whale_alerts(amount_usd DESC);
CREATE INDEX IF NOT EXISTS idx_whale_alerts_from_owner ON whale_alerts(from_owner);
CREATE INDEX IF NOT EXISTS idx_whale_alerts_to_owner ON whale_alerts(to_owner);
CREATE INDEX IF NOT EXISTS idx_whale_alerts_created_at ON whale_alerts(created_at DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_whale_alerts_symbol_timestamp ON whale_alerts(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whale_alerts_blockchain_timestamp ON whale_alerts(blockchain, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE whale_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read whale alerts (public data)
CREATE POLICY "Public read access to whale alerts"
  ON whale_alerts FOR SELECT
  USING (true);

-- Policy: Only service role can insert/update/delete
CREATE POLICY "Service role has full access"
  ON whale_alerts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- USER WHALE ALERT PREFERENCES TABLE
-- For storing user-specific alert preferences
-- =====================================================

CREATE TABLE IF NOT EXISTS user_whale_alert_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Alert Preferences
  enabled BOOLEAN DEFAULT true,
  min_amount_usd NUMERIC DEFAULT 1000000, -- Minimum $1M by default
  
  -- Token Filters (array of symbols to watch)
  watched_tokens TEXT[] DEFAULT '{}',
  
  -- Address Filters
  watched_addresses TEXT[] DEFAULT '{}',
  
  -- Blockchain Filters
  watched_blockchains TEXT[] DEFAULT ARRAY['ethereum', 'bitcoin', 'tron', 'ripple'],
  
  -- Notification Settings
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_user_whale_prefs_user_id ON user_whale_alert_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE user_whale_alert_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_whale_alert_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_whale_alert_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON user_whale_alert_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to preferences"
  ON user_whale_alert_preferences FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE whale_alerts IS 'Stores real-time whale transaction alerts from Whale Alert API. Data is ERC-20 tokens and major blockchains only.';
COMMENT ON COLUMN whale_alerts.transaction_hash IS 'Unique transaction hash from blockchain';
COMMENT ON COLUMN whale_alerts.blockchain IS 'Blockchain network (ethereum, bitcoin, tron, ripple, etc.)';
COMMENT ON COLUMN whale_alerts.symbol IS 'Token symbol (BTC, ETH, USDT, etc.)';
COMMENT ON COLUMN whale_alerts.amount IS 'Transaction amount in native token units';
COMMENT ON COLUMN whale_alerts.amount_usd IS 'Transaction value in USD';
COMMENT ON COLUMN whale_alerts.from_owner_type IS 'Type of sender (exchange, wallet, unknown)';
COMMENT ON COLUMN whale_alerts.to_owner_type IS 'Type of receiver (exchange, wallet, unknown)';
COMMENT ON COLUMN whale_alerts.raw_data IS 'Full JSON response from Whale Alert API';

COMMENT ON TABLE user_whale_alert_preferences IS 'User-specific preferences for whale alert notifications (Premium feature)';
COMMENT ON COLUMN user_whale_alert_preferences.min_amount_usd IS 'Minimum transaction value in USD to trigger alert';
COMMENT ON COLUMN user_whale_alert_preferences.watched_tokens IS 'Array of token symbols user wants to monitor';
COMMENT ON COLUMN user_whale_alert_preferences.watched_addresses IS 'Array of blockchain addresses user wants to monitor';

-- =====================================================
-- SAMPLE QUERY EXAMPLES
-- =====================================================

-- Get recent whale alerts (last 24 hours)
-- SELECT * FROM whale_alerts 
-- WHERE timestamp > NOW() - INTERVAL '24 hours'
-- ORDER BY timestamp DESC;

-- Get alerts for specific token
-- SELECT * FROM whale_alerts 
-- WHERE symbol = 'USDT' 
-- AND timestamp > NOW() - INTERVAL '7 days'
-- ORDER BY amount_usd DESC;

-- Get largest transactions
-- SELECT * FROM whale_alerts 
-- ORDER BY amount_usd DESC 
-- LIMIT 100;

-- Get exchange-to-wallet movements (potential accumulation)
-- SELECT * FROM whale_alerts 
-- WHERE from_owner_type = 'exchange' 
-- AND to_owner_type = 'wallet'
-- AND timestamp > NOW() - INTERVAL '24 hours'
-- ORDER BY amount_usd DESC;

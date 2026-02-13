-- User Watchlists table
CREATE TABLE IF NOT EXISTS user_watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON user_watchlists(symbol);

-- Enable RLS
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;

-- Users can read their own watchlist
CREATE POLICY "Users can read own watchlist" ON user_watchlists
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert to own watchlist
CREATE POLICY "Users can insert own watchlist" ON user_watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete own watchlist items
CREATE POLICY "Users can delete own watchlist" ON user_watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access" ON user_watchlists
  FOR ALL USING (true);

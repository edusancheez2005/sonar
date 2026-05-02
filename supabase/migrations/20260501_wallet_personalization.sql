-- Wallet Personalization (v1)
-- See WALLET_PERSONALIZATION_PROMPT.md for the spec.

-- 1. Wallet identities: a single auth.users.id may link multiple wallets
CREATE TABLE IF NOT EXISTS wallet_identities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,                -- lowercased
  chain TEXT NOT NULL CHECK (chain IN ('ethereum','solana','polygon','arbitrum','base','optimism','bitcoin')),
  is_primary BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,              -- set when SIWE/Solana sig verified; NULL for "address-paste only"
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (address, chain)
);

CREATE INDEX IF NOT EXISTS idx_wallet_identities_user ON wallet_identities(user_id);

-- 2. Cached holdings snapshot per wallet
CREATE TABLE IF NOT EXISTS wallet_holdings_cache (
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  ttl_seconds INT DEFAULT 300,
  total_usd NUMERIC,
  holdings JSONB,
  PRIMARY KEY (address, chain)
);

-- 3. Personalized token set (distinct from user_watchlists)
CREATE TABLE IF NOT EXISTS user_portfolio_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('detected','manual')),
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, symbol)
);

-- 4. Auth nonces (short-lived, for SIWE / Solana sign-in)
CREATE TABLE IF NOT EXISTS wallet_auth_nonces (
  nonce TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wallet_auth_nonces_issued ON wallet_auth_nonces(issued_at);

-- RLS
ALTER TABLE wallet_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolio_tokens ENABLE ROW LEVEL SECURITY;
-- wallet_holdings_cache and wallet_auth_nonces are service-role only (no policies)

DROP POLICY IF EXISTS "users read own wallet identities" ON wallet_identities;
CREATE POLICY "users read own wallet identities" ON wallet_identities
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users manage own wallet identities" ON wallet_identities;
CREATE POLICY "users manage own wallet identities" ON wallet_identities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users read own portfolio tokens" ON user_portfolio_tokens;
CREATE POLICY "users read own portfolio tokens" ON user_portfolio_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users manage own portfolio tokens" ON user_portfolio_tokens;
CREATE POLICY "users manage own portfolio tokens" ON user_portfolio_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wallet_follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  address text NOT NULL,
  followed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, address)
);
CREATE INDEX IF NOT EXISTS idx_wallet_follows_user_id ON wallet_follows(user_id);

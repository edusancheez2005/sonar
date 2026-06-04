-- polymarket_whale_follows
-- Lets a user follow a Polymarket whale (by proxy_wallet) so their bids
-- show up under the "Polymarket" section of the Following tab.
--   proxy_wallet → polymarket_whales.proxy_wallet / polymarket_market_holders.proxy_wallet
--   name         → cached display name at follow-time (whale name can be an
--                  address; we still hydrate the latest name from
--                  polymarket_whales on read when available)

CREATE TABLE IF NOT EXISTS polymarket_whale_follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proxy_wallet TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, proxy_wallet)
);

CREATE INDEX IF NOT EXISTS idx_polymarket_whale_follows_user
  ON polymarket_whale_follows(user_id);

ALTER TABLE polymarket_whale_follows ENABLE ROW LEVEL SECURITY;

-- The app talks to this table via the service role (which bypasses RLS),
-- but we still scope direct access to the owner for safety/parity with
-- other user tables.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'polymarket_whale_follows'
      AND policyname = 'own_polymarket_whale_follows'
  ) THEN
    CREATE POLICY own_polymarket_whale_follows
      ON polymarket_whale_follows
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

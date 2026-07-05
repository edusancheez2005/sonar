-- Fake-door waitlist for the "Mirror Wallet" concept.
-- Headline metric: COUNT(DISTINCT user_id) = demand breadth.
-- Multiple rows per user (one per wallet clicked) = intent depth.

CREATE TABLE IF NOT EXISTS public.mirror_wallet_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  wallet_address text NOT NULL,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_mirror_wallet_waitlist_created
  ON public.mirror_wallet_waitlist (created_at DESC);

ALTER TABLE public.mirror_wallet_waitlist ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: anon/authenticated get no access at all.
-- The API route writes with the service-role key, which bypasses RLS.

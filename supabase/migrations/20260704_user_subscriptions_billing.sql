-- Billing state for Stripe subscriptions (one row per user).
-- profiles.plan remains the gate flag ('premium' / 'free'); this table is the
-- source of truth for the Stripe customer id, subscription id, status and
-- trial dates. Written only by the Stripe webhook + checkout route (service
-- role). The table already exists in production with an unknown schema, so
-- every column is added defensively.

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS price_id text;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS trial_end timestamptz;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Required by the webhook's upsert(onConflict: 'user_id').
-- If this fails with "could not create unique index" there are duplicate
-- rows in production; run the dedup statement below, then re-run this file:
--
--   DELETE FROM public.user_subscriptions a
--   USING public.user_subscriptions b
--   WHERE a.user_id = b.user_id AND a.ctid < b.ctid;
--
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_user_id_key
  ON public.user_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer
  ON public.user_subscriptions (stripe_customer_id);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- The browser reads its own row (profile page billing lookup). All writes go
-- through the service role, which bypasses RLS, so no insert/update policies.
DROP POLICY IF EXISTS user_subscriptions_select_own ON public.user_subscriptions;
CREATE POLICY user_subscriptions_select_own ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

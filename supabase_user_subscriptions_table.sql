-- Create user_subscriptions table to track Stripe subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'pending',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Create index on stripe_customer_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_customer_id ON user_subscriptions(stripe_customer_id);

-- Create index on subscription_status for filtering active users
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(subscription_status);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own subscription
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can do anything
CREATE POLICY "Service role has full access"
  ON user_subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

COMMENT ON TABLE user_subscriptions IS 'Stores Stripe subscription data for users';
COMMENT ON COLUMN user_subscriptions.subscription_status IS 'Stripe subscription status: pending, active, past_due, canceled, etc.';


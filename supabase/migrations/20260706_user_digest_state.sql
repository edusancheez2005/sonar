-- Tracks the last personal-digest email sent per user so the daily cron
-- (and any manual re-trigger) never double-sends within a day.

CREATE TABLE IF NOT EXISTS public.user_digest_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_digest_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_digest_state ENABLE ROW LEVEL SECURITY;

-- No policies: written only by the service-role cron, which bypasses RLS.

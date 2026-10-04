-- ============================================================================
-- funnel_events — the eight activation events (Week 1, 2026-10-03)
--
--   signup → welcome_choice → follow / alert_set / orca_question
--          → paywall_view → checkout → paid
--
-- One row per event. Written ONLY by the service role (POST /api/track and
-- server-side hooks); no client policies. user_id is nullable so anonymous
-- paywall views on public pages still count. `props` carries the small
-- per-event context (method, slug, kind…) and is capped at the API layer.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event       text NOT NULL,
  props       jsonb NOT NULL DEFAULT '{}'::jsonb,
  path        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_events
  DROP CONSTRAINT IF EXISTS funnel_events_event_check;
ALTER TABLE public.funnel_events
  ADD CONSTRAINT funnel_events_event_check CHECK (event IN (
    'signup', 'welcome_choice', 'follow', 'alert_set', 'orca_question',
    'paywall_view', 'checkout', 'paid'
  ));

CREATE INDEX IF NOT EXISTS idx_funnel_events_event_time
  ON public.funnel_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_user_time
  ON public.funnel_events (user_id, created_at DESC);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: service-role only.
REVOKE ALL ON public.funnel_events FROM anon, authenticated;

-- A redelivered Stripe webhook must not add a second checkout/paid row.
CREATE UNIQUE INDEX IF NOT EXISTS uq_funnel_events_stripe_event
  ON public.funnel_events (event, (props->>'stripe_event_id'))
  WHERE props ? 'stripe_event_id';

-- Daily funnel for the dashboard / Saif: distinct users per event and stage
-- per day. stage separates e.g. checkout/session_created from
-- checkout/trial_started, and paid/first_charge from paid/trial_converted;
-- it is NULL for events without one.
CREATE OR REPLACE VIEW public.funnel_daily AS
SELECT
  date_trunc('day', created_at)::date AS day,
  event,
  props->>'stage'                  AS stage,
  count(*)                         AS events,
  count(DISTINCT user_id)          AS users
FROM public.funnel_events
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;

-- Views run with their owner's rights, which bypass the table's RLS, and
-- Supabase grants new public objects to anon/authenticated by default. Without
-- this REVOKE anyone holding the public anon key could read daily signups and
-- payments from /rest/v1/funnel_daily.
REVOKE ALL ON public.funnel_daily FROM anon, authenticated;

COMMENT ON TABLE public.funnel_events IS
  'Activation funnel events (signup, welcome_choice, follow, alert_set, orca_question, paywall_view, checkout, paid). Service-role writes only.';

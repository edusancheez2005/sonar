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

-- Daily funnel for the dashboard / Saif: distinct users per event per day.
CREATE OR REPLACE VIEW public.funnel_daily AS
SELECT
  date_trunc('day', created_at)::date AS day,
  event,
  count(*)                         AS events,
  count(DISTINCT user_id)          AS users
FROM public.funnel_events
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

COMMENT ON TABLE public.funnel_events IS
  'Activation funnel events (signup, welcome_choice, follow, alert_set, orca_question, paywall_view, checkout, paid). Service-role writes only.';

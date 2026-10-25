-- ============================================================================
-- funnel_events: allow 'alert_opened' ("Open in ORCA" on a notification).
-- Run AFTER 20261003_funnel_events.sql. Until this runs, the insert is
-- rejected by the CHECK and swallowed by the writer (verify with a count).
-- ============================================================================
ALTER TABLE public.funnel_events
  DROP CONSTRAINT IF EXISTS funnel_events_event_check;
ALTER TABLE public.funnel_events
  ADD CONSTRAINT funnel_events_event_check CHECK (event IN (
    'signup', 'welcome_choice', 'follow', 'alert_set', 'orca_question',
    'paywall_view', 'checkout', 'paid', 'alert_opened'
  ));

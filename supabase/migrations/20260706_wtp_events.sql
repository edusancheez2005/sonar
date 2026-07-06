-- Willingness-to-pay fake-door telemetry for the /try landing page
-- (cold-traffic test: visits vs. intent clicks, segmented by source).
-- Counted server-side because consent-gated GA misses most cold visitors.

CREATE TABLE IF NOT EXISTS public.wtp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL CHECK (event IN ('visit', 'intent_click', 'explore_click')),
  source text,          -- ?src= attribution (ig, x, tiktok, ...)
  variant text,         -- ?v= copy/price variant for future A/B tests
  path text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wtp_events_created ON public.wtp_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wtp_events_event ON public.wtp_events (event);

ALTER TABLE public.wtp_events ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: anon/authenticated get no access at all.
-- The API route writes with the service-role key, which bypasses RLS.

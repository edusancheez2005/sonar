-- Generic service-role-only key/value cache. First user: the macro-factors
-- read, so cold serverless instances can serve it instantly instead of each
-- paying a 30s+ Grok web-search generation on a live user request.
CREATE TABLE IF NOT EXISTS public.app_cache (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_cache ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: anon/authenticated clients get nothing; the
-- service-role API bypasses RLS.

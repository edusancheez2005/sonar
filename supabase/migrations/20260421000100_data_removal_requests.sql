-- LEGAL_AUDIT_2026-04-21.md §1.D findings D1, D2
-- Backing table for /api/legal/data-removal-request submissions. Every
-- row represents a GDPR Art. 17 / CCPA §1798.105 / right-of-publicity /
-- trademark / defamation complaint that the legal team must triage.

CREATE TABLE IF NOT EXISTS public.data_removal_requests (
  id                       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               timestamptz  NOT NULL DEFAULT now(),
  status                   text         NOT NULL DEFAULT 'received',
                                        -- received | triaged | actioned | rejected | withdrawn
  email                    text         NOT NULL,
  full_name                text,
  request_type             text         NOT NULL DEFAULT 'other',
                                        -- gdpr-erasure | ccpa-deletion | right-of-publicity | trademark | defamation | other
  relationship             text,
  target_urls              text         NOT NULL,
  description              text         NOT NULL,
  verification_statement   text,
  submitter_ip             text,
  submitter_user_agent     text,
  triage_notes             text,
  actioned_at              timestamptz,
  actioned_by              uuid
);

CREATE INDEX IF NOT EXISTS data_removal_requests_status_idx
  ON public.data_removal_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS data_removal_requests_email_idx
  ON public.data_removal_requests (email);

-- Lock the table down: no anon read, only the service-role can write.
ALTER TABLE public.data_removal_requests ENABLE ROW LEVEL SECURITY;

-- No policies are added \u2014 with RLS enabled and no policies, anon and
-- authenticated users have no access. The service-role key bypasses RLS
-- and is used by the API route + admin tooling.

COMMENT ON TABLE public.data_removal_requests IS
  'Intake queue for data-subject erasure / right-of-publicity / DMCA-adjacent removal requests. Reviewed by the legal team within 30 days (UK GDPR Art. 12(3)).';

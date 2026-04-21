-- LEGAL_AUDIT_2026-04-21.md §1.A finding A14
-- Adds eligibility-attestation columns to profiles so we have an audit
-- trail of the user's confirmation that they are 18+, accepted Terms,
-- and are not located in a sanctioned jurisdiction.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS over_18_confirmed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS terms_accepted_at         timestamptz,
  ADD COLUMN IF NOT EXISTS sanctions_attestation_at  timestamptz,
  ADD COLUMN IF NOT EXISTS signup_ip                 text,
  ADD COLUMN IF NOT EXISTS signup_user_agent         text;

COMMENT ON COLUMN public.profiles.over_18_confirmed_at IS
  'UTC timestamp at which the user confirmed they are aged 18 or over during signup. Required by LEGAL_AUDIT_2026-04-21.md A14.';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS
  'UTC timestamp at which the user accepted the Terms of Service and Privacy Policy.';
COMMENT ON COLUMN public.profiles.sanctions_attestation_at IS
  'UTC timestamp at which the user attested they are not located in a sanctioned jurisdiction.';
COMMENT ON COLUMN public.profiles.signup_ip IS
  'IPv4/IPv6 address recorded at signup for fraud + sanctions audit. Retained per Privacy Policy retention schedule.';
COMMENT ON COLUMN public.profiles.signup_user_agent IS
  'User-Agent string recorded at signup, truncated to 500 chars.';

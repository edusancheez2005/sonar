-- Add profile fields for richer user data collection
-- These fields are populated during signup and can be updated in profile settings

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[],
  ADD COLUMN IF NOT EXISTS age_range TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_size TEXT,
  ADD COLUMN IF NOT EXISTS preferred_chains TEXT[],
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT;

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_experience ON public.profiles(experience_level);

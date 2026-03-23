-- Add user_id column to watchlists for per-user scoping
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS user_id uuid;

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);

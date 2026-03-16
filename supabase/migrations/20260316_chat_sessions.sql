-- Add session_id to chat_history for conversation grouping
ALTER TABLE public.chat_history 
ADD COLUMN IF NOT EXISTS session_id text DEFAULT NULL;

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_chat_history_session 
ON public.chat_history (user_id, session_id, timestamp DESC);


-- Add a daily_streaks JSONB column for storing the full streak history
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS daily_streaks JSONB DEFAULT '[]'::jsonb;

-- (Optional but recommended) In the future, consider adding policies if you want more security


-- Enable Row Level Security for user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Allow users to select only their own progress row
CREATE POLICY "Users can view their own progress" 
  ON public.user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert (create) their own progress row
CREATE POLICY "Users can create their own progress" 
  ON public.user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own progress row
CREATE POLICY "Users can update their own progress"
  ON public.user_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete only their own progress row
CREATE POLICY "Users can delete their own progress"
  ON public.user_progress
  FOR DELETE
  USING (auth.uid() = user_id);

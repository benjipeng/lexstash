-- Add 30-prompt limit per user
-- This policy prevents users from having more than 30 cloud prompts
-- Applied: 2025-11-22

-- Drop the existing insert policy first (to replace it)
DROP POLICY IF EXISTS "Users can insert own prompts" ON public.prompts;

-- Recreate insert policy WITH the limit check
CREATE POLICY "Users can insert own prompts with limit"
ON public.prompts FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND
  (SELECT COUNT(*) FROM public.prompts WHERE user_id = auth.uid()) < 30
);

-- Add documentation comment
COMMENT ON POLICY "Users can insert own prompts with limit" ON public.prompts
IS 'Allows authenticated users to create prompts for themselves, limited to 30 prompts maximum';

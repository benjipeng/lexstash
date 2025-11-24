-- Remove quota check from RLS policy
-- The quota is now enforced at the application level only
-- This fixes the "infinite recursion detected in policy" error
-- Applied: 2025-11-24

-- Drop the policy with the quota check
DROP POLICY IF EXISTS "Users can insert own prompts with limit" ON public.prompts;

-- Recreate the insert policy WITHOUT the quota check
-- This policy only handles access control (security), not business logic
CREATE POLICY "Users can insert own prompts"
ON public.prompts FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
);

-- Add documentation comment
COMMENT ON POLICY "Users can insert own prompts" ON public.prompts
IS 'Allows authenticated users to create prompts for themselves. Quota enforcement is handled at the application level.';

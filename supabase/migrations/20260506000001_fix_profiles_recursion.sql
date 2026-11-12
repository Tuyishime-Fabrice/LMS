-- Fix infinite recursion in profiles RLS policy
-- The previous "Allow reading teacher profiles for chat" policy queried profiles
-- from within a profiles SELECT policy, causing 42P17 infinite recursion errors.

DROP POLICY IF EXISTS "Allow reading teacher profiles for chat" ON public.profiles;
DROP POLICY IF EXISTS "Users can view teacher profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role::TEXT INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Allow reading teacher profiles for chat"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR role = 'teacher'
  OR public.get_user_role(auth.uid()) IN ('teacher', 'admin')
);

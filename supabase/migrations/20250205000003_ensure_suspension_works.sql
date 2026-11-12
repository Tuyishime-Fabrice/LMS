-- =====================================================
-- Ensure Suspension Feature Works Properly
-- Adds necessary policies and fixes any issues
-- =====================================================

-- 1. Ensure users can read their own suspension status
DO $$ 
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  
  -- Create policy to allow users to read their own profile
  CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);
    
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists, ignore
END $$;

-- 2. Ensure the suspension fields exist
DO $$ 
BEGIN
  -- Add suspension fields if they don't exist
  ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
  
  ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
  
EXCEPTION
  WHEN duplicate_column THEN
    NULL; -- Columns already exist, ignore
END $$;

-- 3. Create index for faster suspension checks
CREATE INDEX IF NOT EXISTS idx_profiles_suspended 
ON public.profiles(is_suspended) 
WHERE is_suspended = true;

-- 4. Verify the RPC functions exist and work
-- Test if suspend_user function exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'suspend_user'
  ) THEN
    RAISE NOTICE 'WARNING: suspend_user function does not exist. Run migration 20250205000002_suspension_functions.sql';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'unsuspend_user'
  ) THEN
    RAISE NOTICE 'WARNING: unsuspend_user function does not exist. Run migration 20250205000002_suspension_functions.sql';
  END IF;
END $$;

-- 5. Add a trigger to log when users are suspended/unsuspended
CREATE OR REPLACE FUNCTION public.log_suspension_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_suspended IS DISTINCT FROM NEW.is_suspended THEN
    INSERT INTO public.activity_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      details
    ) VALUES (
      auth.uid(),
      CASE 
        WHEN NEW.is_suspended THEN 'user_suspended'
        ELSE 'user_unsuspended'
      END,
      'profile',
      NEW.id,
      jsonb_build_object(
        'reason', NEW.suspension_reason,
        'changed_at', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_suspension_change ON public.profiles;
CREATE TRIGGER on_suspension_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.is_suspended IS DISTINCT FROM NEW.is_suspended)
  EXECUTE FUNCTION public.log_suspension_change();

-- 6. Comments
COMMENT ON TRIGGER on_suspension_change ON public.profiles IS 'Automatically logs suspension status changes';
COMMENT ON FUNCTION public.log_suspension_change IS 'Logs when a user is suspended or unsuspended';

-- 7. Verify setup
DO $$ 
DECLARE
  policy_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Check if SELECT policy exists
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles'
    AND cmd = 'SELECT'
    AND policyname = 'Users can view their own profile';
    
  IF policy_count = 0 THEN
    RAISE WARNING 'SELECT policy on profiles may not exist!';
  ELSE
    RAISE NOTICE 'Suspension feature setup complete!';
  END IF;
END $$;

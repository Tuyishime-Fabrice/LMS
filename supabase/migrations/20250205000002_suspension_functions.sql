-- =====================================================
-- User Suspension RPC Functions
-- Allows admins to suspend/unsuspend users
-- =====================================================

-- Function to suspend user (admin only)
CREATE OR REPLACE FUNCTION public.suspend_user(
  p_user_id UUID,
  p_suspension_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can suspend users';
  END IF;

  -- Prevent suspending admins
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Cannot suspend admin accounts';
  END IF;

  -- Suspend the user
  UPDATE public.profiles
  SET 
    is_suspended = true,
    suspension_reason = p_suspension_reason,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log activity
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'user_suspended', 'profile', p_user_id, jsonb_build_object('reason', p_suspension_reason));

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsuspend user (admin only)
CREATE OR REPLACE FUNCTION public.unsuspend_user(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can unsuspend users';
  END IF;

  -- Unsuspend the user
  UPDATE public.profiles
  SET 
    is_suspended = false,
    suspension_reason = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log activity
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'user_unsuspended', 'profile', p_user_id);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION public.suspend_user IS 'Suspend a user account with reason (admin only)';
COMMENT ON FUNCTION public.unsuspend_user IS 'Unsuspend a user account (admin only)';

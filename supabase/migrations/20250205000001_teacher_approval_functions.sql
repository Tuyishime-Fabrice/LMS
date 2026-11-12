-- =====================================================
-- Teacher Approval RPC Functions
-- Allows admins to approve/reject teachers
-- =====================================================

-- Function to approve teacher (admin only)
CREATE OR REPLACE FUNCTION public.approve_teacher(
  p_teacher_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve teachers';
  END IF;

  -- Approve the teacher
  UPDATE public.profiles
  SET 
    teacher_approved = true,
    teacher_approval_status = 'approved',
    teacher_approval_date = NOW(),
    teacher_approved_by = auth.uid(),
    teacher_rejection_reason = NULL
  WHERE id = p_teacher_id AND role = 'teacher';

  -- Log activity
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'teacher_approved', 'profile', p_teacher_id);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject teacher (admin only)
CREATE OR REPLACE FUNCTION public.reject_teacher(
  p_teacher_id UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can reject teachers';
  END IF;

  -- Reject the teacher
  UPDATE public.profiles
  SET 
    teacher_approved = false,
    teacher_approval_status = 'rejected',
    teacher_approval_date = NOW(),
    teacher_approved_by = auth.uid(),
    teacher_rejection_reason = p_rejection_reason
  WHERE id = p_teacher_id AND role = 'teacher';

  -- Log activity
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'teacher_rejected', 'profile', p_teacher_id, jsonb_build_object('reason', p_rejection_reason));

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION public.approve_teacher IS 'Approve a teacher account (admin only)';
COMMENT ON FUNCTION public.reject_teacher IS 'Reject a teacher account with reason (admin only)';

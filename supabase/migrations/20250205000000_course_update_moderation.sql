-- =====================================================
-- Course Update Moderation System
-- Tracks course updates and requires admin approval
-- =====================================================

-- 1. Add fields to track course updates
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS pending_update BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS update_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS update_notes TEXT,
ADD COLUMN IF NOT EXISTS last_approved_at TIMESTAMPTZ;

-- 2. Create course update history table
CREATE TABLE IF NOT EXISTS public.course_update_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES public.profiles(id),
  update_type TEXT NOT NULL CHECK (update_type IN ('created', 'updated', 'approved', 'rejected')),
  changes JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_course_update_history_course_id ON public.course_update_history(course_id);
CREATE INDEX IF NOT EXISTS idx_course_update_history_status ON public.course_update_history(status);

-- 3. Enable RLS
ALTER TABLE public.course_update_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for course_update_history
-- Teachers can view their own course update history
CREATE POLICY "Teachers can view their course updates"
  ON public.course_update_history FOR SELECT
  USING (
    updated_by = auth.uid()
  );

-- System can insert update history
CREATE POLICY "System can insert course updates"
  ON public.course_update_history FOR INSERT
  WITH CHECK (true);

-- 5. Function to submit course update for review
CREATE OR REPLACE FUNCTION public.submit_course_update(
  p_course_id UUID,
  p_update_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is the course owner
  IF NOT EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = p_course_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You can only update your own courses';
  END IF;

  -- Mark course as having pending update
  UPDATE public.courses
  SET 
    pending_update = true,
    update_submitted_at = NOW(),
    update_notes = p_update_notes
  WHERE id = p_course_id;

  -- Log the update
  INSERT INTO public.course_update_history (
    course_id,
    updated_by,
    update_type,
    status
  ) VALUES (
    p_course_id,
    auth.uid(),
    'updated',
    'pending'
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to approve course update (admin only)
CREATE OR REPLACE FUNCTION public.approve_course_update(
  p_course_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve course updates';
  END IF;

  -- Approve the course
  UPDATE public.courses
  SET 
    pending_update = false,
    approval_status = 'approved',
    last_approved_at = NOW(),
    update_notes = NULL
  WHERE id = p_course_id;

  -- Update history
  UPDATE public.course_update_history
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    review_notes = p_review_notes,
    reviewed_at = NOW()
  WHERE course_id = p_course_id AND status = 'pending';

  -- Log activity
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'course_update_approved', 'course', p_course_id);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to reject course update (admin only)
CREATE OR REPLACE FUNCTION public.reject_course_update(
  p_course_id UUID,
  p_review_notes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can reject course updates';
  END IF;

  -- Reject the update
  UPDATE public.courses
  SET 
    pending_update = false,
    update_notes = NULL
  WHERE id = p_course_id;

  -- Update history
  UPDATE public.course_update_history
  SET 
    status = 'rejected',
    reviewed_by = auth.uid(),
    review_notes = p_review_notes,
    reviewed_at = NOW()
  WHERE course_id = p_course_id AND status = 'pending';

  -- Log activity
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'course_update_rejected', 'course', p_course_id, jsonb_build_object('reason', p_review_notes));

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to get pending course updates (admin only)
CREATE OR REPLACE FUNCTION public.get_pending_course_updates()
RETURNS TABLE (
  course_id UUID,
  course_title TEXT,
  teacher_id UUID,
  teacher_name TEXT,
  update_submitted_at TIMESTAMPTZ,
  update_notes TEXT,
  thumbnail_url TEXT
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can view pending course updates';
  END IF;

  RETURN QUERY
  SELECT 
    c.id as course_id,
    c.title as course_title,
    c.teacher_id,
    p.full_name as teacher_name,
    c.update_submitted_at,
    c.update_notes,
    c.thumbnail_url
  FROM public.courses c
  JOIN public.profiles p ON c.teacher_id = p.id
  WHERE c.pending_update = true
  ORDER BY c.update_submitted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Comments
COMMENT ON TABLE public.course_update_history IS 'Tracks all course updates and their approval status';
COMMENT ON FUNCTION public.submit_course_update IS 'Teachers submit course updates for admin review';
COMMENT ON FUNCTION public.approve_course_update IS 'Admins approve pending course updates';
COMMENT ON FUNCTION public.reject_course_update IS 'Admins reject pending course updates';
COMMENT ON FUNCTION public.get_pending_course_updates IS 'Get all courses with pending updates';

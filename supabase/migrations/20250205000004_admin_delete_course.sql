-- =====================================================
-- Admin Course Deletion Function
-- Allows admins to delete any course
-- =====================================================

-- Function to delete course (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_course(
  p_course_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete courses';
  END IF;

  -- Delete the course (CASCADE will handle related data)
  DELETE FROM public.courses
  WHERE id = p_course_id;

  -- Log activity
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'course_deleted_by_admin', 'course', p_course_id);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add policy to allow admins to delete courses
DO $$ 
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Admins can delete any course" ON public.courses;
  
  -- Create policy for admin deletion
  CREATE POLICY "Admins can delete any course"
    ON public.courses FOR DELETE
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
    
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists, ignore
END $$;

-- Comments
COMMENT ON FUNCTION public.admin_delete_course IS 'Delete a course (admin only) - handles all related data via CASCADE';

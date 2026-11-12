-- Fix scholarship application RLS: students must not UPDATE status/coupon fields

DROP POLICY IF EXISTS "Students manage own scholarship applications" ON public.scholarship_applications;

CREATE POLICY "Students can view own scholarship applications"
  ON public.scholarship_applications FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can submit scholarship applications"
  ON public.scholarship_applications FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending'
    AND coupon_id IS NULL
    AND generated_code IS NULL
  );

-- Prevent duplicate open applications per course
CREATE UNIQUE INDEX IF NOT EXISTS idx_scholarship_apps_one_open_per_course
  ON public.scholarship_applications (course_id, student_id)
  WHERE status IN ('pending', 'approved');

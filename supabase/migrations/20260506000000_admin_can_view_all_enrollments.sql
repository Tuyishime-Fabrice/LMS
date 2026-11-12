-- Allow admins to view all course enrollments (needed for certificate management)
CREATE POLICY "Admins can view all enrollments"
  ON public.course_enrollments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

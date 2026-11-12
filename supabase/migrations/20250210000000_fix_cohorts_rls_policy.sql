-- Fix cohorts RLS policy to allow teachers to view all their cohorts (not just active ones)

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view active cohorts" ON public.cohorts;

-- Create a more permissive policy for viewing cohorts
-- Teachers can see all their own cohorts
-- Students can see active cohorts
CREATE POLICY "Teachers can view all their cohorts"
  ON public.cohorts FOR SELECT
  USING (
    auth.uid() = teacher_id OR 
    (is_active = true AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student'))
  );

-- Also ensure teachers can view cohorts they created even if not active
CREATE POLICY "Anyone can view active cohorts for joining"
  ON public.cohorts FOR SELECT
  USING (is_active = true);

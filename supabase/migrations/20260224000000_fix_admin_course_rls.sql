-- =====================================================
-- Fix: Allow admins to update courses and manage chapter previews
-- Root cause: RLS policies on courses only allow teachers who own the course
-- to update it. Admins were silently blocked by RLS.
-- =====================================================

-- 1. Allow admins to UPDATE any course (pricing, approval, etc.)
DROP POLICY IF EXISTS "Admins can update any course" ON public.courses;
CREATE POLICY "Admins can update any course"
  ON public.courses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. Allow admins to manage course_chapters (toggle is_preview, etc.)
DROP POLICY IF EXISTS "Admins can manage any chapter" ON public.course_chapters;
CREATE POLICY "Admins can manage any chapter"
  ON public.course_chapters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 3. Allow admins to manage course_lessons (toggle is_preview, etc.)
DROP POLICY IF EXISTS "Admins can manage any lesson" ON public.course_lessons;
CREATE POLICY "Admins can manage any lesson"
  ON public.course_lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. Fix any NULL values in pricing/preview columns
UPDATE public.courses SET is_free = true WHERE is_free IS NULL;
UPDATE public.courses SET price = 0 WHERE price IS NULL;
UPDATE public.courses SET currency = 'RWF' WHERE currency IS NULL;
UPDATE public.course_chapters SET is_preview = false WHERE is_preview IS NULL;
UPDATE public.course_lessons SET is_preview = false WHERE is_preview IS NULL;

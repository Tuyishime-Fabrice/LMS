-- Fix Infinite Recursion in RLS Policies
-- This migration fixes the circular dependency in course_enrollments and course_materials policies

-- =====================================================
-- 1. DROP PROBLEMATIC POLICIES
-- =====================================================

-- Drop all existing policies on course_enrollments
DROP POLICY IF EXISTS "Students can view their enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments for their courses" ON public.course_enrollments;
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.course_enrollments;

-- Drop all existing policies on course_materials
DROP POLICY IF EXISTS "Enrolled students and teachers can view materials" ON public.course_materials;
DROP POLICY IF EXISTS "Teachers can create materials for their courses" ON public.course_materials;
DROP POLICY IF EXISTS "Teachers can update materials for their courses" ON public.course_materials;
DROP POLICY IF EXISTS "Teachers can delete materials from their courses" ON public.course_materials;

-- =====================================================
-- 2. CREATE FIXED POLICIES FOR COURSE_ENROLLMENTS
-- =====================================================

-- Students can view their own enrollments (no recursion)
CREATE POLICY "Students can view their enrollments"
  ON public.course_enrollments FOR SELECT
  USING (auth.uid() = student_id);

-- Teachers can view enrollments for their courses (direct join, no subquery)
CREATE POLICY "Teachers can view enrollments for their courses"
  ON public.course_enrollments FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

-- Students can enroll in courses (simplified check)
CREATE POLICY "Students can enroll in courses"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
  );

-- Allow students to delete their own enrollments (unenroll)
CREATE POLICY "Students can unenroll from courses"
  ON public.course_enrollments FOR DELETE
  USING (auth.uid() = student_id);

-- =====================================================
-- 3. CREATE FIXED POLICIES FOR COURSE_MATERIALS
-- =====================================================

-- Teachers can view materials for their courses (direct join)
CREATE POLICY "Teachers can view their course materials"
  ON public.course_materials FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

-- Enrolled students can view materials (direct join, no recursion)
CREATE POLICY "Enrolled students can view materials"
  ON public.course_materials FOR SELECT
  USING (
    course_id IN (
      SELECT course_id FROM public.course_enrollments WHERE student_id = auth.uid()
    )
  );

-- Teachers can create materials for their courses
CREATE POLICY "Teachers can create materials for their courses"
  ON public.course_materials FOR INSERT
  WITH CHECK (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

-- Teachers can update materials for their courses
CREATE POLICY "Teachers can update materials for their courses"
  ON public.course_materials FOR UPDATE
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

-- Teachers can delete materials from their courses
CREATE POLICY "Teachers can delete materials from their courses"
  ON public.course_materials FOR DELETE
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

-- =====================================================
-- 4. FIX OTHER POTENTIALLY PROBLEMATIC POLICIES
-- =====================================================

-- Drop and recreate assignments policy
DROP POLICY IF EXISTS "Enrolled students and teachers can view assignments" ON public.assignments;

CREATE POLICY "Teachers can view their course assignments"
  ON public.assignments FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Enrolled students can view assignments"
  ON public.assignments FOR SELECT
  USING (
    course_id IN (
      SELECT course_id FROM public.course_enrollments WHERE student_id = auth.uid()
    )
  );

-- Drop and recreate quizzes policy
DROP POLICY IF EXISTS "Enrolled students and teachers can view quizzes" ON public.quizzes;

CREATE POLICY "Teachers can view their course quizzes"
  ON public.quizzes FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Enrolled students can view quizzes"
  ON public.quizzes FOR SELECT
  USING (
    course_id IN (
      SELECT course_id FROM public.course_enrollments WHERE student_id = auth.uid()
    )
  );

-- Note: group_chats table structure was changed in enhanced_chat_system migration
-- The old course-based group_chats were replaced with independent group_chats
-- No policy changes needed here as the new structure doesn't reference courses

-- =====================================================
-- 5. ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes to improve policy performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
-- group_chats no longer has course_id column (changed in enhanced_chat_system migration)

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Students can view their enrollments" ON public.course_enrollments IS 
'Allows students to view their own course enrollments without recursion';

COMMENT ON POLICY "Teachers can view enrollments for their courses" ON public.course_enrollments IS 
'Allows teachers to view enrollments for courses they own using direct subquery';

COMMENT ON POLICY "Students can enroll in courses" ON public.course_enrollments IS 
'Allows students to enroll in any course - simplified to avoid recursion';

COMMENT ON POLICY "Enrolled students can view materials" ON public.course_materials IS 
'Allows enrolled students to view course materials using direct subquery to avoid recursion';

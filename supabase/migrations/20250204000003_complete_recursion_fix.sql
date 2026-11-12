-- =====================================================
-- COMPLETE FIX FOR INFINITE RECURSION
-- This removes ALL policies that query the profiles table
-- =====================================================

-- Step 1: Create a helper function that caches the user's role
-- This function uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role::TEXT INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 2: Drop and recreate ALL policies on courses that query profiles
DROP POLICY IF EXISTS "Teachers can create courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can update their own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can delete their own courses" ON public.courses;

-- Recreate without querying profiles
CREATE POLICY "Teachers can create courses"
  ON public.courses FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own courses"
  ON public.courses FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own courses"
  ON public.courses FOR DELETE
  USING (auth.uid() = teacher_id);

-- Step 3: Drop and recreate policies on course_enrollments
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.course_enrollments;

CREATE POLICY "Students can enroll in courses"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Step 4: Add application-level role checking
-- Create a function to check if user can create course (for app to call)
CREATE OR REPLACE FUNCTION public.can_create_course()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(auth.uid()) IN ('teacher', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a function to check if user can enroll
CREATE OR REPLACE FUNCTION public.can_enroll_in_course()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(auth.uid()) IN ('student', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 5: Comments
COMMENT ON FUNCTION public.get_user_role IS 'Get user role without causing recursion - uses SECURITY DEFINER';
COMMENT ON FUNCTION public.can_create_course IS 'Check if user can create courses (teacher or admin)';
COMMENT ON FUNCTION public.can_enroll_in_course IS 'Check if user can enroll in courses (student or admin)';

-- Step 6: Verify profiles policies are simple
-- These should already exist and be non-recursive:
-- "Users can view their own profile" - USING (auth.uid() = id)
-- "Users can update their own profile" - USING (auth.uid() = id)
-- "Users can insert their own profile" - WITH CHECK (auth.uid() = id)


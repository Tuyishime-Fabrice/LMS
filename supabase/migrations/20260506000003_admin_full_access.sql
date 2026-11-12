-- =====================================================
-- Grant admins full read access on courses, enrollments,
-- assignments, quizzes, capstone projects, and submissions
-- (same scope teachers have on their own courses, but for ALL courses)
--
-- Uses get_user_role() SECURITY DEFINER to avoid recursion.
-- =====================================================

-- Make sure the helper exists
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = user_id;
$$;

-- Helper: drop policy if exists and recreate
-- (we use named policies so re-running is safe)

-- ========== courses ==========
DROP POLICY IF EXISTS "Admins can view all courses" ON public.courses;
CREATE POLICY "Admins can view all courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can update all courses" ON public.courses;
CREATE POLICY "Admins can update all courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can delete all courses" ON public.courses;
CREATE POLICY "Admins can delete all courses"
  ON public.courses FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ========== course_enrollments ==========
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.course_enrollments;
CREATE POLICY "Admins can view all enrollments"
  ON public.course_enrollments FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ========== course_materials ==========
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='course_materials') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all course materials" ON public.course_materials';
    EXECUTE 'CREATE POLICY "Admins can view all course materials"
      ON public.course_materials FOR SELECT
      TO authenticated
      USING (public.get_user_role(auth.uid()) = ''admin'')';
  END IF;
END $$;

-- ========== course_chapters ==========
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='course_chapters') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all chapters" ON public.course_chapters';
    EXECUTE 'CREATE POLICY "Admins can view all chapters"
      ON public.course_chapters FOR SELECT
      TO authenticated
      USING (public.get_user_role(auth.uid()) = ''admin'')';
  END IF;
END $$;

-- ========== course_lessons ==========
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='course_lessons') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all lessons" ON public.course_lessons';
    EXECUTE 'CREATE POLICY "Admins can view all lessons"
      ON public.course_lessons FOR SELECT
      TO authenticated
      USING (public.get_user_role(auth.uid()) = ''admin'')';
  END IF;
END $$;

-- ========== assignments ==========
DROP POLICY IF EXISTS "Admins can view all assignments" ON public.assignments;
CREATE POLICY "Admins can view all assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ========== assignment_submissions (student work + grades) ==========
DROP POLICY IF EXISTS "Admins can view all assignment submissions" ON public.assignment_submissions;
CREATE POLICY "Admins can view all assignment submissions"
  ON public.assignment_submissions FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ========== quizzes ==========
DROP POLICY IF EXISTS "Admins can view all quizzes" ON public.quizzes;
CREATE POLICY "Admins can view all quizzes"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ========== quiz_questions ==========
DROP POLICY IF EXISTS "Admins can view all quiz questions" ON public.quiz_questions;
CREATE POLICY "Admins can view all quiz questions"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ========== quiz_attempts (student scores) ==========
DROP POLICY IF EXISTS "Admins can view all quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Admins can view all quiz attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ========== lesson_quiz_questions ==========
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lesson_quiz_questions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all lesson quiz questions" ON public.lesson_quiz_questions';
    EXECUTE 'CREATE POLICY "Admins can view all lesson quiz questions"
      ON public.lesson_quiz_questions FOR SELECT
      TO authenticated
      USING (public.get_user_role(auth.uid()) = ''admin'')';
  END IF;
END $$;

-- ========== student_quiz_attempts ==========
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='student_quiz_attempts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all student quiz attempts" ON public.student_quiz_attempts';
    EXECUTE 'CREATE POLICY "Admins can view all student quiz attempts"
      ON public.student_quiz_attempts FOR SELECT
      TO authenticated
      USING (public.get_user_role(auth.uid()) = ''admin'')';
  END IF;
END $$;

-- ========== student_lesson_progress ==========
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='student_lesson_progress') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all student lesson progress" ON public.student_lesson_progress';
    EXECUTE 'CREATE POLICY "Admins can view all student lesson progress"
      ON public.student_lesson_progress FOR SELECT
      TO authenticated
      USING (public.get_user_role(auth.uid()) = ''admin'')';
  END IF;
END $$;

-- ========== capstone_projects ==========
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='capstone_projects') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all capstone projects" ON public.capstone_projects';
    EXECUTE 'CREATE POLICY "Admins can view all capstone projects"
      ON public.capstone_projects FOR SELECT
      TO authenticated
      USING (public.get_user_role(auth.uid()) = ''admin'')';
  END IF;
END $$;

-- ========== capstone_submissions (student submissions + grades) ==========
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='capstone_submissions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all capstone submissions" ON public.capstone_submissions';
    EXECUTE 'CREATE POLICY "Admins can view all capstone submissions"
      ON public.capstone_submissions FOR SELECT
      TO authenticated
      USING (public.get_user_role(auth.uid()) = ''admin'')';
  END IF;
END $$;

-- ========== certificates ==========
DROP POLICY IF EXISTS "Admins can view all certificates" ON public.certificates;
CREATE POLICY "Admins can view all certificates"
  ON public.certificates FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can insert certificates" ON public.certificates;
CREATE POLICY "Admins can insert certificates"
  ON public.certificates FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can update certificates" ON public.certificates;
CREATE POLICY "Admins can update certificates"
  ON public.certificates FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

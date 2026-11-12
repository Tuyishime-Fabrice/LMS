-- =====================================================================
-- Security hardening (redesign stage 0.5)
--
-- Additive and idempotent: no table, column or row is dropped.
-- Apply together with the matching frontend release, because quiz
-- marking moves from the browser to the database (section 5 below).
--
--  1. Privileged profile columns can no longer be changed by their owner
--  2. Enrolment inserts are limited to free courses, course staff, admins
--  3. Payment functions are callable by the service role only
--  4. Completion helper functions are no longer callable by end users
--  5. Lesson quizzes are served without answers and marked in the database
--  6. Students cannot write grade or feedback on their own submissions
--  7. Message recipients can mark a conversation as read
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: is the current request allowed to change privileged data?
-- True for admins, for the service role, and for direct database
-- sessions (SQL editor, migrations). False for ordinary API requests
-- and for the sign-up trigger running under the auth service.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_privileged_context()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN true;
  END IF;
  IF session_user NOT IN ('authenticator', 'supabase_auth_admin') THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- ---------------------------------------------------------------------
-- 1. Profiles: protect role, approval, suspension and pricing columns
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged_context() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A new account can be a student or a teacher, never an admin, and
    -- never pre-approved, suspended or on a special pricing tier.
    IF NEW.role IS NULL OR NEW.role::text NOT IN ('student', 'teacher') THEN
      NEW.role := 'student';
    END IF;
    NEW.teacher_approved := false;
    NEW.teacher_approved_by := NULL;
    NEW.teacher_approval_date := NULL;
    NEW.is_suspended := false;
    NEW.suspension_reason := NULL;
    NEW.pricing_tier := 'standard';
    RETURN NEW;
  END IF;

  -- UPDATE by the account owner.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Choosing student or teacher is allowed only until onboarding is done.
    IF coalesce(OLD.onboarding_completed, false)
       OR OLD.role::text = 'admin'
       OR NEW.role::text NOT IN ('student', 'teacher') THEN
      NEW.role := OLD.role;
    END IF;
  END IF;

  NEW.teacher_approved := OLD.teacher_approved;
  NEW.teacher_approved_by := OLD.teacher_approved_by;
  NEW.teacher_approval_date := OLD.teacher_approval_date;
  NEW.teacher_rejection_reason := OLD.teacher_rejection_reason;
  NEW.is_suspended := OLD.is_suspended;
  NEW.suspension_reason := OLD.suspension_reason;
  NEW.pricing_tier := OLD.pricing_tier;
  -- A teacher may move their own request back to "pending", nothing else.
  IF NEW.teacher_approval_status IS DISTINCT FROM OLD.teacher_approval_status
     AND coalesce(NEW.teacher_approval_status, 'pending') <> 'pending' THEN
    NEW.teacher_approval_status := OLD.teacher_approval_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- ---------------------------------------------------------------------
-- 2. Enrolments: who may create one
--    Paid enrolments keep coming from update_payment_status(), which
--    runs with definer rights and is not affected by these policies.
-- ---------------------------------------------------------------------
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'course_enrollments' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.course_enrollments', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Students can enrol in free courses"
  ON public.course_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.is_free IS NOT FALSE
    )
  );

CREATE POLICY "Course staff can enrol students"
  ON public.course_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Course staff can update enrolments" ON public.course_enrollments;
CREATE POLICY "Course staff can update enrolments"
  ON public.course_enrollments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ---------------------------------------------------------------------
-- 3 + 4. Server-only functions
-- ---------------------------------------------------------------------
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('update_payment_status', 'create_payment_record',
                        'mark_course_completed', 'get_course_completions')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 5. Lesson quizzes: answers stay in the database
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.lesson_quiz_questions;
DROP POLICY IF EXISTS "Students can create their own quiz attempts" ON public.student_quiz_attempts;

-- May this user open the lesson? Enrolled, free or preview content, the
-- course teacher, or an admin.
CREATE OR REPLACE FUNCTION public.can_access_lesson(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_lessons l
    JOIN public.course_chapters ch ON ch.id = l.chapter_id
    JOIN public.courses c ON c.id = ch.course_id
    WHERE l.id = p_lesson_id
      AND (
        c.is_free IS NOT FALSE
        OR coalesce(l.is_preview, false)
        OR coalesce(ch.is_preview, false)
        OR c.teacher_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.course_enrollments e
                   WHERE e.course_id = c.id AND e.student_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles p
                   WHERE p.id = auth.uid() AND p.role = 'admin')
      )
  );
$$;

-- Questions without correct answers or explanations.
CREATE OR REPLACE FUNCTION public.get_lesson_quiz(p_lesson_id uuid)
RETURNS TABLE (id uuid, question_text text, options jsonb, points integer, order_index integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_lesson(p_lesson_id) THEN
    RAISE EXCEPTION 'You do not have access to this quiz' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT q.id, q.question_text, q.options, coalesce(q.points, 1), q.order_index
    FROM public.lesson_quiz_questions q
    WHERE q.lesson_id = p_lesson_id
    ORDER BY q.order_index, q.created_at;
END;
$$;

-- Marks an attempt, stores it, and returns the result with the review
-- data (correct answer and explanation per question).
CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(p_lesson_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_score integer := 0;
  v_total integer := 0;
  v_passed boolean;
  v_review jsonb := '[]'::jsonb;
  v_attempt uuid;
  q record;
BEGIN
  IF v_user IS NULL OR NOT public.can_access_lesson(p_lesson_id) THEN
    RAISE EXCEPTION 'You do not have access to this quiz' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user AND role = 'student') THEN
    RAISE EXCEPTION 'Only students can submit a quiz' USING ERRCODE = '42501';
  END IF;
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'Answers must be an object of question id to option id';
  END IF;

  FOR q IN
    SELECT lq.id, lq.correct_answer, lq.explanation, coalesce(lq.points, 1) AS points
    FROM public.lesson_quiz_questions lq
    WHERE lq.lesson_id = p_lesson_id
    ORDER BY lq.order_index, lq.created_at
  LOOP
    v_total := v_total + q.points;
    IF p_answers->>(q.id::text) = q.correct_answer THEN
      v_score := v_score + q.points;
    END IF;
    v_review := v_review || jsonb_build_object(
      'question_id', q.id,
      'selected', p_answers->>(q.id::text),
      'correct_answer', q.correct_answer,
      'is_correct', (p_answers->>(q.id::text) = q.correct_answer),
      'explanation', q.explanation
    );
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'This quiz has no questions yet';
  END IF;

  v_passed := v_score >= ceil(v_total * 0.6);

  INSERT INTO public.student_quiz_attempts
    (student_id, lesson_id, answers, score, total_points, passed)
  VALUES (v_user, p_lesson_id, p_answers, v_score, v_total, v_passed)
  RETURNING id INTO v_attempt;

  IF v_passed THEN
    INSERT INTO public.student_lesson_progress (student_id, lesson_id, is_completed, completed_at)
    VALUES (v_user, p_lesson_id, true, now())
    ON CONFLICT (student_id, lesson_id)
    DO UPDATE SET is_completed = true,
                  completed_at = coalesce(public.student_lesson_progress.completed_at, now());
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt, 'score', v_score, 'total_points', v_total,
    'passed', v_passed, 'review', v_review
  );
END;
$$;

-- Review data for the learner's latest attempt (only after they have one).
CREATE OR REPLACE FUNCTION public.get_lesson_quiz_review(p_lesson_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  v_review jsonb;
BEGIN
  SELECT * INTO a FROM public.student_quiz_attempts
  WHERE student_id = auth.uid() AND lesson_id = p_lesson_id
  ORDER BY submitted_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'question_id', q.id,
           'selected', a.answers->>(q.id::text),
           'correct_answer', q.correct_answer,
           'is_correct', (a.answers->>(q.id::text) = q.correct_answer),
           'explanation', q.explanation) ORDER BY q.order_index, q.created_at), '[]'::jsonb)
    INTO v_review
  FROM public.lesson_quiz_questions q WHERE q.lesson_id = p_lesson_id;
  RETURN jsonb_build_object(
    'attempt_id', a.id, 'score', a.score, 'total_points', a.total_points,
    'passed', a.passed, 'submitted_at', a.submitted_at, 'review', v_review
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_quiz(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_lesson_quiz(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_lesson_quiz_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_quiz(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lesson_quiz_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 6. Submissions: grade fields belong to the course staff
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_submission_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_staff boolean;
BEGIN
  IF public.is_privileged_context() THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'capstone_submissions' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.capstone_projects cp
      JOIN public.courses c ON c.id = cp.course_id
      WHERE cp.id = NEW.capstone_project_id AND c.teacher_id = auth.uid()
    ) INTO v_is_staff;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.course_lessons l
      JOIN public.course_chapters ch ON ch.id = l.chapter_id
      JOIN public.courses c ON c.id = ch.course_id
      WHERE l.id = NEW.lesson_id AND c.teacher_id = auth.uid()
    ) INTO v_is_staff;
  END IF;

  IF v_is_staff THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.grade := NULL;
    NEW.feedback := NULL;
    NEW.graded_at := NULL;
  ELSE
    NEW.grade := OLD.grade;
    NEW.feedback := OLD.feedback;
    NEW.graded_at := OLD.graded_at;
  END IF;
  IF TG_TABLE_NAME = 'capstone_submissions' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.graded_by := NULL;
    ELSE
      NEW.graded_by := OLD.graded_by;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_submission_grade ON public.assignment_submissions;
CREATE TRIGGER protect_submission_grade
  BEFORE INSERT OR UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_submission_grade();

DROP TRIGGER IF EXISTS protect_submission_grade ON public.capstone_submissions;
CREATE TRIGGER protect_submission_grade
  BEFORE INSERT OR UPDATE ON public.capstone_submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_submission_grade();

-- ---------------------------------------------------------------------
-- 7. Direct messages: the recipient marks a conversation as read
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND (student_id = auth.uid() OR teacher_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Conversation not found' USING ERRCODE = '42501';
  END IF;
  UPDATE public.direct_messages
  SET is_read = true
  WHERE conversation_id = p_conversation_id
    AND sender_id <> auth.uid()
    AND coalesce(is_read, false) = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

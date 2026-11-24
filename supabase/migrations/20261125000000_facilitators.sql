-- =====================================================================
-- Facilitators (2026-11-25)
--
-- Additive and idempotent. Review, back up, then apply by hand after
-- 20261124000000_academy_experience.sql. Never replay on production
-- without a backup.
--
-- A facilitator is any non-admin account assigned to a course (all its
-- cohorts) or to one cohort by the course's instructor or an admin. The
-- account keeps its own role; the assignment alone grants:
--   * read: assigned learners' enrolments, submissions and their files,
--     a roster with names (no emails), the course's lessons
--   * write: a provisional review per submission (suggested mark, rubric
--     scores, draft notes) visible to course staff only, never to learners
--   * write: the Discord link of an assigned cohort (narrow function)
--   * write: course announcements, for course-wide facilitators only
-- Facilitators never publish a mark: protect_submission_grade already
-- limits grade, feedback and rubric_scores to the course's instructor and
-- admins, and the submission UPDATE policies are unchanged.
--
-- Also fixes a pre-existing gap: any signed-in user could create a
-- teacher_announcement for any course.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Assignments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_role text NOT NULL DEFAULT 'facilitator' CHECK (staff_role IN ('facilitator')),
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS course_staff_unique_scope
  ON public.course_staff (course_id, coalesce(cohort_id, '00000000-0000-0000-0000-000000000000'::uuid), user_id);
CREATE INDEX IF NOT EXISTS course_staff_user_idx ON public.course_staff (user_id);

-- A cohort assignment must belong to the course; the instructor and admins
-- are not assigned to their own course; assigned_by is always the caller.
CREATE OR REPLACE FUNCTION public.validate_course_staff()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.cohort_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cohorts WHERE id = NEW.cohort_id AND course_id = NEW.course_id
  ) THEN
    RAISE EXCEPTION 'This cohort does not belong to the course' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.courses WHERE id = NEW.course_id AND teacher_id = NEW.user_id) THEN
    RAISE EXCEPTION 'The course instructor cannot also be its facilitator' USING ERRCODE = '23514';
  END IF;
  IF public.is_admin(NEW.user_id) THEN
    RAISE EXCEPTION 'Administrators already have full access' USING ERRCODE = '23514';
  END IF;
  IF auth.uid() IS NOT NULL THEN
    NEW.assigned_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_course_staff ON public.course_staff;
CREATE TRIGGER validate_course_staff
  BEFORE INSERT OR UPDATE ON public.course_staff
  FOR EACH ROW EXECUTE FUNCTION public.validate_course_staff();

ALTER TABLE public.course_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff see their own assignments" ON public.course_staff;
CREATE POLICY "Staff see their own assignments" ON public.course_staff
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
  );
DROP POLICY IF EXISTS "Instructors and admins assign facilitators" ON public.course_staff;
CREATE POLICY "Instructors and admins assign facilitators" ON public.course_staff
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
  );
DROP POLICY IF EXISTS "Instructors and admins remove facilitators" ON public.course_staff;
CREATE POLICY "Instructors and admins remove facilitators" ON public.course_staff
  FOR DELETE TO authenticated USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
  );
REVOKE ALL ON public.course_staff FROM anon;
REVOKE UPDATE ON public.course_staff FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.course_staff TO authenticated;

-- ---------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------
-- Assigned to the course in any scope.
CREATE OR REPLACE FUNCTION public.is_course_facilitator(p_course_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.course_staff s WHERE s.course_id = p_course_id AND s.user_id = p_user_id
  );
$$;

-- Assigned to the whole course (every cohort).
CREATE OR REPLACE FUNCTION public.is_course_wide_facilitator(p_course_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.course_staff s WHERE s.course_id = p_course_id AND s.user_id = p_user_id AND s.cohort_id IS NULL
  );
$$;

-- Does p_user_id facilitate this learner in this course? Cohort membership is
-- read from cohort_id, or from cohort_name where only the name was recorded.
CREATE OR REPLACE FUNCTION public.facilitates_learner(p_course_id uuid, p_student_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.course_staff s
    WHERE s.course_id = p_course_id AND s.user_id = p_user_id
      AND (
        s.cohort_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.course_enrollments e
          JOIN public.cohorts co ON co.id = s.cohort_id
          WHERE e.course_id = p_course_id AND e.student_id = p_student_id
            AND (e.cohort_id = s.cohort_id OR (e.cohort_id IS NULL AND e.cohort_name = co.name))
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.course_of_lesson(p_lesson_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ch.course_id FROM public.course_lessons l JOIN public.course_chapters ch ON ch.id = l.chapter_id WHERE l.id = p_lesson_id;
$$;

CREATE OR REPLACE FUNCTION public.course_of_capstone(p_capstone_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT course_id FROM public.capstone_projects WHERE id = p_capstone_id;
$$;

GRANT EXECUTE ON FUNCTION public.is_course_facilitator(uuid, uuid), public.is_course_wide_facilitator(uuid, uuid),
  public.facilitates_learner(uuid, uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 3. Read access for assigned facilitators (additive SELECT policies)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Facilitators view assigned enrolments" ON public.course_enrollments;
CREATE POLICY "Facilitators view assigned enrolments" ON public.course_enrollments
  FOR SELECT TO authenticated USING (public.facilitates_learner(course_id, student_id));

DROP POLICY IF EXISTS "Facilitators view assigned assignment submissions" ON public.assignment_submissions;
CREATE POLICY "Facilitators view assigned assignment submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated USING (public.facilitates_learner(public.course_of_lesson(lesson_id), student_id));

DROP POLICY IF EXISTS "Facilitators view assigned capstone submissions" ON public.capstone_submissions;
CREATE POLICY "Facilitators view assigned capstone submissions" ON public.capstone_submissions
  FOR SELECT TO authenticated USING (public.facilitates_learner(public.course_of_capstone(capstone_project_id), student_id));

DROP POLICY IF EXISTS "Facilitators view their cohorts" ON public.cohorts;
CREATE POLICY "Facilitators view their cohorts" ON public.cohorts
  FOR SELECT TO authenticated USING (public.is_course_facilitator(course_id));

-- Submission files: capstone-submissions/<capstone or lesson id>/<student id>/<file>
CREATE OR REPLACE FUNCTION public.facilitator_can_read_file(p_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dirs text[] := storage.foldername(p_name);
  v_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_course uuid;
BEGIN
  IF auth.uid() IS NULL OR v_dirs[1] IS DISTINCT FROM 'capstone-submissions'
     OR coalesce(v_dirs[2], '') !~ v_uuid OR coalesce(v_dirs[3], '') !~ v_uuid THEN
    RETURN false;
  END IF;
  v_course := coalesce(public.course_of_capstone(v_dirs[2]::uuid), public.course_of_lesson(v_dirs[2]::uuid));
  RETURN v_course IS NOT NULL AND public.facilitates_learner(v_course, v_dirs[3]::uuid);
END;
$$;
DROP POLICY IF EXISTS "Facilitators read assigned learners' submission files" ON storage.objects;
CREATE POLICY "Facilitators read assigned learners' submission files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'lesson-files' AND public.facilitator_can_read_file(name));

-- Lessons: facilitators can open every lesson of their course.
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
        OR public.is_course_facilitator(c.id)
      )
  );
$$;

-- Roster with names (no emails or phone numbers): only learners the caller facilitates.
CREATE OR REPLACE FUNCTION public.get_facilitated_learners()
RETURNS TABLE (
  course_id uuid, student_id uuid, full_name text, avatar_url text, cohort_name text,
  progress_percentage numeric, completed boolean, last_activity_at timestamptz, enrolled_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.course_id, e.student_id, p.full_name, p.avatar_url, e.cohort_name,
         e.progress_percentage::numeric, coalesce(e.completed, false), e.last_activity_at, e.enrolled_at
  FROM public.course_enrollments e
  JOIN public.profiles p ON p.id = e.student_id
  WHERE public.facilitates_learner(e.course_id, e.student_id)
  ORDER BY p.full_name;
$$;
REVOKE ALL ON FUNCTION public.get_facilitated_learners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_facilitated_learners() TO authenticated;

-- ---------------------------------------------------------------------
-- 4. Provisional reviews (staff only; learners never see them)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submission_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_type text NOT NULL CHECK (submission_type IN ('assignment', 'capstone')),
  submission_id uuid NOT NULL,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  suggested_grade numeric CHECK (suggested_grade IS NULL OR suggested_grade BETWEEN 0 AND 100),
  rubric_scores jsonb,
  notes text CHECK (notes IS NULL OR length(notes) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_type, submission_id, reviewer_id)
);

-- Course and learner of a submission, for the policies below.
CREATE OR REPLACE FUNCTION public.submission_owner(p_type text, p_submission_id uuid)
RETURNS TABLE (course_id uuid, student_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.course_of_lesson(s.lesson_id), s.student_id FROM public.assignment_submissions s
  WHERE p_type = 'assignment' AND s.id = p_submission_id
  UNION ALL
  SELECT public.course_of_capstone(s.capstone_project_id), s.student_id FROM public.capstone_submissions s
  WHERE p_type = 'capstone' AND s.id = p_submission_id;
$$;

CREATE OR REPLACE FUNCTION public.can_review_submission(p_type text, p_submission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.submission_owner(p_type, p_submission_id) o
                 WHERE public.facilitates_learner(o.course_id, o.student_id));
$$;

CREATE OR REPLACE FUNCTION public.is_submission_instructor(p_type text, p_submission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.submission_owner(p_type, p_submission_id) o
    JOIN public.courses c ON c.id = o.course_id WHERE c.teacher_id = auth.uid()
  );
$$;

ALTER TABLE public.submission_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviewers manage their own provisional reviews" ON public.submission_reviews;
CREATE POLICY "Reviewers manage their own provisional reviews" ON public.submission_reviews
  FOR ALL TO authenticated
  USING (reviewer_id = auth.uid() AND public.can_review_submission(submission_type, submission_id))
  WITH CHECK (reviewer_id = auth.uid() AND public.can_review_submission(submission_type, submission_id));
DROP POLICY IF EXISTS "Instructors read provisional reviews" ON public.submission_reviews;
CREATE POLICY "Instructors read provisional reviews" ON public.submission_reviews
  FOR SELECT TO authenticated USING (public.is_submission_instructor(submission_type, submission_id));
REVOKE ALL ON public.submission_reviews FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_reviews TO authenticated;

CREATE OR REPLACE FUNCTION public.stamp_submission_review()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stamp_submission_review ON public.submission_reviews;
CREATE TRIGGER stamp_submission_review
  BEFORE UPDATE ON public.submission_reviews
  FOR EACH ROW EXECUTE FUNCTION public.stamp_submission_review();

-- ---------------------------------------------------------------------
-- 5. Narrow write paths
-- ---------------------------------------------------------------------
-- Discord link of a cohort: its teacher, an admin, or a facilitator of that cohort
-- (or of the whole course). No other cohort column can be changed this way.
CREATE OR REPLACE FUNCTION public.set_cohort_discord_url(p_cohort_id uuid, p_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cohort public.cohorts%ROWTYPE;
BEGIN
  SELECT * INTO v_cohort FROM public.cohorts WHERE id = p_cohort_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cohort not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (
    v_cohort.teacher_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_staff s WHERE s.user_id = auth.uid() AND s.course_id = v_cohort.course_id
               AND (s.cohort_id IS NULL OR s.cohort_id = p_cohort_id))
  ) THEN
    RAISE EXCEPTION 'You cannot change this cohort' USING ERRCODE = '42501';
  END IF;
  UPDATE public.cohorts SET discord_url = nullif(btrim(p_url), ''), updated_at = now() WHERE id = p_cohort_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_cohort_discord_url(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_cohort_discord_url(uuid, text) TO authenticated;

-- Announcements: the author must be the course's instructor, an admin, or a
-- course-wide facilitator. (Previously any signed-in user could post to any
-- course.) A null course stays allowed: it reaches only learners of courses
-- the author teaches, per the existing read policy.
DROP POLICY IF EXISTS "Teachers can create announcements" ON public.teacher_announcements;
CREATE POLICY "Teachers can create announcements" ON public.teacher_announcements
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = teacher_id AND (
      course_id IS NULL
      OR public.is_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
      OR public.is_course_wide_facilitator(course_id)
    )
  );

-- Look up one account by exact email to assign it. Instructors (of at least
-- one course) and admins only; returns nothing for unknown emails or admins.
CREATE OR REPLACE FUNCTION public.find_staffing_candidate(p_email text)
RETURNS TABLE (id uuid, full_name text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.courses WHERE teacher_id = auth.uid())) THEN
    RAISE EXCEPTION 'Only instructors and administrators can assign facilitators' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.full_name, p.role::text FROM public.profiles p
    WHERE lower(p.email) = lower(btrim(p_email)) AND p.role::text <> 'admin' AND coalesce(p.is_suspended, false) = false
    LIMIT 1;
END;
$$;
REVOKE ALL ON FUNCTION public.find_staffing_candidate(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_staffing_candidate(text) TO authenticated;

-- Facilitators of a course with names and emails, for its instructor and admins.
CREATE OR REPLACE FUNCTION public.get_course_staff(p_course_id uuid)
RETURNS TABLE (id uuid, user_id uuid, cohort_id uuid, full_name text, email text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = p_course_id AND c.teacher_id = auth.uid())) THEN
    RAISE EXCEPTION 'Only the course instructor and administrators can list its facilitators' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT s.id, s.user_id, s.cohort_id, p.full_name, p.email, s.created_at
    FROM public.course_staff s JOIN public.profiles p ON p.id = s.user_id
    WHERE s.course_id = p_course_id ORDER BY p.full_name;
END;
$$;
REVOKE ALL ON FUNCTION public.get_course_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_course_staff(uuid) TO authenticated;
